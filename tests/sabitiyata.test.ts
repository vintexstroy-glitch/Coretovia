/**
 * РЕГИСТЪРЪТ НА СЪБИТИЯТА · седем типа, всеки с проверка и четец, и проверката
 * на товара казва с думи какво не е наред (правило 12).
 */

import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/model/osnova.js';
import { CHETTSI } from '../src/ogledalo/chettsi.js';
import { proveriTovar, SABITIYA, TIP } from '../src/sabitiya/registar.js';
import { eKletka, slotNaKletka } from '../src/model/kletka.js';

describe('регистърът', () => {
  it('седем типа · всеки с проверка И четец · броят е пин', () => {
    const tipove = Object.values(TIP).sort();
    expect(tipove).toHaveLength(7);
    expect(Object.keys(SABITIYA).sort()).toEqual(tipove);
    expect(Object.keys(CHETTSI).sort()).toEqual(tipove);
  });

  it('непознат тип и не-обект са сами по себе си находки', () => {
    expect(proveriTovar('НещоНепознато', {}, MODEL)).toEqual([
      'Непознат тип събитие „НещоНепознато".',
    ]);
    expect(proveriTovar(TIP.redZapisan, 'текст', MODEL)).toEqual(['Товарът трябва да е обект.']);
  });
});

describe('РедЗаписан · клетката е точно един слот по вида на колоната', () => {
  const red = (
    kletki: Record<string, unknown>,
    tablitsa = 'imoti',
    id = 'imot:1',
  ): readonly string[] => proveriTovar(TIP.redZapisan, { tablitsa, id, kletki }, MODEL);

  it('правилният товар минава · с празнене (null) включително', () => {
    expect(
      red({
        ime: { tekst: 'Студентски Град' },
        sastoyanie: { nomer: 2 },
        tsena: { stoynost_st: 300000 },
        papka: null,
      }),
    ).toEqual([]);
    expect(
      red(
        {
          imot: { tekst: 'imot:1' },
          kategoriya: { nomer: 1 },
          vid: { nomer: 1 },
          nomer: { chislo: 27 },
        },
        'obekti',
        'obekt:1',
      ),
    ).toEqual([]);
  });

  it('непозната колона · затворена колона · грешен слот · два слота', () => {
    expect(red({ nyama: { tekst: 'x' } })).toEqual(['Таблица „imoti" няма колона „nyama".']);
    expect(red({ nomeratsiya: { tekst: '3' } })[0]).toMatch(/затворена/);
    expect(red({ tsena: { chislo: 5 } })[0]).toBe(
      'Колона „цена" носи „stoynost_st", а клетката е „chislo".',
    );
    expect(red({ ime: { tekst: 'a', chislo: 1 } })[0]).toMatch(/точно един слот/);
  });

  it('парите са цели центове · номерът е ≥ 1 · текстът е текст', () => {
    expect(red({ tsena: { stoynost_st: 12.5 } })[0]).toMatch(/точно един слот/);
    expect(red({ sastoyanie: { nomer: 0 } })[0]).toMatch(/точно един слот/);
    expect(red({ ime: { tekst: 5 } })[0]).toMatch(/точно един слот/);
  });

  it('връзката сочи ред от правилната таблица · id-то е от вида на таблицата', () => {
    expect(red({ imot: { tekst: 'obekt:9' } }, 'obekti', 'obekt:1')[0]).toBe(
      'Връзката „име Имот" трябва да сочи ред от „imoti".',
    );
    expect(red({}, 'obekti', 'imot:1')[0]).toBe('Редът „imot:1" не е от вида „obekt".');
    expect(red({}, 'nyama', 'x:1')[0]).toBe('Няма таблица „nyama" в Модела.');
  });
});

describe('останалите товари', () => {
  it('стойност на номенклатура · по белег иска белега', () => {
    expect(
      proveriTovar(
        TIP.stoynostZapisana,
        { nomenklatura: 'vid-na-obekt', nomer: 7, tekst: 'ателие', belezi: {} },
        MODEL,
      ),
    ).toEqual(['„Вид на обект" се номерира по „kategoriya" — белегът липсва.']);
    expect(
      proveriTovar(
        TIP.stoynostZapisana,
        { nomenklatura: 'vid-na-obekt', nomer: 7, tekst: 'ателие', belezi: { kategoriya: 1 } },
        MODEL,
      ),
    ).toEqual([]);
    expect(
      proveriTovar(
        TIP.stoynostSpryana,
        { nomenklatura: 'nyama', nomer: 1, spryana: true, belezi: {} },
        MODEL,
      ),
    ).toEqual(['Няма номенклатура „nyama" в Модела.']);
  });

  it('стопанин с имейл · сторно с причина · книга с курсор', () => {
    expect(proveriTovar(TIP.stopaninZapisan, { imeyl: 'без-кльомба' }, MODEL)).toHaveLength(1);
    expect(proveriTovar(TIP.storno, { pogasyavaSeq: 3, prichina: '' }, MODEL)).toEqual([
      'Сторното иска причина.',
    ]);
    expect(proveriTovar(TIP.storno, { pogasyavaSeq: 3, prichina: 'грешен ред' }, MODEL)).toEqual(
      [],
    );
    expect(
      proveriTovar(
        TIP.knigaIznesena,
        {
          otpechatak: 'x',
          kursor: { naematel: 'k', seq: 3, hash: 'h' },
          redove: { imoti: 2 },
          iznesenoNa: 't',
        },
        MODEL,
      ),
    ).toEqual([]);
    expect(
      proveriTovar(TIP.knigaIznesena, { otpechatak: 'x', redove: {}, iznesenoNa: 't' }, MODEL),
    ).toEqual(['Липсва курсорът.']);
  });
});

describe('клетката', () => {
  it('точно един от четирите ключа · с правилния вид стойност', () => {
    expect(eKletka({ tekst: 'а' })).toBe(true);
    expect(eKletka({ tekst: '' })).toBe(false);
    expect(eKletka({ chislo: -3 })).toBe(true);
    expect(eKletka({ stoynost_st: 0 })).toBe(true);
    expect(eKletka({ nomer: 1 })).toBe(true);
    expect(eKletka({ nomer: 0 })).toBe(false);
    expect(eKletka({ chislo: 1.5 })).toBe(false);
    expect(eKletka({})).toBe(false);
    expect(eKletka({ tekst: 'a', nomer: 1 })).toBe(false);
    expect(eKletka({ drugo: 1 })).toBe(false);
    expect(eKletka(null)).toBe(false);
    expect(slotNaKletka({ stoynost_st: 5 })).toBe('stoynost_st');
  });
});
