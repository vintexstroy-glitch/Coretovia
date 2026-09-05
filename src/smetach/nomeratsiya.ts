/**
 * НОМЕРАЦИЯТА · `Имот.Категория.Вид.№` се СМЯТА, не се записва (ADR-003).
 *
 * Неговата Книга: `3.1.1.27` = Студентски Град (3) · Сграда (1) · апартамент
 * (1) · № 27; `2.3.1` = Гара Яна (2) · Бизнес (3) · № 1. Всеки сегмент идва от
 * описанието на таблицата (`Tablitsa.nomeratsiya`), не от код по таблица.
 *
 * Номерът е КОРТЕЖ от цели числа; текстът с точки е само изписването му.
 * Сравнява се по кортеж, защото `3.1.2.20` идва СЛЕД `3.1.2.8`, а текстът би
 * казал обратното. Липсващ сегмент (празна клетка, липсващ родител) е 0 —
 * видим на екрана като `3.0.1.27`, не скрит.
 */

import { tablitsata } from '../model/model.js';
import { poNomer } from '../model/nomenklatura.js';
import { NOMENKLATURA } from '../model/osnova.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { kletkaNa, type TablitsaVOgledaloto, zhiviteRedove } from '../ogledalo/tablitsa.js';
import type { Kletka } from '../model/kletka.js';

export type Nomer = readonly number[];

function tsyaloOt(k: Kletka | null): number {
  if (k === null) return 0;
  if ('chislo' in k) return k.chislo;
  if ('nomer' in k) return k.nomer;
  if ('stoynost_st' in k) return k.stoynost_st;
  return 0;
}

/**
 * Номерът от КЛЕТКИ · за ред, който още го няма (черновата на командата) или
 * за съществуващ (`nomerNaRed`). `pozitsiya` е мястото в реда на създаване —
 * броячът на Имота; за нов ред е `broy` на таблицата.
 */
export function nomerOtKletki(
  o: Ogledalo,
  tablitsa: string,
  kletka: (kolona: string) => Kletka | null,
  pozitsiya: number,
): Nomer {
  const opis = tablitsata(o.model, tablitsa);
  if (opis.nomeratsiya === undefined) return [];
  const nomer: number[] = [];
  for (const s of opis.nomeratsiya.segmenti) {
    switch (s.ot) {
      case 'broyach':
        nomer.push(pozitsiya + 1);
        break;
      case 'roditel': {
        const r = opis.roditel;
        const k = r === undefined ? null : kletka(r.kolona);
        const roditelId = k !== null && 'tekst' in k ? k.tekst : '';
        const roditel = r === undefined ? undefined : o.tablitsi.get(r.tablitsa);
        const ri = roditel?.indeks.get(roditelId);
        if (r === undefined || ri === undefined) nomer.push(0);
        else nomer.push(...nomerNaRed(o, r.tablitsa, ri));
        break;
      }
      case 'nomenklatura':
      case 'kolona':
        nomer.push(tsyaloOt(kletka(s.kolona)));
        break;
      case 'kategoriya-fiksirana':
        nomer.push(s.nomer);
        break;
    }
  }
  return nomer;
}

/** Номерът на реда `i` в таблица `tablitsa` · кортеж · `[]` за таблица без номерация. */
export function nomerNaRed(o: Ogledalo, tablitsa: string, i: number): Nomer {
  const t = o.tablitsi.get(tablitsa);
  if (t === undefined) return [];
  return nomerOtKletki(o, tablitsa, (kolona) => kletkaNa(t, i, kolona), i);
}

export function tekstNaNomera(n: Nomer, razdelitel = '.'): string {
  return n.join(razdelitel);
}

/** Кортежно сравнение · по-късият, който е префикс, е по-малък. */
export function sravniNomer(a: Nomer, b: Nomer): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const r = (a[i] ?? 0) - (b[i] ?? 0);
    if (r !== 0) return r;
  }
  return a.length - b.length;
}

export interface RedSNomer {
  readonly tablitsa: string;
  readonly i: number;
  readonly nomer: Nomer;
}

/** Живите редове на таблица, с номерата им, подредени по кортеж. */
export function podrediPoNomer(o: Ogledalo, tablitsa: string): RedSNomer[] {
  const t = o.tablitsi.get(tablitsa);
  if (t === undefined) return [];
  return zhiviteRedove(t)
    .map((i) => ({ tablitsa, i, nomer: nomerNaRed(o, tablitsa, i) }))
    .sort((a, b) => sravniNomer(a.nomer, b.nomer));
}

export interface GrupaPoImotIKategoriya {
  readonly imotId: string;
  readonly imotNomer: Nomer;
  readonly imotIme: string;
  readonly kategoriya: number;
  readonly kategoriyaTekst: string;
  readonly redove: readonly RedSNomer[];
}

/**
 * ГРУПИТЕ · Обекти ∪ Бизнеси под Имот · Категория, както в листа му
 * (`2.1 · Гара Яна · Сграда`, `2.3 · Гара Яна · Бизнес`).
 *
 * Категорията е сегментът веднага СЛЕД номера на Имота — при Обектите от
 * номенклатурата, при Бизнесите закован на 3. Групите са подредени по кортеж
 * (Имот, Категория); редовете вътре — по своя номер.
 */
export function grupiPoImotIKategoriya(
  o: Ogledalo,
  tablitsi: readonly string[],
): GrupaPoImotIKategoriya[] {
  const imoti = o.tablitsi.get('imoti');
  const kategorii = o.nomenklaturi.get(NOMENKLATURA.kategoriya);
  const grupi = new Map<string, { imotId: string; kategoriya: number; redove: RedSNomer[] }>();
  for (const tablitsa of tablitsi) {
    const opis = tablitsata(o.model, tablitsa);
    const t = o.tablitsi.get(tablitsa);
    if (t === undefined || opis.roditel === undefined) continue;
    for (const red of podrediPoNomer(o, tablitsa)) {
      const imotId = imotNa(t, red.i, opis.roditel.kolona);
      const dalzhinaNaImota = imoti === undefined ? 1 : nomerNaRedIliNula(o, imoti, imotId).length;
      const kategoriya = red.nomer[dalzhinaNaImota] ?? 0;
      const klyuch = `${imotId}#${kategoriya}`;
      const g = grupi.get(klyuch) ?? { imotId, kategoriya, redove: [] };
      g.redove.push(red);
      grupi.set(klyuch, g);
    }
  }
  const rezultat: GrupaPoImotIKategoriya[] = [...grupi.values()].map((g) => {
    const imotNomer = imoti === undefined ? [] : nomerNaRedIliNula(o, imoti, g.imotId);
    const ii = imoti?.indeks.get(g.imotId);
    const ime = imoti === undefined || ii === undefined ? null : kletkaNa(imoti, ii, 'ime');
    return {
      imotId: g.imotId,
      imotNomer,
      imotIme: ime !== null && 'tekst' in ime ? ime.tekst : '',
      kategoriya: g.kategoriya,
      kategoriyaTekst:
        kategorii === undefined ? '' : (poNomer(kategorii, g.kategoriya)?.tekst ?? ''),
      redove: g.redove.sort((a, b) => sravniNomer(a.nomer, b.nomer)),
    };
  });
  return rezultat.sort(
    (a, b) => sravniNomer(a.imotNomer, b.imotNomer) || a.kategoriya - b.kategoriya,
  );
}

function imotNa(t: TablitsaVOgledaloto, i: number, kolona: string): string {
  const k = kletkaNa(t, i, kolona);
  return k !== null && 'tekst' in k ? k.tekst : '';
}

function nomerNaRedIliNula(o: Ogledalo, imoti: TablitsaVOgledaloto, imotId: string): Nomer {
  const ii = imoti.indeks.get(imotId);
  return ii === undefined ? [0] : nomerNaRed(o, imoti.klyuch, ii);
}
