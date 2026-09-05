/**
 * ОГЛЕДАЛОТО · живата проекция на Журнала, колонна (ADR-003).
 *
 * `fold(събития) → Огледало`, чисто и детерминистично: същият поток дава
 * байт за байт същото Огледало, откъдето и да е дошъл (`sgani` подрежда
 * веригите по такт). Нищо тук не пише в Журнала.
 *
 * ═══ ДВА ПРОХОДА · СТОРНОТО Е МАСКА ═══
 *
 * Първият проход проверява товара на ВСЯКО събитие (една проверка, два входа —
 * `sabitiya/registar.ts`), събира кои звена са погасени (валидно сторно) и кое
 * е ПЪРВОТО валидно събитие на всеки ред — сторнирано ли е то, целият ред е
 * мъртъв (образецът на старото `fold`). Вторият проход прилага останалото.
 * Живо Сторно значи пълно пресгъване от Дневника: колонният склад няма
 * история по клетка и не се „връща назад".
 *
 * ═══ СВЕРКАТА (правило 7) ═══
 *
 * приложени + погасени + сторна + непрочетени = събития. Непрочетено е
 * събитие, което не минава проверката на товара, е с непознат тип, или
 * сочи ред, който го няма — брои се и се показва, не се гълта: Журналът може
 * да е пипан отвън. Невалидно сторно е непрочетено, не маска.
 */

import type { Model } from '../model/model.js';
import type { ZhivaNomenklatura } from '../model/nomenklatura.js';
import { proveriTovar, TIP } from '../sabitiya/registar.js';
import type {
  Kursor,
  PayloadKnigaIznesena,
  PayloadKnigaVnesena,
  PayloadRedIzklyuchen,
  PayloadRedZapisan,
  PayloadStorno,
} from '../sabitiya/tovari.js';
import {
  klyuchNaSashtnost,
  klyuchNaZveno,
  type Sabitie,
  type Sashtnost,
} from '../yadro/sabitie.js';
import { sverka, type Sverka } from '../yadro/sverka.js';
import { CHETTSI } from './chettsi.js';
import { StroezhNaOgledaloto } from './stroezh.js';
import type { TablitsaVOgledaloto } from './tablitsa.js';

export interface PogasenZapis {
  readonly veriga: string;
  readonly seq: number;
  readonly type: string;
  readonly sashtnost: Sashtnost;
  readonly prichina: string;
  /** кое сторно го гаси · веригата и seq-ът му */
  readonly storniranOt: string;
}

export interface Neprocheteno {
  readonly veriga: string;
  readonly seq: number;
  readonly type: string;
  readonly zashto: readonly string[];
}

export interface Ogledalo {
  readonly model: Model;
  /** имейлът на стопанина · празно, докато Книгата не е открита */
  readonly stopanin: string;
  readonly tablitsi: ReadonlyMap<string, TablitsaVOgledaloto>;
  readonly nomenklaturi: ReadonlyMap<string, ZhivaNomenklatura>;
  readonly knigi: readonly PayloadKnigaIznesena[];
  /** разписките за внесени Книги · кога, колко предложено, колко прието */
  readonly vnasyaniya: readonly PayloadKnigaVnesena[];
  readonly pogaseni: readonly PogasenZapis[];
  readonly neprocheteni: readonly Neprocheteno[];
  /** върхът на всяка верига, както е минал през сгъването */
  readonly kursori: ReadonlyMap<string, Kursor>;
  /** rev на всяка същност по верига · същото, което Дневникът дава на Вратата · за expectedRev */
  readonly revove: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly broySabitiya: number;
  readonly prilozheni: number;
  readonly storna: number;
  readonly sverka: Sverka;
}

const klyuchNaRed = (p: { readonly tablitsa: string; readonly id: string }): string =>
  `${p.tablitsa}#${p.id}`;

const NYAMA_RED = 'Редът не съществува — изключването няма какво да изключи.';

export function fold(sabitiya: readonly Sabitie[], model: Model, kogato: string): Ogledalo {
  // ═══ ПЪРВИ ПРОХОД · проверката и маската ═══
  const proverki = new Map<string, readonly string[]>();
  const pogaseniZvena = new Set<string>();
  const gasiGo = new Map<string, Sabitie>();
  const parvotoNaReda = new Map<string, string>();
  let storna = 0;

  for (const s of sabitiya) {
    const zveno = klyuchNaZveno(s);
    const zashto = proveriTovar(s.type, s.payload, model);
    proverki.set(zveno, zashto);
    if (zashto.length > 0) continue;
    if (s.type === TIP.storno) {
      storna += 1;
      const p = s.payload as unknown as PayloadStorno;
      const tsel = klyuchNaZveno({
        naematel: p.pogasyavaVeriga ?? s.naematel,
        seq: p.pogasyavaSeq,
      });
      pogaseniZvena.add(tsel);
      pogaseniZvena.add(zveno);
      // ПЪРВОТО сторно печели: причината, с която редът е свален, не се презаписва.
      if (!gasiGo.has(tsel)) gasiGo.set(tsel, s);
      continue;
    }
    if (s.type === TIP.redZapisan) {
      const k = klyuchNaRed(s.payload as unknown as PayloadRedZapisan);
      if (!parvotoNaReda.has(k)) parvotoNaReda.set(k, zveno);
    }
  }

  const martviRedove = new Map<string, string>();
  for (const [red, zveno] of parvotoNaReda) {
    if (pogaseniZvena.has(zveno)) martviRedove.set(red, zveno);
  }

  // ═══ ВТОРИ ПРОХОД · прилагането ═══
  const st = new StroezhNaOgledaloto(model);
  const pogaseni: PogasenZapis[] = [];
  const neprocheteni: Neprocheteno[] = [];
  const kursori = new Map<string, Kursor>();
  const revove = new Map<string, Map<string, number>>();
  let prilozheni = 0;

  const prichinaNa = (zveno: string): { prichina: string; storniranOt: string } => {
    const g = gasiGo.get(zveno);
    return g === undefined
      ? { prichina: '', storniranOt: '' }
      : {
          prichina: String((g.payload as unknown as PayloadStorno).prichina ?? ''),
          storniranOt: klyuchNaZveno(g),
        };
  };
  const pogasi = (s: Sabitie, prichina: string, storniranOt: string): void => {
    pogaseni.push(
      Object.freeze({
        veriga: s.naematel,
        seq: s.seq,
        type: s.type,
        sashtnost: s.sashtnost,
        prichina,
        storniranOt,
      }),
    );
  };
  const neprocheti = (s: Sabitie, zashto: readonly string[]): void => {
    neprocheteni.push(Object.freeze({ veriga: s.naematel, seq: s.seq, type: s.type, zashto }));
  };

  for (const s of sabitiya) {
    kursori.set(s.naematel, { naematel: s.naematel, seq: s.seq, hash: s.hash });
    let rev = revove.get(s.naematel);
    if (rev === undefined) {
      rev = new Map();
      revove.set(s.naematel, rev);
    }
    rev.set(klyuchNaSashtnost(s.sashtnost), s.seq);

    const zveno = klyuchNaZveno(s);
    const zashto = proverki.get(zveno) ?? [];
    if (zashto.length > 0) {
      neprocheti(s, zashto);
      continue;
    }
    if (s.type === TIP.storno) continue;
    if (pogaseniZvena.has(zveno)) {
      const { prichina, storniranOt } = prichinaNa(zveno);
      pogasi(s, prichina, storniranOt);
      continue;
    }
    if (s.type === TIP.redZapisan || s.type === TIP.redIzklyuchen) {
      const p = s.payload as unknown as PayloadRedZapisan | PayloadRedIzklyuchen;
      const martvo = martviRedove.get(klyuchNaRed(p));
      if (martvo !== undefined) {
        pogasi(s, `създаването на реда е сторнирано (${martvo})`, prichinaNa(martvo).storniranOt);
        continue;
      }
      // изключване на ред, който не е раждан · не ражда ред, брои се като непрочетено
      if (s.type === TIP.redIzklyuchen && !st.tablitsa(p.tablitsa).ima(p.id)) {
        neprocheti(s, [NYAMA_RED]);
        continue;
      }
    }
    // проверката вече каза, че типът е познат
    CHETTSI[s.type as keyof typeof CHETTSI](s, st);
    prilozheni += 1;
  }

  const tablitsi = new Map<string, TablitsaVOgledaloto>();
  for (const [klyuch, t] of st.tablitsi) tablitsi.set(klyuch, t.zavarshi());

  return Object.freeze({
    model,
    stopanin: st.stopanin,
    tablitsi,
    nomenklaturi: new Map(st.nomenklaturi),
    knigi: Object.freeze([...st.knigi]),
    vnasyaniya: Object.freeze([...st.vnasyaniya]),
    pogaseni: Object.freeze(pogaseni),
    neprocheteni: Object.freeze(neprocheteni),
    kursori,
    revove,
    broySabitiya: sabitiya.length,
    prilozheni,
    storna,
    sverka: sverka(
      'сгъване на Огледалото',
      sabitiya.length,
      prilozheni + pogaseni.length + storna + neprocheteni.length,
      kogato,
      'приложени + погасени + сторна + непрочетени',
    ),
  });
}

/** Таблицата в Огледалото по ключ · липсата ѝ е грешка в кода. */
export function tablitsaVOgledaloto(o: Ogledalo, klyuch: string): TablitsaVOgledaloto {
  const t = o.tablitsi.get(klyuch);
  if (t === undefined) throw new Error(`Огледалото няма таблица „${klyuch}".`);
  return t;
}
