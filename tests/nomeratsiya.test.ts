/**
 * НОМЕРАЦИЯТА · `Имот.Категория.Вид.№` се смята от Огледалото и се сравнява по
 * кортеж. Пиновете са НЕГОВИТЕ адреси от листа: `3.1.1.27` · `2.1.4.1` ·
 * `3.2.1.11` · `2.3.1`. И една находка, пинната нарочно: под групата `5.2`
 * (С.Г. БАРИЕРА · Паркинг) Книгата му пише `5.1.1.x` — по правилото е
 * `5.2.1.x`, и програмата смята по правилото; клетките му в `zadanie/02` не
 * се пипат (правило 17).
 */

import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/model/osnova.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { TIP } from '../src/sabitiya/registar.js';
import {
  grupiPoImotIKategoriya,
  nomerNaRed,
  podrediPoNomer,
  sravniNomer,
  tekstNaNomera,
} from '../src/smetach/nomeratsiya.js';
import { knigaZaTest } from './pomoshtni.js';

const KOGATO = '2026-09-05T10:00:00.000Z';

async function knigataMu() {
  const k = knigaZaTest();
  await k.otkriy();
  const imoti = ['Герман', 'Гара Яна', 'Студентски Град', 'Панчарево', 'С.Г. БАРИЕРА'];
  for (const [i, ime] of imoti.entries()) {
    await k.zapishi(
      TIP.redZapisan,
      { vid: 'imot', id: `imot:${i + 1}` },
      {
        tablitsa: 'imoti',
        id: `imot:${i + 1}`,
        kletki: { ime: { tekst: ime }, sastoyanie: { nomer: 2 } },
      },
    );
  }
  const obekt = async (id: string, imot: number, kategoriya: number, vid: number, nomer: number) =>
    k.zapishi(
      TIP.redZapisan,
      { vid: 'obekt', id },
      {
        tablitsa: 'obekti',
        id,
        kletki: {
          imot: { tekst: `imot:${imot}` },
          kategoriya: { nomer: kategoriya },
          vid: { nomer: vid },
          nomer: { chislo: nomer },
        },
      },
    );
  await obekt('obekt:a', 3, 1, 1, 27);
  await obekt('obekt:b', 2, 1, 4, 1);
  await obekt('obekt:c', 3, 2, 1, 11);
  await obekt('obekt:d', 5, 2, 1, 1);
  await obekt('obekt:e', 3, 1, 2, 20);
  await obekt('obekt:f', 3, 1, 2, 8);
  await k.zapishi(
    TIP.redZapisan,
    { vid: 'biznes', id: 'biznes:1' },
    {
      tablitsa: 'biznesi',
      id: 'biznes:1',
      kletki: { imot: { tekst: 'imot:2' }, sastoyanie: { nomer: 1 }, nomer: { chislo: 1 } },
    },
  );
  return k;
}

describe('неговите адреси', () => {
  it('3.1.1.27 · 2.1.4.1 · 3.2.1.11 · 2.3.1 · и Имотът е брояч', async () => {
    const k = await knigataMu();
    const o = fold(await k.sabitiya(), MODEL, KOGATO);
    const nomer = (tablitsa: string, id: string): string =>
      tekstNaNomera(nomerNaRed(o, tablitsa, o.tablitsi.get(tablitsa)!.indeks.get(id)!));
    expect(nomer('imoti', 'imot:3')).toBe('3');
    expect(nomer('obekti', 'obekt:a')).toBe('3.1.1.27');
    expect(nomer('obekti', 'obekt:b')).toBe('2.1.4.1');
    expect(nomer('obekti', 'obekt:c')).toBe('3.2.1.11');
    expect(nomer('biznesi', 'biznes:1')).toBe('2.3.1');
  });

  it('находката · под 5.2 Книгата му пише 5.1.1.1, правилото дава 5.2.1.1', async () => {
    const k = await knigataMu();
    const o = fold(await k.sabitiya(), MODEL, KOGATO);
    const i = o.tablitsi.get('obekti')!.indeks.get('obekt:d')!;
    expect(tekstNaNomera(nomerNaRed(o, 'obekti', i))).toBe('5.2.1.1');
  });

  it('изключен Имот пази номера си · следващите не се преномерират', async () => {
    const k = await knigataMu();
    await k.zapishi(
      TIP.redIzklyuchen,
      { vid: 'imot', id: 'imot:1' },
      { tablitsa: 'imoti', id: 'imot:1', izklyuchen: true },
    );
    const o = fold(await k.sabitiya(), MODEL, KOGATO);
    expect(tekstNaNomera(nomerNaRed(o, 'imoti', 1))).toBe('2');
    expect(podrediPoNomer(o, 'imoti').map((r) => tekstNaNomera(r.nomer))).toEqual([
      '2',
      '3',
      '4',
      '5',
    ]);
  });

  it('липсващ родител или празна клетка е 0, видимо · не е скрито', async () => {
    const k = await knigataMu();
    await k.zapishi(
      TIP.redZapisan,
      { vid: 'obekt', id: 'obekt:x' },
      {
        tablitsa: 'obekti',
        id: 'obekt:x',
        kletki: { imot: { tekst: 'imot:99' }, kategoriya: { nomer: 1 } },
      },
    );
    const o = fold(await k.sabitiya(), MODEL, KOGATO);
    const i = o.tablitsi.get('obekti')!.indeks.get('obekt:x')!;
    expect(nomerNaRed(o, 'obekti', i)).toEqual([0, 1, 0, 0]);
  });
});

describe('кортежът', () => {
  it('3.1.2.8 идва преди 3.1.2.20 · и 3.1 преди 3.1.1.1', () => {
    expect(sravniNomer([3, 1, 2, 8], [3, 1, 2, 20])).toBeLessThan(0);
    expect(sravniNomer([3, 1], [3, 1, 1, 1])).toBeLessThan(0);
    expect(sravniNomer([10], [9])).toBeGreaterThan(0);
    expect(sravniNomer([2, 3, 1], [2, 3, 1])).toBe(0);
  });

  it('подреждането е по кортеж, не по текст', async () => {
    const k = await knigataMu();
    const o = fold(await k.sabitiya(), MODEL, KOGATO);
    expect(podrediPoNomer(o, 'obekti').map((r) => tekstNaNomera(r.nomer))).toEqual([
      '2.1.4.1',
      '3.1.1.27',
      '3.1.2.8',
      '3.1.2.20',
      '3.2.1.11',
      '5.2.1.1',
    ]);
  });
});

describe('групите · Обекти ∪ Бизнеси под Имот · Категория', () => {
  it('както в листа му · 2.1 Гара Яна Сграда · 2.3 Гара Яна Бизнес · 3.1 · 3.2 · 5.2', async () => {
    const k = await knigataMu();
    const o = fold(await k.sabitiya(), MODEL, KOGATO);
    const grupi = grupiPoImotIKategoriya(o, ['obekti', 'biznesi']);
    expect(
      grupi.map((g) => [
        `${tekstNaNomera(g.imotNomer)}.${g.kategoriya}`,
        g.imotIme,
        g.kategoriyaTekst,
        g.redove.map((r) => tekstNaNomera(r.nomer)),
      ]),
    ).toEqual([
      ['2.1', 'Гара Яна', 'Сграда', ['2.1.4.1']],
      ['2.3', 'Гара Яна', 'Бизнес', ['2.3.1']],
      ['3.1', 'Студентски Град', 'Сграда', ['3.1.1.27', '3.1.2.8', '3.1.2.20']],
      ['3.2', 'Студентски Град', 'Паркинг', ['3.2.1.11']],
      ['5.2', 'С.Г. БАРИЕРА', 'Паркинг', ['5.2.1.1']],
    ]);
  });
});
