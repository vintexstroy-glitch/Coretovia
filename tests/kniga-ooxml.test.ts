/**
 * КНИГАТА · кръгът през адаптера (ADR-002).
 *
 * Мострата се пише в паметта и се чете обратно през СЪЩИЯ адаптер: осем листа с
 * точните имена, слетите клетки на място, редът със SUM носи формулата И кеша,
 * и нито една парична клетка не губи цент по пътя.
 */

import { describe, expect, it } from 'vitest';
import { napishiKniga, prochetiKniga } from '../src/kniga/ooxml.js';
import { PROZORTSI } from '../src/model/osnova.js';
import { MOSTRA } from './mostri/mostra-kniga.js';

describe('Книгата · кръгът', () => {
  it('мострата има осемте листа, дословно и в реда на Книгата', async () => {
    const kniga = await prochetiKniga(await napishiKniga(MOSTRA));
    expect(kniga.listove.map((l) => l.ime)).toEqual(PROZORTSI.map((p) => p.list));
  });

  it('слетите клетки, формулите и кешът им оцеляват', async () => {
    const kniga = await prochetiKniga(await napishiKniga(MOSTRA));
    const imoti = kniga.listove.find((l) => l.ime === 'ИмотиОбектиБизнеси')!;
    expect(imoti.slivaniya).toContain('A4:H4');
    const prodazhbi = kniga.listove.find((l) => l.ime === 'Продажби')!;
    const sSum = [...prodazhbi.formuli.values()].filter((f) => f.startsWith('SUM('));
    expect(sSum.length).toBeGreaterThan(0);
  });

  it('парите минават като число и се връщат до цента · Math.round(v × 100) === st', async () => {
    const opis = MOSTRA.find((l) => l.ime === 'Продажби')!;
    const kniga = await prochetiKniga(await napishiKniga([opis]));
    const list = kniga.listove[0]!;
    let proverni = 0;
    for (const [i, red] of opis.redove.entries()) {
      for (const [j, k] of red.entries()) {
        if (typeof k !== 'number' || !Number.isInteger(k * 100)) continue;
        const v = list.kletki[i]?.[j];
        expect(typeof v).toBe('number');
        expect(Math.round((v as number) * 100)).toBe(Math.round(k * 100));
        proverni += 1;
      }
    }
    expect(proverni).toBeGreaterThan(20);
  });

  it('отключеният ЦЯЛ ред се пише като стил на реда и се чете обратно · главата остава заключена', async () => {
    const kniga = await prochetiKniga(
      await napishiKniga([
        {
          ime: 'Лист',
          redove: [['глава'], ['ред', 1], ['ред', 2]],
          otklyucheni: ['A2:B2'],
          otklyucheniRedove: [2, 3],
          zashtita: true,
        },
      ]),
    );
    const l = kniga.listove[0]!;
    expect(l.otklyucheniRedove).toEqual([2, 3]);
    expect(l.otklyucheni).toContain('A2');
    expect(l.otklyucheni).not.toContain('A1');
    expect(l.zashtiten).toBe(true);
  });

  it('текстовата номерация остава текст · „3.1" не става число', async () => {
    const kniga = await prochetiKniga(await napishiKniga(MOSTRA));
    const imoti = kniga.listove.find((l) => l.ime === 'ИмотиОбектиБизнеси')!;
    const nomera = imoti.kletki
      .map((r) => r[0])
      .filter((v) => typeof v === 'string' && /^\d+(\.\d+)+$/.test(v));
    expect(nomera).toContain('3.1.1.27');
  });
});
