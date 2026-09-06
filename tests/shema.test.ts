/**
 * СХЕМИТЕ · валидаторът казва с думи и с път; каталогът е СТРОГ; парите са
 * цели; схемите на редовете идват от Модела, не се пишат на ръка.
 */

import { describe, expect, it } from 'vitest';
import { KATALOG } from '../src/komandi/katalog.js';
import { proveriPoShema } from '../src/komandi/shema.js';
import { tablitsata } from '../src/model/model.js';
import { MODEL } from '../src/model/osnova.js';
import { type ShemaJSON, shemaNaReda, strogObekt } from '../src/model/shema.js';

describe('валидаторът', () => {
  const sh = strogObekt({
    ime: { type: 'string', minLength: 1, maxLength: 5 },
    broy: { type: 'integer', minimum: 1 },
    vid: { type: 'string', enum: ['a', 'b'] },
    po: { type: ['string', 'null'], pattern: '^x' },
  });

  it('минава правилното · с null по избор', () => {
    expect(proveriPoShema(sh, { ime: 'Ана', broy: 2, vid: 'a', po: null })).toEqual([]);
  });

  it('казва какво липсва, какво е чуждо и какво е с грешен вид · с път', () => {
    const n = proveriPoShema(sh, { ime: 5, broy: 0, vid: 'c', po: 'y', drugo: 1 });
    expect(n).toEqual([
      'товарът.ime: очаква се string, а е integer.',
      'товарът.broy: най-малко 1.',
      'товарът.vid: „c" не е сред позволените (a · b).',
      'товарът.po: не е във вида, който се очаква.',
      'товарът: „drugo" не е познато поле.',
    ]);
    expect(proveriPoShema(sh, {})).toEqual([
      'товарът: липсва „ime".',
      'товарът: липсва „broy".',
      'товарът: липсва „vid".',
      'товарът: липсва „po".',
    ]);
  });

  it('число на мястото на цяло · масив с елементи · вложен път', () => {
    expect(proveriPoShema({ type: 'integer' }, 1.5)).toEqual([
      'товарът: очаква се integer, а е number.',
    ]);
    expect(proveriPoShema({ type: 'array', items: { type: 'integer' }, minItems: 1 }, [])).toEqual([
      'товарът: най-малко 1 елемента.',
    ]);
    expect(proveriPoShema({ type: 'array', items: { type: 'integer' } }, [1, 'x'])).toEqual([
      'товарът[1]: очаква се integer, а е string.',
    ]);
    expect(
      proveriPoShema(strogObekt({ a: strogObekt({ b: { type: 'boolean' } }) }), { a: { b: 1 } }),
    ).toEqual(['товарът.a.b: очаква се boolean, а е integer.']);
  });
});

/** Всички имена на полета в схема · рекурсивно · с пътя им. */
function poleta(sh: ShemaJSON, pat = ''): [string, ShemaJSON][] {
  const r: [string, ShemaJSON][] = [];
  for (const [k, v] of Object.entries(sh.properties ?? {})) {
    r.push([`${pat}.${k}`, v]);
    r.push(...poleta(v, `${pat}.${k}`));
  }
  if (sh.items !== undefined) r.push(...poleta(sh.items, `${pat}[]`));
  return r;
}

describe('полетата от прототипа НЕ хвърлят · отказват с думи', () => {
  /**
   * Строгата схема съществува, за да ОТКАЖЕ с думи (правило 12). Но голият
   * достъп `properties[klyuch]` вземаше от ПРОТОТИПА: `constructor`,
   * `toString`, `valueOf`, `hasOwnProperty` и `__proto__` връщаха ФУНКЦИЯ
   * вместо `undefined`, и проверката хвърляше `TypeError` вместо да откаже.
   *
   * Товарът идва от чужд `.xlsx` през Сверчика и от агента — тоест точно от
   * местата, където отказът трябва да е дума, не срив.
   */
  const sh = strogObekt({ ime: { type: 'string' } });

  it('всяко наследено име се ОТКАЗВА, а не хвърля', () => {
    const imena = ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__'];
    // първо БРОЯТ · празен списък би направил цикъла безсмислен (обход Г)
    expect(imena).toHaveLength(5);
    for (const ime of imena) {
      const tovar = JSON.parse(`{"ime":"а","${ime}":1}`) as unknown;
      const n = proveriPoShema(sh, tovar, 'товар');
      expect(n.join(' '), ime).toContain(`„${ime}" не е познато поле`);
    }
  });
});

describe('честност на каталога', () => {
  it('всяка схема е строга · обект · без непознати · всичко в required', () => {
    for (const k of KATALOG) {
      expect(k.shema.type, k.klyuch).toBe('object');
      expect(k.shema.additionalProperties, k.klyuch).toBe(false);
      expect(k.shema.required, k.klyuch).toEqual(Object.keys(k.shema.properties ?? {}));
    }
  });

  it('всяко поле `_st` е integer · парите са цели центове (правило 3)', () => {
    let broy = 0;
    for (const k of KATALOG) {
      for (const [pat, sh] of poleta(k.shema)) {
        if (!pat.endsWith('_st')) continue;
        broy += 1;
        const tip = typeof sh.type === 'string' ? [sh.type] : sh.type;
        expect(tip, `${k.klyuch}${pat}`).toContain('integer');
        expect(tip, `${k.klyuch}${pat}`).not.toContain('number');
      }
    }
    expect(broy).toBeGreaterThan(0);
  });

  it('схемите на редовете ИДВАТ от Модела', () => {
    const sazday = KATALOG.find((k) => k.klyuch === 'imoti.sazdayImot')!;
    expect(sazday.shema.properties?.['kletki']).toEqual(
      shemaNaReda(tablitsata(MODEL, 'imoti'), 'sazdavane'),
    );
    const obekt = KATALOG.find((k) => k.klyuch === 'imoti.dobaviObekt')!;
    expect(obekt.shema.properties?.['kletki']).toEqual(
      shemaNaReda(tablitsata(MODEL, 'obekti'), 'sazdavane'),
    );
    expect(Object.keys(obekt.shema.properties?.['kletki']?.properties ?? {})).not.toContain(
      'nomeratsiya',
    );
  });
});
