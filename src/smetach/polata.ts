/**
 * ПОЛЕТАТА С ЦИФРИ на Управление · залепената горна част (ADR-005).
 *
 * Негово (05.09 т.2): „над тях постави необходимите полета с цифр и информация
 * за Управлени и съответно сушите полета над всеки бутон с поле което да покаже
 * от ляво на дясно най главните и важни."
 *
 * Кои са „най главните" е НАШ избор, докато не каже други — от ляво надясно:
 * Спешно и Важно · просрочени · тази седмица · отворени · Бюджет Дела · Имоти ·
 * Обекти · Бизнеси. Смятат се от Огледалото при всяко рисуване; нищо не се
 * записва. „Отворена" е задача, чийто край не е минал или няма край — състояние
 * „завършено" в номенклатурата му няма. Сверката: отворени + просрочени = всички.
 */

import { podravni, poTekst } from '../model/nomenklatura.js';
import { NOMENKLATURA } from '../model/osnova.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { kletkaNa, zhiviteRedove } from '../ogledalo/tablitsa.js';
import { sverka, type Sverka } from '../yadro/sverka.js';
import { dniDoSroka } from './gant.js';

/** негова дума · подглавата G18 „Спешно и Важно(червн цвят в Календара…)" */
export const SPESHNO_I_VAZHNO = 'Спешно и Важно';
/** „тази седмица" = краят е до седем дни напред, включително днес */
export const DNI_V_SEDMITSATA = 7;

export interface Pole {
  readonly klyuch: string;
  readonly ime: string;
  readonly stoynost: number;
  /** брой или цели центове */
  readonly vid: 'broy' | 'evro';
}

export interface Poleta {
  readonly poleta: readonly Pole[];
  readonly sverka: Sverka;
}

/** Номерът на „Спешно и Важно" в Оценка · по думата, не по позиция. */
export function nomerNaSpeshnoto(o: Ogledalo): number | null {
  const n = o.nomenklaturi.get(NOMENKLATURA.otsenka);
  if (n === undefined) return null;
  const s = poTekst(n, podravni(SPESHNO_I_VAZHNO));
  return s === undefined ? null : s.nomer;
}

function tekst(o: Ogledalo, tablitsa: string, i: number, kolona: string): string {
  const tv = o.tablitsi.get(tablitsa);
  const k = tv === undefined ? null : kletkaNa(tv, i, kolona);
  return k !== null && 'tekst' in k ? k.tekst : '';
}

export function poletataNaUpravlenie(o: Ogledalo, dnes: string, kogato: string): Poleta {
  const speshno = nomerNaSpeshnoto(o);
  const tvZ = o.tablitsi.get('zadachi');
  let speshni = 0;
  let prosrocheni = 0;
  let taziSedmitsa = 0;
  let otvoreni = 0;
  let byudzhet = 0;
  let vsichki = 0;
  if (tvZ !== undefined) {
    for (const i of zhiviteRedove(tvZ)) {
      vsichki += 1;
      const kray = tekst(o, 'zadachi', i, 'do');
      // нечетим край (NaN) = задачата е отворена, докато не се поправи
      const surovo = kray === '' ? Number.NaN : dniDoSroka(kray, dnes);
      const dni = Number.isNaN(surovo) ? null : surovo;
      const eProsrochena = dni !== null && dni < 0;
      if (eProsrochena) {
        prosrocheni += 1;
        continue;
      }
      otvoreni += 1;
      if (dni !== null && dni < DNI_V_SEDMITSATA) taziSedmitsa += 1;
      const ots = kletkaNa(tvZ, i, 'otsenka');
      if (speshno !== null && ots !== null && 'nomer' in ots && ots.nomer === speshno) speshni += 1;
      const b = kletkaNa(tvZ, i, 'byudzhet');
      if (b !== null && 'stoynost_st' in b) byudzhet += b.stoynost_st;
    }
  }
  const broy = (t: string): number => {
    const tv = o.tablitsi.get(t);
    return tv === undefined ? 0 : zhiviteRedove(tv).length;
  };
  const poleta: Pole[] = [
    { klyuch: 'speshni', ime: SPESHNO_I_VAZHNO, stoynost: speshni, vid: 'broy' },
    { klyuch: 'prosrocheni', ime: 'просрочени', stoynost: prosrocheni, vid: 'broy' },
    { klyuch: 'tazi-sedmitsa', ime: 'тази седмица', stoynost: taziSedmitsa, vid: 'broy' },
    { klyuch: 'otvoreni', ime: 'отворени задачи', stoynost: otvoreni, vid: 'broy' },
    { klyuch: 'byudzhet', ime: 'Бюджет Дела', stoynost: byudzhet, vid: 'evro' },
    { klyuch: 'imoti', ime: 'Имоти', stoynost: broy('imoti'), vid: 'broy' },
    { klyuch: 'obekti', ime: 'Обекти', stoynost: broy('obekti'), vid: 'broy' },
    { klyuch: 'biznesi', ime: 'Бизнеси', stoynost: broy('biznesi'), vid: 'broy' },
  ];
  return {
    poleta,
    sverka: sverka('полетата · отворени + просрочени', otvoreni + prosrocheni, vsichki, kogato),
  };
}
