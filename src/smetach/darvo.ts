/**
 * ДЪРВОТО на Управление · Имот → Обект/Бизнес → Задача (ADR-005).
 *
 * Неговият лист УправлениеДелаПреписки (A20–E36): под всеки Имот стоят Обектите
 * и Бизнесите му по номерация, а задачите (E: „Дело / Сондаж") — под реда, към
 * който са. Тук дървото се СМЯТА от Огледалото, в един ред, за екрана и за
 * Книгата: родителите са редовете на трите таблици на Имоти (групови редове),
 * задачите — редовете на `zadachi` с връзка `kam` към родителя.
 *
 * Сверката (правило 7): редове в дървото = родители + задачи с жив родител; задача
 * без жив родител се брои отделно (сирак) и се казва, не се крие.
 */

import { tablitsata } from '../model/model.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { kletkaNa, zhiviteRedove } from '../ogledalo/tablitsa.js';
import { type Nomer, nomerNaRed, podrediPoNomer, sravniNomer } from './nomeratsiya.js';

export interface RoditelVDarvoto {
  readonly vid: 'roditel';
  readonly tablitsa: string;
  readonly i: number;
  readonly id: string;
  /** 0 = Имот · 1 = Обект или Бизнес под него */
  readonly nivo: 0 | 1;
  readonly nomer: Nomer;
}

export interface ZadachaVDarvoto {
  readonly vid: 'zadacha';
  readonly i: number;
  readonly id: string;
  readonly roditelId: string;
  readonly roditelTablitsa: string;
}

export type RedNaDarvoto = RoditelVDarvoto | ZadachaVDarvoto;

export interface Darvo {
  readonly redove: readonly RedNaDarvoto[];
  /** задачи, чийто родител не е жив · не са в дървото, казват се */
  readonly siratsi: readonly number[];
  readonly broyRoditeli: number;
  readonly broyZadachi: number;
}

const TABLITSA_NA_ZADACHITE = 'zadachi';
const KOLONA_KAM = 'kam';

/** Задачите по родител · в реда на началото, после по име, после по ред на създаване. */
function zadachiPoRoditel(o: Ogledalo): Map<string, number[]> {
  const tv = o.tablitsi.get(TABLITSA_NA_ZADACHITE);
  const po = new Map<string, number[]>();
  if (tv === undefined) return po;
  const klyuchNaPodredbata = (i: number): string => {
    const ot = kletkaNa(tv, i, 'ot');
    const ime = kletkaNa(tv, i, 'ime');
    return `${ot !== null && 'tekst' in ot ? ot.tekst : '9999-99-99'}|${ime !== null && 'tekst' in ime ? ime.tekst : ''}|${String(i).padStart(8, '0')}`;
  };
  for (const i of zhiviteRedove(tv)) {
    const kam = kletkaNa(tv, i, KOLONA_KAM);
    const id = kam !== null && 'tekst' in kam ? kam.tekst : '';
    po.set(id, [...(po.get(id) ?? []), i]);
  }
  for (const [id, spisak] of po) {
    po.set(
      id,
      spisak.sort((a, b) => (klyuchNaPodredbata(a) < klyuchNaPodredbata(b) ? -1 : 1)),
    );
  }
  return po;
}

/** Дървото · за екрана и за Книгата · ЕДИН ред на смятане. */
export function darvoto(o: Ogledalo): Darvo {
  const redove: RedNaDarvoto[] = [];
  const zadachi = zadachiPoRoditel(o);
  const tvZ = o.tablitsi.get(TABLITSA_NA_ZADACHITE);
  const videniZadachi = new Set<number>();
  let broyRoditeli = 0;
  const detsa = (tablitsa: string, id: string): void => {
    for (const i of zadachi.get(id) ?? []) {
      videniZadachi.add(i);
      redove.push({
        vid: 'zadacha',
        i,
        id: tvZ?.id[i] ?? '',
        roditelId: id,
        roditelTablitsa: tablitsa,
      });
    }
  };
  const roditel = (tablitsa: string, i: number, nivo: 0 | 1): void => {
    const tv = o.tablitsi.get(tablitsa)!;
    const id = tv.id[i] ?? '';
    broyRoditeli += 1;
    redove.push({ vid: 'roditel', tablitsa, i, id, nivo, nomer: nomerNaRed(o, tablitsa, i) });
    detsa(tablitsa, id);
  };
  // децата на Имота · Обекти и Бизнеси заедно, по номерация
  const podImota = new Map<string, { tablitsa: string; i: number; nomer: Nomer }[]>();
  for (const tablitsa of ['obekti', 'biznesi']) {
    const t = tablitsata(o.model, tablitsa);
    const tv = o.tablitsi.get(tablitsa);
    if (tv === undefined || t.roditel === undefined) continue;
    for (const r of podrediPoNomer(o, tablitsa)) {
      const k = kletkaNa(tv, r.i, t.roditel.kolona);
      const imotId = k !== null && 'tekst' in k ? k.tekst : '';
      podImota.set(imotId, [...(podImota.get(imotId) ?? []), { tablitsa, i: r.i, nomer: r.nomer }]);
    }
  }
  for (const r of podrediPoNomer(o, 'imoti')) {
    const tv = o.tablitsi.get('imoti')!;
    const id = tv.id[r.i] ?? '';
    roditel('imoti', r.i, 0);
    for (const d of (podImota.get(id) ?? []).sort((a, b) => sravniNomer(a.nomer, b.nomer))) {
      roditel(d.tablitsa, d.i, 1);
    }
  }
  const siratsi: number[] = [];
  if (tvZ !== undefined)
    for (const i of zhiviteRedove(tvZ)) if (!videniZadachi.has(i)) siratsi.push(i);
  return { redove, siratsi, broyRoditeli, broyZadachi: videniZadachi.size };
}
