/**
 * НАИВНОТО СГЪВАНЕ · оракулът на колонното Огледало · САМО за тестовете.
 *
 * Същите правила, написани по най-простия начин — карти и обекти, без нито
 * един типизиран масив. Тестът сгъва един и същ поток по двата пътя и сравнява
 * ред по ред, клетка по клетка. Разминаване значи грешка в колонния склад,
 * не в правилата: правилата тук са на пет реда и се четат на един дъх.
 *
 * НАРОЧНО не дели код с `ogledalo.ts` освен проверката на товара и
 * номенклатурата: оракул, който вика проверявания код, не проверява нищо.
 */

import type { Kletka } from '../model/kletka.js';
import type { Model } from '../model/model.js';
import {
  otBazovite,
  poNomer,
  sStoynost,
  spri,
  type ZhivaNomenklatura,
} from '../model/nomenklatura.js';
import { proveriTovar, TIP } from '../sabitiya/registar.js';
import type {
  PayloadRedIzklyuchen,
  PayloadRedZapisan,
  PayloadStopaninZapisan,
  PayloadStorno,
  PayloadStoynostSpryana,
  PayloadStoynostZapisana,
} from '../sabitiya/tovari.js';
import type { Sabitie } from '../yadro/sabitie.js';

export interface NaivenRed {
  readonly id: string;
  veriga: string;
  seq: number;
  izklyuchen: boolean;
  readonly kletki: Record<string, Kletka>;
}

export interface NaivnoOgledalo {
  readonly stopanin: string;
  /** таблица → id → ред · в реда на създаване (Map пази реда на вмъкване) */
  readonly tablitsi: ReadonlyMap<string, ReadonlyMap<string, NaivenRed>>;
  readonly nomenklaturi: ReadonlyMap<string, ZhivaNomenklatura>;
  readonly prilozheni: number;
  readonly pogaseni: number;
  readonly storna: number;
  readonly neprocheteni: number;
}

export function naivnoSgavane(sabitiya: readonly Sabitie[], model: Model): NaivnoOgledalo {
  const zveno = (naematel: string, seq: number): string => `${naematel}#${seq}`;
  const validno = (s: Sabitie): boolean => proveriTovar(s.type, s.payload, model).length === 0;

  const pogaseni = new Set<string>();
  let storna = 0;
  for (const s of sabitiya) {
    if (s.type !== TIP.storno || !validno(s)) continue;
    storna += 1;
    const p = s.payload as unknown as PayloadStorno;
    pogaseni.add(zveno(p.pogasyavaVeriga ?? s.naematel, p.pogasyavaSeq));
    pogaseni.add(zveno(s.naematel, s.seq));
  }
  const martvi = new Set<string>();
  const videni = new Set<string>();
  for (const s of sabitiya) {
    if (s.type !== TIP.redZapisan || !validno(s)) continue;
    const p = s.payload as unknown as PayloadRedZapisan;
    const k = `${p.tablitsa}#${p.id}`;
    if (videni.has(k)) continue;
    videni.add(k);
    if (pogaseni.has(zveno(s.naematel, s.seq))) martvi.add(k);
  }

  let stopanin = '';
  const tablitsi = new Map<string, Map<string, NaivenRed>>();
  for (const t of model.tablitsi.keys()) tablitsi.set(t, new Map());
  const nomenklaturi = new Map<string, ZhivaNomenklatura>();
  for (const n of model.nomenklaturi.values()) nomenklaturi.set(n.klyuch, otBazovite(n));
  let prilozheni = 0;
  let broyPogaseni = 0;
  let neprocheteni = 0;

  for (const s of sabitiya) {
    if (!validno(s)) {
      neprocheteni += 1;
      continue;
    }
    if (s.type === TIP.storno) continue;
    if (pogaseni.has(zveno(s.naematel, s.seq))) {
      broyPogaseni += 1;
      continue;
    }
    if (s.type === TIP.redZapisan || s.type === TIP.redIzklyuchen) {
      const p = s.payload as unknown as PayloadRedZapisan;
      if (martvi.has(`${p.tablitsa}#${p.id}`)) {
        broyPogaseni += 1;
        continue;
      }
      if (s.type === TIP.redIzklyuchen && !tablitsi.get(p.tablitsa)!.has(p.id)) {
        neprocheteni += 1;
        continue;
      }
    }
    prilozheni += 1;
    switch (s.type) {
      case TIP.stopaninZapisan: {
        if (stopanin === '') stopanin = (s.payload as unknown as PayloadStopaninZapisan).imeyl;
        break;
      }
      case TIP.stoynostZapisana: {
        const p = s.payload as unknown as PayloadStoynostZapisana;
        const n = nomenklaturi.get(p.nomenklatura)!;
        const stara = poNomer(n, p.nomer, p.belezi);
        nomenklaturi.set(
          p.nomenklatura,
          sStoynost(
            n,
            stara === undefined
              ? { nomer: p.nomer, tekst: p.tekst, bazova: false, spryana: false, belezi: p.belezi }
              : { ...stara, tekst: p.tekst, belezi: p.belezi },
          ),
        );
        break;
      }
      case TIP.stoynostSpryana: {
        const p = s.payload as unknown as PayloadStoynostSpryana;
        const n = nomenklaturi.get(p.nomenklatura)!;
        if (poNomer(n, p.nomer, p.belezi) !== undefined) {
          nomenklaturi.set(p.nomenklatura, sStoynost(n, spri(n, p.nomer, p.spryana, p.belezi)));
        }
        break;
      }
      case TIP.redZapisan: {
        const p = s.payload as unknown as PayloadRedZapisan;
        const t = tablitsi.get(p.tablitsa)!;
        let red = t.get(p.id);
        if (red === undefined) {
          red = { id: p.id, veriga: s.naematel, seq: s.seq, izklyuchen: false, kletki: {} };
          t.set(p.id, red);
        }
        red.veriga = s.naematel;
        red.seq = s.seq;
        for (const [k, v] of Object.entries(p.kletki)) {
          if (v === null) delete red.kletki[k];
          else red.kletki[k] = v;
        }
        break;
      }
      case TIP.redIzklyuchen: {
        const p = s.payload as unknown as PayloadRedIzklyuchen;
        const red = tablitsi.get(p.tablitsa)!.get(p.id)!;
        red.veriga = s.naematel;
        red.seq = s.seq;
        red.izklyuchen = p.izklyuchen;
        break;
      }
      default:
        break;
    }
  }

  return {
    stopanin,
    tablitsi,
    nomenklaturi,
    prilozheni,
    pogaseni: broyPogaseni,
    storna,
    neprocheteni,
  };
}
