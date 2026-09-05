/**
 * РЕДЪТ СБОР · сметките под колоната · цели центове · средното не влиза в сбор (ADR-005).
 *
 * Негово (05.09 т.1): „С опции за различни сметки отдолу." Сметката е чиста
 * функция върху клетки; кое е видимо решава екранът. Сверката: сборът върху
 * всички = сборът върху видимите + сборът върху скритите.
 */

import { describe, expect, it } from 'vitest';
import type { Kletka } from '../src/model/kletka.js';
import type { Kolona } from '../src/model/kolona.js';
import {
  IMENA_NA_SMETKITE,
  SMETKI,
  smetkataPoPodrazbirane,
  smetkiteNaKolonata,
  smetni,
} from '../src/smetach/sbor.js';

const EVRO: Kolona = {
  klyuch: 'b',
  ime: 'Бюджет',
  vid: 'evro',
  zadalzhitelna: false,
  zatvorena: false,
};
const PLOSHT: Kolona = {
  klyuch: 'p',
  ime: 'площ',
  vid: 'chislo',
  merka: 'kvsm',
  zadalzhitelna: false,
  zatvorena: false,
};
const TEKST: Kolona = {
  klyuch: 'i',
  ime: 'име',
  vid: 'tekst',
  zadalzhitelna: true,
  zatvorena: false,
};
const PROTSENT: Kolona = {
  klyuch: 'd',
  ime: 'дял',
  vid: 'protsent',
  zadalzhitelna: false,
  zatvorena: false,
};

describe('сметките · кои, за коя колона', () => {
  it('шест сметки с неговите думи · числата дават пет, думите — две', () => {
    expect([...SMETKI]).toEqual([
      'sbor',
      'sredno',
      'nay-malko',
      'nay-golyamo',
      'broy',
      'razlichni',
    ]);
    expect(Object.values(IMENA_NA_SMETKITE)).toEqual([
      'сбор',
      'средно',
      'най-малко',
      'най-голямо',
      'брой',
      'различни',
    ]);
    expect(smetkiteNaKolonata(EVRO)).toEqual([
      'sbor',
      'sredno',
      'nay-malko',
      'nay-golyamo',
      'broy',
    ]);
    expect(smetkiteNaKolonata(TEKST)).toEqual(['broy', 'razlichni']);
    expect(smetkataPoPodrazbirane(EVRO)).toBe('sbor');
    expect(smetkataPoPodrazbirane(PLOSHT)).toBe('sbor');
    expect(smetkataPoPodrazbirane(TEKST)).toBe('broy');
  });

  it('процентите НЕ се сборуват · средното им е сметката по подразбиране (правило 3)', () => {
    expect(smetkiteNaKolonata(PROTSENT)).toEqual(['sredno', 'nay-malko', 'nay-golyamo', 'broy']);
    expect(smetkataPoPodrazbirane(PROTSENT)).toBe('sredno');
    expect(smetni('sredno', PROTSENT, [{ chislo: 12 }, { chislo: 7 }]).kletka).toEqual({
      chislo: 10,
    });
    expect(() => smetni('sbor', PROTSENT, [{ chislo: 12 }])).toThrow(/Проценти не се сборуват/);
  });
});

describe('парите · цели центове', () => {
  const kletki: (Kletka | null)[] = [
    { stoynost_st: 25000000 },
    null,
    { stoynost_st: 115 },
    { stoynost_st: 29 },
  ];

  it('сборът е точен · в слота на колоната · влиза в сбор · празните не участват', () => {
    const r = smetni('sbor', EVRO, kletki);
    expect(r).toEqual({
      smetka: 'sbor',
      kletka: { stoynost_st: 25000144 },
      broy: 3,
      vlizaVSbor: true,
    });
  });

  it('средното се закръгля към цента и НЕ влиза в сбор (правило 3)', () => {
    const r = smetni('sredno', EVRO, kletki);
    // 25 000 144 / 3 = 8 333 381,33… → 8 333 381
    expect(r.kletka).toEqual({ stoynost_st: 8333381 });
    expect(r.vlizaVSbor).toBe(false);
    // половинката отива нагоре · 3 / 2 = 1,5 → 2
    expect(smetni('sredno', EVRO, [{ stoynost_st: 1 }, { stoynost_st: 2 }]).kletka).toEqual({
      stoynost_st: 2,
    });
  });

  it('най-малко · най-голямо · брой', () => {
    expect(smetni('nay-malko', EVRO, kletki).kletka).toEqual({ stoynost_st: 29 });
    expect(smetni('nay-golyamo', EVRO, kletki).kletka).toEqual({ stoynost_st: 25000000 });
    expect(smetni('broy', EVRO, kletki)).toEqual({
      smetka: 'broy',
      kletka: { chislo: 3 },
      broy: 3,
      vlizaVSbor: false,
    });
  });

  it('няма върху какво · `null`, не нула', () => {
    expect(smetni('sbor', EVRO, [null, null]).kletka).toBe(null);
    expect(smetni('broy', EVRO, []).kletka).toEqual({ chislo: 0 });
  });

  it('площта в кв. см · същите сметки · числото в слота `chislo`', () => {
    const r = smetni('sbor', PLOSHT, [{ chislo: 851234 }, { chislo: 125000 }]);
    expect(r.kletka).toEqual({ chislo: 976234 });
    expect(smetni('sredno', PLOSHT, [{ chislo: 851234 }, { chislo: 125000 }]).kletka).toEqual({
      chislo: 488117,
    });
  });
});

describe('думите · брой и различни · сбор върху думи е грешка с думи', () => {
  const dumi: (Kletka | null)[] = [{ tekst: 'Дело' }, { tekst: 'Среща' }, { tekst: 'Дело' }, null];

  it('броят е непразните · различните са без повторения', () => {
    expect(smetni('broy', TEKST, dumi).kletka).toEqual({ chislo: 3 });
    expect(smetni('razlichni', TEKST, dumi).kletka).toEqual({ chislo: 2 });
  });

  it('сбор върху текст не се смята · и се казва', () => {
    expect(() => smetni('sbor', TEKST, dumi)).toThrow(/„сбор" не се смята върху думи \(име\)/);
  });
});

describe('сверката · видимо + скрито = всичко (правило 18: скритото ПАК се смята)', () => {
  it('сборът върху всички е сборът върху видимите плюс сборът върху скритите', () => {
    const vsichki: Kletka[] = Array.from({ length: 50 }, (_, i) => ({ stoynost_st: i * 137 + 1 }));
    const vidimi = vsichki.filter((_k, i) => i % 3 === 0);
    const skriti = vsichki.filter((_k, i) => i % 3 !== 0);
    const st = (k: Kletka | null): number => (k !== null && 'stoynost_st' in k ? k.stoynost_st : 0);
    expect(st(smetni('sbor', EVRO, vsichki).kletka)).toBe(
      st(smetni('sbor', EVRO, vidimi).kletka) + st(smetni('sbor', EVRO, skriti).kletka),
    );
    expect(smetni('broy', EVRO, vsichki).broy).toBe(
      smetni('broy', EVRO, vidimi).broy + smetni('broy', EVRO, skriti).broy,
    );
  });
});
