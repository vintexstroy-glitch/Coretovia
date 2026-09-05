/**
 * РЕДЪТ „ФИЛТЪР" · неговият ред под главите · съдържа, без главни, в NFC (ADR-005).
 *
 * Родителят остава, ако сам минава или има видим ред под себе си; сверката е
 * видими + скрити = всички.
 */

import { describe, expect, it } from 'vitest';
import {
  eFiltarPrazen,
  filtrirayDarvoto,
  minavaFiltara,
  type RedZaFiltar,
  svedi,
} from '../src/smetach/filtar.js';

describe('думата под колоната', () => {
  it('свежда · NFC · без главни · без краища', () => {
    expect(svedi('  Сондаж ')).toBe('сондаж');
    // „й" като „и" + знак (NFD) е същото „й" (правило 11)
    expect(svedi('Гара Янӑ'.normalize('NFD'))).toBe(svedi('Гара Янӑ'));
  });

  it('празният филтър пуска всичко · думата се търси в СВОЯТА колона · всички непразни трябва да минат', () => {
    const dumi = ['1', 'Герман', 'ПИ', '', 'Дело / Сондаж'];
    expect(minavaFiltara(dumi, [])).toBe(true);
    expect(minavaFiltara(dumi, ['', 'герм'])).toBe(true);
    expect(minavaFiltara(dumi, ['', '', '', '', 'сон'])).toBe(true);
    expect(minavaFiltara(dumi, ['', 'сон'])).toBe(false);
    expect(minavaFiltara(dumi, ['', 'герм', '', '', 'среща'])).toBe(false);
    expect(eFiltarPrazen(['', '  ', ''])).toBe(true);
    expect(eFiltarPrazen(['', 'x'])).toBe(false);
  });
});

describe('дървото · родителят остава заради децата си', () => {
  const redove: RedZaFiltar[] = [
    { nivo: 0, dumi: ['1', 'Герман'] }, // 0
    { nivo: 2, dumi: ['', '', '', '', 'Дело / Сондаж'] }, // 1
    { nivo: 0, dumi: ['3', 'Студентски Град'] }, // 2
    { nivo: 1, dumi: ['3.1.1.27', 'Студентски Град', 'апартамент'] }, // 3
    { nivo: 2, dumi: ['', '', '', '', 'Дело / СМР'] }, // 4
    { nivo: 2, dumi: ['', '', '', '', 'Среща / [лице]'] }, // 5
    { nivo: 1, dumi: ['3.2.1.11', 'Студентски Град', 'НПМ'] }, // 6
    { nivo: 0, dumi: ['4', 'Панчарево'] }, // 7
  ];

  it('без филтър всичко е видимо · сверката затваря', () => {
    const f = filtrirayDarvoto(redove, []);
    expect(f.vidimi).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(f.broyVidimi + f.broySkriti).toBe(redove.length);
  });

  it('филтър по задача · остават задачата, Обектът ѝ и Имотът над него', () => {
    const f = filtrirayDarvoto(redove, ['', '', '', '', 'смр']);
    expect(f.vidimi).toEqual([2, 3, 4]);
    expect(f.broySkriti).toBe(5);
  });

  it('филтър по Имот · Имотът остава сам, без децата, които не минават', () => {
    const f = filtrirayDarvoto(redove, ['', 'панчарево']);
    expect(f.vidimi).toEqual([7]);
    const g = filtrirayDarvoto(redove, ['', 'студентски']);
    // Имотът и двата Обекта минават по името на Имота; задачите — не
    expect(g.vidimi).toEqual([2, 3, 6]);
  });

  it('филтър, който нищо не хваща · нула видими, всички скрити', () => {
    const f = filtrirayDarvoto(redove, ['', 'няма такъв']);
    expect(f.vidimi).toEqual([]);
    expect(f.broySkriti).toBe(8);
  });
});
