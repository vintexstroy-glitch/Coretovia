/**
 * ТАБЛИЦАТА С НАХОДКИ на подтаб НАП (ADR-007).
 *
 * Негово (05.09 т.2): „В таба НАП се намира ДДС и има таблица за проблеми с
 * сверките на всички нива от Сметки: ДДС, Фактури, Контрагенти и всякакви
 * проверк и засичания от практиката и практиките на НАП и счетоводствот. Не е да
 * се свързва с НАП, а да направи по лесна работата на счетоводителя."
 *
 * Всяка проверка е НАЗОВАНА: ключ · ниво · дума какво търси. Тук няма връзка
 * навън и нищо не се записва — само чисто смятане върху Огледалото, което
 * ВРЪЩА находки с адрес (месец или ред), за да може счетоводителят да отиде
 * право там. Растежът на проверките от Настройки идва с формулите (резен 6) и
 * дотогава списъкът е тук, изброен поименно (правило 12: липсващото се казва).
 */

import { podravni } from '../model/nomenklatura.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { kletkaNa, zhiviteRedove } from '../ogledalo/tablitsa.js';
import { ddsat } from './dds.js';
import { imeNaVrazkata } from './kletki.js';
import { keshatNaMeseca, smetkite } from './smetki.js';
import { kolonaNa } from '../model/tablitsa.js';
import { tablitsata } from '../model/model.js';

/**
 * Нивата са НЕГОВИТЕ три, дословно: „сверките на всички нива от Сметки: ДДС,
 * Фактури, Контрагенти". Редът извън секция стои при Фактури — той е ред с пари.
 */
export const NIVA = ['ДДС', 'Фактури', 'Контрагенти'] as const;
export type Nivo = (typeof NIVA)[number];

export interface ProverkaNaNap {
  readonly klyuch: string;
  readonly nivo: Nivo;
  /** какво търси · с думи, за счетоводителя */
  readonly kakvo: string;
}

/** Проверките, поименно · редът им е редът на таблицата. */
export const PROVERKI: readonly ProverkaNaNap[] = [
  {
    klyuch: 'dds-deklarirano',
    nivo: 'ДДС',
    kakvo: 'декларираното пред НАП не е дължимото по сметките',
  },
  { klyuch: 'dds-plateno', nivo: 'ДДС', kakvo: 'платеното не е декларираното — остава остатък' },
  { klyuch: 'dds-lipsva', nivo: 'ДДС', kakvo: 'месец с движения, но без ред за ДДС' },
  {
    klyuch: 'fakturi-kesh',
    nivo: 'Фактури',
    kakvo: 'дадените кеш пари не са вкарани по редовете',
  },
  {
    klyuch: 'fakturi-schetovodstvo',
    nivo: 'Фактури',
    kakvo: 'издадените и платените по счетоводство не са нашите суми (идват с месец назад)',
  },
  {
    klyuch: 'fakturi-nesvereni',
    nivo: 'Фактури',
    kakvo: 'ред с пари без Състояние на Сметки (Сметнато · Вкарано · Прочетено)',
  },
  {
    klyuch: 'kontragenti-bez-ime',
    nivo: 'Контрагенти',
    kakvo: 'фактура без име на контрагент',
  },
  {
    klyuch: 'kontragenti-blizki',
    nivo: 'Контрагенти',
    kakvo: 'един контрагент, изписан по два начина',
  },
  { klyuch: 'smetki-bez-sektsiya', nivo: 'Фактури', kakvo: 'ред с пари извън секция' },
];

export interface NahodkaNaNap {
  readonly proverka: string;
  readonly nivo: Nivo;
  /** месец ГГГГ-ММ или id на реда · за да се отиде право там */
  readonly adres: string;
  readonly kakvo: string;
  /** разликата в цели центове · 0, когато находката не е за число */
  readonly razlika: number;
}

export interface OtchetNaNap {
  readonly nahodki: readonly NahodkaNaNap[];
  /** колко проверки са минали и колко са намерили нещо */
  readonly proverki: number;
  readonly sProblem: number;
}

const SEKTSII_S_KONTRAGENT = ['Фактури Кеш', 'Фактури Карта', 'Фактури Бнка'];

function mesetsiteNaDvizheniyata(o: Ogledalo): string[] {
  const tv = o.tablitsi.get('dvizheniya');
  const mesetsi = new Set<string>();
  if (tv !== undefined) {
    for (const i of zhiviteRedove(tv)) {
      const k = kletkaNa(tv, i, 'mesets');
      if (k !== null && 'tekst' in k) mesetsi.add(k.tekst);
    }
  }
  return [...mesetsi].sort();
}

/** Един ред с пари · думите му, за да се познае в находката. */
function dumiteNaReda(o: Ogledalo, i: number): string {
  const tv = o.tablitsi.get('dvizheniya')!;
  const t = tablitsata(o.model, 'dvizheniya');
  const ime = kletkaNa(tv, i, 'ime');
  if (ime !== null && 'tekst' in ime && ime.tekst !== '') return ime.tekst;
  const kam = kletkaNa(tv, i, 'kam');
  const kol = kolonaNa(t, 'kam');
  if (kam !== null && 'tekst' in kam && kol !== undefined) return imeNaVrazkata(o, kol, kam.tekst);
  return tv.id[i] ?? '';
}

/**
 * Отчетът на подтаб НАП · всяка проверка минава по всички месеци и редове.
 *
 * `dnes` дава коя е „миналият месец": числата от счетоводството идват с МЕСЕЦ
 * назад (негово, 05.09 т.3), затова липсата им за ТЕКУЩИЯ месец не е находка.
 */
export function nahodkiteNaNap(o: Ogledalo, dnes: string, kogato: string): OtchetNaNap {
  const nahodki: NahodkaNaNap[] = [];
  const dobavi = (klyuch: string, adres: string, kakvo: string, razlika = 0): void => {
    const p = PROVERKI.find((x) => x.klyuch === klyuch)!;
    nahodki.push({ proverka: p.klyuch, nivo: p.nivo, adres, kakvo, razlika });
  };
  const tekusht = dnes.slice(0, 7);
  const dds = ddsat(o, kogato);
  const poMesets = new Map(dds.mesetsi.map((m) => [m.mesets, m]));

  // ═══ ДДС ═══
  for (const m of dds.mesetsi) {
    if (m.dalzhimo !== m.deklarirano)
      dobavi(
        'dds-deklarirano',
        m.mesets,
        `дължимо ${m.dalzhimo / 100} ≠ декларирано ${m.deklarirano / 100}`,
        m.dalzhimo - m.deklarirano,
      );
    if (m.deklarirano !== m.plateno)
      dobavi(
        'dds-plateno',
        m.mesets,
        `декларирано ${m.deklarirano / 100} ≠ платено ${m.plateno / 100} · остатък ${m.ostatak / 100}`,
        m.deklarirano - m.plateno,
      );
  }
  for (const mesets of mesetsiteNaDvizheniyata(o)) {
    if (!poMesets.has(mesets))
      dobavi('dds-lipsva', mesets, 'месецът има движения, но няма ред за ДДС');
  }

  // ═══ Фактури ═══
  for (const mesets of mesetsiteNaDvizheniyata(o)) {
    const kesh = keshatNaMeseca(o, mesets, kogato);
    const razlika = kesh.dadeno - Math.abs(kesh.vkarano);
    if (kesh.dadeno !== 0 && razlika !== 0)
      dobavi(
        'fakturi-kesh',
        mesets,
        `дадени ${kesh.dadeno / 100} ≠ вкарани ${Math.abs(kesh.vkarano) / 100}`,
        razlika,
      );
    const m = poMesets.get(mesets);
    const s = smetkite(o, kogato, (x) => x === mesets);
    if (m === undefined) continue;
    if (m.izdadeni === 0 && m.plateni === 0) {
      if (mesets < tekusht)
        dobavi(
          'fakturi-schetovodstvo',
          mesets,
          'счетоводството още не е вкарало издадените и платените фактури',
        );
      continue;
    }
    if (m.izdadeni !== s.sborPrihod)
      dobavi(
        'fakturi-schetovodstvo',
        mesets,
        `издадени по счетоводство ${m.izdadeni / 100} ≠ приход ${s.sborPrihod / 100}`,
        m.izdadeni - s.sborPrihod,
      );
    if (m.plateni !== -s.sborRazhod)
      dobavi(
        'fakturi-schetovodstvo',
        mesets,
        `платени по счетоводство ${m.plateni / 100} ≠ разход ${-s.sborRazhod / 100}`,
        m.plateni + s.sborRazhod,
      );
  }

  // ═══ редовете · състояние · контрагент ═══
  const tv = o.tablitsi.get('dvizheniya');
  const poIme = new Map<string, Set<string>>();
  if (tv !== undefined) {
    for (const i of zhiviteRedove(tv)) {
      const sastoyanie = kletkaNa(tv, i, 'sastoyanie');
      if (sastoyanie === null)
        dobavi('fakturi-nesvereni', tv.id[i] ?? '', `„${dumiteNaReda(o, i)}" няма Състояние`);
      const sektsiyaR = kletkaNa(tv, i, 'sektsiyaR');
      const n = o.nomenklaturi.get('sektsii-razhodi');
      const tekstNaSektsiyata =
        sektsiyaR !== null && 'nomer' in sektsiyaR && n !== undefined
          ? (n.stoynosti.find((x) => x.nomer === sektsiyaR.nomer)?.tekst ?? '')
          : '';
      const ime = kletkaNa(tv, i, 'ime');
      const imeTekst = ime !== null && 'tekst' in ime ? ime.tekst : '';
      if (SEKTSII_S_KONTRAGENT.some((x) => podravni(x) === podravni(tekstNaSektsiyata))) {
        if (imeTekst === '')
          dobavi(
            'kontragenti-bez-ime',
            tv.id[i] ?? '',
            `ред в „${tekstNaSektsiyata}" без контрагент`,
          );
      }
      if (imeTekst !== '') {
        const klyuch = podravni(imeTekst).replace(/[.,\s-]/g, '');
        poIme.set(klyuch, (poIme.get(klyuch) ?? new Set()).add(imeTekst));
      }
    }
  }
  for (const [, imena] of poIme) {
    if (imena.size > 1)
      dobavi(
        'kontragenti-blizki',
        [...imena][0] ?? '',
        `един контрагент с ${imena.size} изписвания: ${[...imena].join(' · ')}`,
      );
  }

  // ═══ редът извън секция ═══
  const vsichki = smetkite(o, kogato);
  for (const i of vsichki.bezSektsiya)
    dobavi('smetki-bez-sektsiya', tv?.id[i] ?? '', `„${dumiteNaReda(o, i)}" е извън секция`);

  return {
    nahodki,
    proverki: PROVERKI.length,
    sProblem: new Set(nahodki.map((n) => n.proverka)).size,
  };
}
