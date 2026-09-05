/**
 * СМЕТКИТЕ · секциите, сборовете и кешът (ADR-006).
 *
 * Листът му (36–91) е ДВЕ ленти — ПРИХОД и Разходи — и под всяка неговите
 * секции (Наем Банка · Наем Кеш · Бизнес · Други; Заплати Кеш · Фактури Кеш ·
 * Фактури Карта · Фактури Бнка · Кредити · Банкови такси · Заплати Банка ·
 * Бизнес), всяка с ред „ОБЩ Бюджет Сметки" (негови K37 · K43).
 *
 * ЗНАКЪТ решава страната (правило 20): приходът е +, разходът е −. Секцията
 * назовава МЯСТОТО вътре в страната; двете трябва да си съответстват, и това е
 * предусловие на командата, не мълчалива поправка. „Бизнес" е дума и в двете
 * номенклатури — точно неговото B6: „Ако е на загуба се изпраща сметката с
 * знак - в Разходи."
 *
 * Всичко тук е ЧИСТО смятане върху Огледалото: нищо не пише, нищо не помни.
 * Парите са цели центове (правило 3); сверката се записва и когато е нула
 * (правило 7).
 */

import type { Strana } from '../model/kolona.js';
import { podravni, poTekst, zhivite } from '../model/nomenklatura.js';
import { NOMENKLATURA } from '../model/osnova.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { kletkaNa, zhiviteRedove } from '../ogledalo/tablitsa.js';
import { sverka, type Sverka } from '../yadro/sverka.js';

const TABLITSA_NA_DVIZHENIYATA = 'dvizheniya';
const TABLITSA_NA_KESHA = 'kesh';
/** месецът е ГГГГ-ММ · наша колона под неговата глава „Дата" */
export const OBRAZETS_NA_MESETSA = /^\d{4}-(0[1-9]|1[0-2])$/;
/** неговите две секции за кеш · сверката в края на месеца е за тях (05.09 т.2) */
export const SEKTSIYA_ZAPLATI_KESH = 'Заплати Кеш';
export const SEKTSIYA_FAKTURI_KESH = 'Фактури Кеш';
/** третата от секцията „Вкарване" · негово т.3 */
const SEKTSIYA_FAKTURI_KARTA = 'Фактури Карта';

export type { Strana } from '../model/kolona.js';

/** Коя колона на движението носи секцията на всяка страна. */
export const KOLONA_NA_SEKTSIYATA: Readonly<Record<Strana, string>> = Object.freeze({
  prihod: 'sektsiya',
  razhod: 'sektsiyaR',
});

export const NOMENKLATURA_NA_STRANATA: Readonly<Record<Strana, string>> = Object.freeze({
  prihod: NOMENKLATURA.sektsiiPrihod,
  razhod: NOMENKLATURA.sektsiiRazhodi,
});

export const IMENA_NA_STRANITE: Readonly<Record<Strana, string>> = Object.freeze({
  prihod: 'ПРИХОД',
  razhod: 'Разходи',
});

/** Страната по ЗНАКА (правило 20) · нулата не е движение и няма страна. */
export function stranaNaSuma(suma_st: number): Strana | null {
  if (suma_st > 0) return 'prihod';
  if (suma_st < 0) return 'razhod';
  return null;
}

export interface RedVSektsiya {
  readonly i: number;
  readonly id: string;
  readonly suma_st: number;
  readonly mesets: string;
}

export interface Sektsiya {
  readonly strana: Strana;
  readonly nomer: number;
  readonly tekst: string;
  readonly redove: readonly RedVSektsiya[];
  /** цели центове · със знака, както е записан */
  readonly sbor: number;
}

export interface Smetki {
  readonly prihod: readonly Sektsiya[];
  readonly razhod: readonly Sektsiya[];
  readonly sborPrihod: number;
  readonly sborRazhod: number;
  /** приход + разход · разходът е отрицателен, затова се СЪБИРА */
  readonly rezultat: number;
  /** движения без секция или с празна сума · казват се, не се крият */
  readonly bezSektsiya: readonly number[];
  readonly broyDvizheniya: number;
  readonly sverka: Sverka;
}

function tekstNa(o: Ogledalo, tablitsa: string, i: number, kolona: string): string {
  const tv = o.tablitsi.get(tablitsa);
  const k = tv === undefined ? null : kletkaNa(tv, i, kolona);
  return k !== null && 'tekst' in k ? k.tekst : '';
}

function tsentove(o: Ogledalo, tablitsa: string, i: number, kolona: string): number | null {
  const tv = o.tablitsi.get(tablitsa);
  const k = tv === undefined ? null : kletkaNa(tv, i, kolona);
  return k !== null && 'stoynost_st' in k ? k.stoynost_st : null;
}

/**
 * Секциите на двете страни · всяка с редовете и сбора си · плюс резултатът.
 *
 * `prezMeseca` пресява по месец (периодът на екрана); без него влиза всичко.
 * Сверка (правило 7): движенията в секции + без секция = всички живи движения.
 */
export function smetkite(
  o: Ogledalo,
  kogato: string,
  prezMeseca?: (mesets: string) => boolean,
): Smetki {
  const tv = o.tablitsi.get(TABLITSA_NA_DVIZHENIYATA);
  const poSektsiya = new Map<string, RedVSektsiya[]>();
  const bezSektsiya: number[] = [];
  let broyDvizheniya = 0;
  if (tv !== undefined) {
    for (const i of zhiviteRedove(tv)) {
      const mesets = tekstNa(o, TABLITSA_NA_DVIZHENIYATA, i, 'mesets');
      if (prezMeseca !== undefined && !prezMeseca(mesets)) continue;
      broyDvizheniya += 1;
      const suma_st = tsentove(o, TABLITSA_NA_DVIZHENIYATA, i, 'suma') ?? 0;
      const red: RedVSektsiya = { i, id: tv.id[i] ?? '', suma_st, mesets };
      let namerena = false;
      for (const strana of ['prihod', 'razhod'] as const) {
        const k = kletkaNa(tv, i, KOLONA_NA_SEKTSIYATA[strana]);
        if (k === null || !('nomer' in k)) continue;
        const klyuch = `${strana}#${k.nomer}`;
        poSektsiya.set(klyuch, [...(poSektsiya.get(klyuch) ?? []), red]);
        namerena = true;
      }
      if (!namerena) bezSektsiya.push(i);
    }
  }
  const sektsiiteNa = (strana: Strana): Sektsiya[] => {
    const n = o.nomenklaturi.get(NOMENKLATURA_NA_STRANATA[strana]);
    if (n === undefined) return [];
    return zhivite(n).map((s) => {
      const redove = poSektsiya.get(`${strana}#${s.nomer}`) ?? [];
      return {
        strana,
        nomer: s.nomer,
        tekst: s.tekst,
        redove,
        sbor: redove.reduce((a, r) => a + r.suma_st, 0),
      };
    });
  };
  const prihod = sektsiiteNa('prihod');
  const razhod = sektsiiteNa('razhod');
  const sborPrihod = prihod.reduce((a, s) => a + s.sbor, 0);
  const sborRazhod = razhod.reduce((a, s) => a + s.sbor, 0);
  const vSektsii = [...prihod, ...razhod].reduce((a, s) => a + s.redove.length, 0);
  return {
    prihod,
    razhod,
    sborPrihod,
    sborRazhod,
    rezultat: sborPrihod + sborRazhod,
    bezSektsiya,
    broyDvizheniya,
    sverka: sverka(
      'Сметки · движения в секции + без секция',
      broyDvizheniya,
      vSektsii + bezSektsiya.length,
      kogato,
    ),
  };
}

/** Номерът на секция по думата ѝ · за сверката на кеша и за секцията „Вкарване". */
export function nomerNaSektsiya(o: Ogledalo, strana: Strana, tekst: string): number | null {
  const n = o.nomenklaturi.get(NOMENKLATURA_NA_STRANATA[strana]);
  if (n === undefined) return null;
  const s = poTekst(n, podravni(tekst));
  return s === undefined ? null : s.nomer;
}

export interface Vkarvane {
  readonly sektsii: readonly Sektsiya[];
  readonly redove: readonly RedVSektsiya[];
  readonly sbor: number;
}

/**
 * СЕКЦИЯТА „ВКАРВАНЕ" · трите му секции на ЕДНО място (негово, 05.09 т.3):
 * „В таблиците за вкарването на Заплати, Фактури Кеш и Фактури Карта да са на
 * едно място в една секция за да се дава за Помощник Управителя да вкарва тези
 * три таблици." Правото на Помощник Управителя идва с резен 4 и се КАЗВА.
 */
export function vkarvaneto(
  o: Ogledalo,
  kogato: string,
  prezMeseca?: (m: string) => boolean,
): Vkarvane {
  const s = smetkite(o, kogato, prezMeseca);
  const trite = [SEKTSIYA_ZAPLATI_KESH, SEKTSIYA_FAKTURI_KESH, SEKTSIYA_FAKTURI_KARTA];
  const sektsii = trite
    .map((tekst) => s.razhod.find((x) => podravni(x.tekst) === podravni(tekst)))
    .filter((x): x is Sektsiya => x !== undefined);
  const redove = sektsii.flatMap((x) => x.redove);
  return { sektsii, redove, sbor: redove.reduce((a, r) => a + r.suma_st, 0) };
}

export interface Kesh {
  readonly mesets: string;
  /** дадени кеш пари · неговите две (05.09 т.2) */
  readonly zaplati: number;
  readonly fakturi: number;
  readonly dadeno: number;
  /** изтеглено по банковото извлечение в края на месеца */
  readonly izvlechenie: number;
  /** вкараното по редовете · сборът на движенията в двете кеш секции за месеца */
  readonly vkarano: number;
  readonly sverki: readonly Sverka[];
}

/**
 * КЕШЪТ за един месец · дадено ↔ изтеглено ↔ вкарано по редовете.
 *
 * Негово (05.09 т.2): „…дава възможност за въвеждане на информация за дадени
 * Кеш пари за Заплати и Фактури Кеш и сверка на края на месеца от извлечението."
 * Разходите са записани с МИНУС (знакът решава страната), затова вкараното се
 * сравнява по абсолютна стойност с дадените пари.
 */
export function keshatNaMeseca(o: Ogledalo, mesets: string, kogato: string): Kesh {
  const tv = o.tablitsi.get(TABLITSA_NA_KESHA);
  let i: number | undefined;
  if (tv !== undefined) {
    for (const r of zhiviteRedove(tv)) {
      if (tekstNa(o, TABLITSA_NA_KESHA, r, 'mesets') === mesets) i = r;
    }
  }
  const pole = (kolona: string): number =>
    i === undefined ? 0 : (tsentove(o, TABLITSA_NA_KESHA, i, kolona) ?? 0);
  const zaplati = pole('zaplati');
  const fakturi = pole('fakturi');
  const izvlechenie = pole('izvlechenie');
  const dadeno = zaplati + fakturi;
  const s = smetkite(o, kogato, (m) => m === mesets);
  const vSektsiyata = (tekst: string): number =>
    s.razhod.find((x) => podravni(x.tekst) === podravni(tekst))?.sbor ?? 0;
  const vkarano = vSektsiyata(SEKTSIYA_ZAPLATI_KESH) + vSektsiyata(SEKTSIYA_FAKTURI_KESH);
  return {
    mesets,
    zaplati,
    fakturi,
    dadeno,
    izvlechenie,
    vkarano,
    sverki: [
      sverka(`кеш ${mesets} · дадено ↔ изтеглено`, dadeno, izvlechenie, kogato),
      sverka(`кеш ${mesets} · дадено ↔ вкарано по редовете`, dadeno, Math.abs(vkarano), kogato),
    ],
  };
}
