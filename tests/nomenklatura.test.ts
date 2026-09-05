/**
 * НОМЕНКЛАТУРАТА · трите закона (замразен номер · спиране вместо триене ·
 * уникален текст сред живи И спрени) и сверката живи + спрени = всички.
 */

import { describe, expect, it } from 'vitest';
import {
  dobavi,
  GreshkaNomenklatura,
  otBazovite,
  poNomer,
  poTekst,
  podravni,
  preimenuvay,
  sStoynost,
  sledvashtNomer,
  spri,
  broyachNaNomenklaturata,
  zhivite,
  type ZhivaNomenklatura,
} from '../src/model/nomenklatura.js';
import { MODEL, NOMENKLATURA } from '../src/model/osnova.js';
import { nomenklaturata } from '../src/model/model.js';

const sastoyanie = (): ZhivaNomenklatura =>
  otBazovite(nomenklaturata(MODEL, NOMENKLATURA.sastoyanieNaImot));
const vidNaObekt = (): ZhivaNomenklatura =>
  otBazovite(nomenklaturata(MODEL, NOMENKLATURA.vidNaObekt));

describe('номерът е замразен', () => {
  it('новата стойност взима най-големия номер + 1 · спрените се броят', () => {
    let n = sastoyanie();
    expect(sledvashtNomer(n)).toBe(4);
    n = sStoynost(n, spri(n, 3, true));
    expect(sledvashtNomer(n)).toBe(4);
    const nova = dobavi(n, 'Продаден');
    expect(nova).toEqual({
      nomer: 4,
      tekst: 'Продаден',
      bazova: false,
      spryana: false,
      belezi: {},
    });
  });

  it('преименуването пази номера', () => {
    const n = sastoyanie();
    const p = preimenuvay(n, 2, 'УПИ (Урегулиран Поземлен Имот)');
    expect(p.nomer).toBe(2);
    expect(p.bazova).toBe(true);
    expect(sStoynost(n, p).stoynosti[1]?.tekst).toBe('УПИ (Урегулиран Поземлен Имот)');
  });

  it('видът се номерира В категорията · нов вид под Паркинг е 2, под Сграда е 6', () => {
    const n = vidNaObekt();
    expect(dobavi(n, 'ППМ', { kategoriya: 2 }).nomer).toBe(2);
    expect(dobavi(n, 'ателие', { kategoriya: 1 }).nomer).toBe(6);
  });

  it('номенклатура по белег отказва стойност без белега', () => {
    expect(() => dobavi(vidNaObekt(), 'ателие')).toThrow(/избери го първо/);
  });
});

describe('триене няма · има спиране', () => {
  it('спряната стойност остава с номера си · връщането е същото със `spryana: false`', () => {
    let n = sastoyanie();
    n = sStoynost(n, spri(n, 1, true));
    expect(zhivite(n).map((s) => s.tekst)).toEqual(['УПИ', 'Строеж']);
    expect(poNomer(n, 1)?.tekst).toBe('ПИ');
    n = sStoynost(n, spri(n, 1, false));
    expect(zhivite(n)).toHaveLength(3);
  });

  it('броячът · живи + спрени = всички', () => {
    let n = sastoyanie();
    expect(broyachNaNomenklaturata(n)).toEqual({ zhivi: 3, spreni: 0, vsichki: 3 });
    n = sStoynost(n, spri(n, 2, true));
    expect(broyachNaNomenklaturata(n)).toEqual({ zhivi: 2, spreni: 1, vsichki: 3 });
  });

  it('спиране на несъществуващ номер се отказва с думи', () => {
    expect(() => spri(sastoyanie(), 9, true)).toThrow(GreshkaNomenklatura);
  });
});

describe('текстът е уникален · сред живите И сред спрените', () => {
  it('жив дубъл се отказва · с номера му', () => {
    expect(() => dobavi(sastoyanie(), ' УПИ ')).toThrow(/вече е в „Състояние на Имот" \(№ 2\)/);
  });

  it('спрян дубъл се отказва С ДРУГИ думи · „върни я"', () => {
    const n = sStoynost(sastoyanie(), spri(sastoyanie(), 2, true));
    expect(() => dobavi(n, 'УПИ')).toThrow(/СПРЯНА \(№ 2\) — върни я/);
  });

  it('преименуване върху чужд текст се отказва · върху своя минава', () => {
    const n = sastoyanie();
    expect(() => preimenuvay(n, 1, 'УПИ')).toThrow(/вече е № 2/);
    expect(preimenuvay(n, 2, 'УПИ').tekst).toBe('УПИ');
  });

  it('празното не е стойност · нито за добавяне, нито за преименуване', () => {
    expect(() => dobavi(sastoyanie(), '   ')).toThrow(/празна/);
    expect(() => preimenuvay(sastoyanie(), 1, '')).toThrow(/спиране/);
  });

  it('подравняването е NFC + trim + един интервал · БЕЗ смяна на главните', () => {
    expect(podravni('  Акт   15 ')).toBe('Акт 15');
    expect(podravni('й')).toBe('й');
    expect(poTekst(sastoyanie(), 'упи')).toBeUndefined();
    expect(poTekst(sastoyanie(), 'УПИ ')?.nomer).toBe(2);
  });
});
