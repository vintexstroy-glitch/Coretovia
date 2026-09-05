/**
 * ПРОДАЖБИТЕ · двете му таблици, проверките и състоянието им (ADR-010).
 *
 * Негово (05.09, `zadanie/10` т.3): „Добави и калкулатора над Продажбите къето
 * едната таблица е завършила и всичко е платено, а другата е с Активни продажби
 * които чакат плащания."
 *
 * Значи ЗАВЪРШЕНА и АКТИВНА не са две нови таблици, а СЪСТОЯНИЕ на неговите две:
 * таблица, чиито продажби са платени докрай, е завършила. Състоянието се СМЯТА
 * от парите, не се въвежда — иначе би остаряло в мига, в който влезе вноска.
 *
 * ПРОВЕРКАТА (неговите „проверка банка" и „проверка кеш", формули в Книгата) е
 * цената минус сбора на вноските от същата страна. Тя е СВЕРКА: записва се и
 * когато е нула (правило 7). Двете таблици имат различни глави за едно и също
 * („ПД смр" ↔ „ПД кеш"), затова всичко тук върви по БЕЛЕГА `plashtane`, не по
 * името на колоната.
 *
 * Нищо тук не пише: чисто смятане върху Огледалото.
 */

import type { Kolona, StranaNaPlashtane } from '../model/kolona.js';
import { tablitsata } from '../model/model.js';
import type { Tablitsa } from '../model/tablitsa.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { kletkaNa, zhiviteRedove } from '../ogledalo/tablitsa.js';
import { sverka, type Sverka } from '../yadro/sverka.js';

/** Ключовете на двете му таблици · в реда на листа (първа сграда, после втора). */
export const TABLITSI_NA_PRODAZHBITE = ['prodazhbi', 'prodazhbi2'] as const;

/** Страните на плащането · в реда, в който стоят главите му. */
export const STRANI_NA_PLASHTANETO: readonly StranaNaPlashtane[] = Object.freeze(['banka', 'kesh']);

export const IMENA_NA_STRANITE_NA_PLASHTANE: Readonly<Record<StranaNaPlashtane, string>> =
  Object.freeze({ banka: 'банка', kesh: 'кеш' });

export interface StranaNaProdazhba {
  readonly strana: StranaNaPlashtane;
  /** цената по тази страна · неговите „цена банка" · „цена смр" */
  readonly tsena: number;
  /** сборът на вноските ѝ · ПД · НС · Акт 15 · Акт 16 */
  readonly vneseno: number;
  /** цена − внесено · неговата „проверка" · нулата значи платено */
  readonly ostatak: number;
}

export interface Prodazhba {
  readonly i: number;
  readonly id: string;
  readonly tablitsa: string;
  /** неговият „апартамент" · първата колона, която назовава продажбата */
  readonly ime: string;
  readonly kvadratura: number;
  /** цената, както е записана · неговата колона „цена" */
  readonly tsena: number;
  /** сборът на двете страни · сверява се срещу записаната цена */
  readonly tsenaPoStrani: number;
  readonly strani: readonly StranaNaProdazhba[];
  /** двата остатъка са нула */
  readonly platena: boolean;
  /**
   * ПЛАТЕНА и дошъл Акт 16 · негово решение, 05.09: „Само Акт 16".
   *
   * Платена без Акт 16 е нормално състояние, не грешка: парите са дошли, актът
   * още не. Затова двете стоят отделно и екранът казва кое липсва (правило 12).
   */
  readonly zavarshena: boolean;
  /** главите на вноските, които завършват и още ги няма · дословно негови */
  readonly chaka: readonly string[];
}

export interface TablitsaNaProdazhbite {
  readonly klyuch: string;
  readonly ime: string;
  readonly redove: readonly Prodazhba[];
  /** ОБЩО евро · неговият ред A58 · по колона с пари */
  readonly obshto: Readonly<Record<string, number>>;
  readonly kvadratura: number;
  /** брой платени продажби */
  readonly platenite: number;
  /** платените, при които е дошъл и Акт 16 */
  readonly zavarshenite: number;
  /** сборът на остатъците по двете страни · колко още се чака */
  readonly ostatak: number;
  /**
   * ЗАВЪРШЕНА е таблица с поне една продажба, в която всяка е платена И с Акт 16
   * (негово, 05.09); иначе е АКТИВНА — чака плащания или актове. Празната
   * таблица не е нито едното: тя е празна, и това се КАЗВА (правило 12).
   */
  readonly sastoyanie: 'zavarshena' | 'aktivna' | 'prazna';
  readonly sverki: readonly Sverka[];
}

export interface Prodazhbite {
  readonly tablitsi: readonly TablitsaNaProdazhbite[];
  readonly broy: number;
  readonly tsena: number;
  readonly vneseno: number;
  readonly ostatak: number;
}

function chislo(o: Ogledalo, tablitsa: string, i: number, kolona: string): number {
  const tv = o.tablitsi.get(tablitsa);
  const k = tv === undefined ? null : kletkaNa(tv, i, kolona);
  if (k === null) return 0;
  if ('stoynost_st' in k) return k.stoynost_st;
  if ('chislo' in k) return k.chislo;
  return 0;
}

function tekstNa(o: Ogledalo, tablitsa: string, i: number, kolona: string): string {
  const tv = o.tablitsi.get(tablitsa);
  const k = tv === undefined ? null : kletkaNa(tv, i, kolona);
  return k !== null && 'tekst' in k ? k.tekst : '';
}

/** Колоните с дадена роля и страна · по белега, не по името (двата му правописа). */
export function koloniteNa(
  t: Tablitsa,
  rolya: 'tsena' | 'vnoska' | 'proverka',
  strana?: StranaNaPlashtane,
): readonly Kolona[] {
  return t.koloni.filter(
    (k) => k.plashtane?.rolya === rolya && (strana === undefined || k.plashtane.strana === strana),
  );
}

/** Една продажба · двете ѝ страни и остатъците им. */
function prodazhbata(o: Ogledalo, t: Tablitsa, i: number, id: string): Prodazhba {
  const strani = STRANI_NA_PLASHTANETO.map((strana) => {
    const tsena = koloniteNa(t, 'tsena', strana).reduce(
      (s, k) => s + chislo(o, t.klyuch, i, k.klyuch),
      0,
    );
    const vneseno = koloniteNa(t, 'vnoska', strana).reduce(
      (s, k) => s + chislo(o, t.klyuch, i, k.klyuch),
      0,
    );
    return { strana, tsena, vneseno, ostatak: tsena - vneseno };
  });
  const platena = strani.every((x) => x.ostatak === 0);
  // вноските, които ЗАВЪРШВАТ продажбата · неговият Акт 16, в двата ѝ правописа
  const chaka = t.koloni
    .filter((k) => k.zavarshva === true && chislo(o, t.klyuch, i, k.klyuch) === 0)
    .map((k) => k.ime.trim());
  return {
    i,
    id,
    tablitsa: t.klyuch,
    ime: tekstNa(o, t.klyuch, i, 'apartament'),
    kvadratura: chislo(o, t.klyuch, i, 'kvadratura'),
    tsena: chislo(o, t.klyuch, i, 'tsena'),
    tsenaPoStrani: strani.reduce((s, x) => s + x.tsena, 0),
    strani,
    platena,
    zavarshena: platena && chaka.length === 0,
    chaka,
  };
}

/**
 * ЕВРО ЗА КВАДРАТ · цената, разделена на квадратурата (в цели кв. см).
 *
 * Втората му таблица носи такава колона и цената там СЛЕДВА от нея. Тук се смята
 * обратното — за първата таблица, която колона няма, и за сверката на втората.
 * Върща 0 при нулева квадратура: делене на нула не е число, а липса.
 */
export function evroZaKvadrat(tsena_st: number, kvadratura_kvsm: number): number {
  if (kvadratura_kvsm <= 0) return 0;
  return Math.round((tsena_st * 10000) / kvadratura_kvsm);
}

/** Цената от евро/квадрат · за сверката на втората му таблица. */
export function tsenaOtKvadrat(evroKvadrat_st: number, kvadratura_kvsm: number): number {
  return Math.round((evroKvadrat_st * kvadratura_kvsm) / 10000);
}

function tablitsataNaProdazhbite(
  o: Ogledalo,
  klyuch: string,
  kogato: string,
): TablitsaNaProdazhbite {
  const t = tablitsata(o.model, klyuch);
  const tv = o.tablitsi.get(klyuch);
  const redove =
    tv === undefined ? [] : zhiviteRedove(tv).map((i) => prodazhbata(o, t, i, tv.id[i] ?? ''));
  const obshto: Record<string, number> = {};
  for (const kol of t.koloni) {
    if (kol.vid !== 'evro' && kol.merka !== 'kvsm') continue;
    obshto[kol.klyuch] = redove.reduce((s, r) => s + chislo(o, klyuch, r.i, kol.klyuch), 0);
  }
  for (const strana of STRANI_NA_PLASHTANETO) {
    for (const kol of koloniteNa(t, 'proverka', strana)) {
      obshto[kol.klyuch] = redove.reduce(
        (s, r) => s + (r.strani.find((x) => x.strana === strana)?.ostatak ?? 0),
        0,
      );
    }
  }
  const platenite = redove.filter((r) => r.platena).length;
  const zavarshenite = redove.filter((r) => r.zavarshena).length;
  const ostatak = redove.reduce((s, r) => s + r.strani.reduce((x, y) => x + y.ostatak, 0), 0);
  const sverki: Sverka[] = [];
  // цената, записана на реда, срещу сбора на двете ѝ страни · и нулата се пише
  for (const r of redove) {
    sverki.push(
      sverka(
        `продажба · ${t.klyuch} · ${r.ime || r.id} · цена ↔ двете страни`,
        r.tsena,
        r.tsenaPoStrani,
        kogato,
      ),
    );
  }
  const eKvadrat = t.koloni.some((k) => k.klyuch === 'evroKvadrat');
  if (eKvadrat) {
    for (const r of redove) {
      sverki.push(
        sverka(
          `продажба · ${t.klyuch} · ${r.ime || r.id} · евро/квадрат × квадратура ↔ цена`,
          tsenaOtKvadrat(chislo(o, klyuch, r.i, 'evroKvadrat'), r.kvadratura),
          r.tsena,
          kogato,
        ),
      );
    }
  }
  return {
    klyuch,
    ime: t.ime,
    redove,
    obshto,
    kvadratura: redove.reduce((s, r) => s + r.kvadratura, 0),
    platenite,
    zavarshenite,
    ostatak,
    sastoyanie:
      redove.length === 0 ? 'prazna' : zavarshenite === redove.length ? 'zavarshena' : 'aktivna',
    sverki,
  };
}

/** Двете му таблици · за екрана, за Книгата и за Калкулатора. */
export function prodazhbite(o: Ogledalo, kogato: string): Prodazhbite {
  const tablitsi = TABLITSI_NA_PRODAZHBITE.map((k) => tablitsataNaProdazhbite(o, k, kogato));
  const vsichki = tablitsi.flatMap((t) => t.redove);
  return {
    tablitsi,
    broy: vsichki.length,
    tsena: vsichki.reduce((s, r) => s + r.tsenaPoStrani, 0),
    vneseno: vsichki.reduce((s, r) => s + r.strani.reduce((x, y) => x + y.vneseno, 0), 0),
    ostatak: vsichki.reduce((s, r) => s + r.strani.reduce((x, y) => x + y.ostatak, 0), 0),
  };
}
