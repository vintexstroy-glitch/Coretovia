/**
 * ВНАСЯНЕТО · преводът предложение → команда е на каталога (всеки вид има точно
 * една команда · заместителят на Имот се заменя с id), пробването казва отказа
 * преди отметката, изпълнението спира при първия отказ и брои неопитаните,
 * а разписката се записва и при нула (правило 7).
 */

import { describe, expect, it } from 'vitest';
import { komandaZaPredlozhenie } from '../src/komandi/izpalnenie.js';
import { KATALOG } from '../src/komandi/katalog.js';
import { MODEL, NOMENKLATURA } from '../src/model/osnova.js';
import {
  PREDLOZHENIE,
  type Predlozhenie,
  VIDOVE_PREDLOZHENIYA,
} from '../src/model/predlozhenie.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import { izpalniPredlozheniyata, probvayPredlozheniyata } from '../src/porta/vnasyane.js';
import { KNIGA, knigaZaTest, STOPANIN } from './pomoshtni.js';

const KOGATO = '2026-09-05T16:00:00.000Z';
const idNa = (i: number): string => `vnos:${i}`;
const OBSHTO = { adres: 'A1', list: 'лист', zashto: '', poPodrazbirane: true, zavisiOt: [] };

async function otvori() {
  const k = knigaZaTest();
  let takt = 0;
  const iz = await Izpalnitel.otvori({
    vrata: k.vrata,
    dnevnik: k.dnevnik,
    model: MODEL,
    veriga: KNIGA,
    aktor: () => STOPANIN,
    sega: () => {
      takt += 1;
      return new Date(Date.parse(KOGATO) + takt * 1000).toISOString();
    },
  });
  const r = await iz.izpalni('k0', 'stopanin.otkriy', { imeyl: STOPANIN });
  if ('otkaz' in r) throw new Error(r.zashto.join(' '));
  return iz;
}

const PRAZEN = { plosht: null, tsena: null, papka: null, adres: null };

describe('преводът към команда', () => {
  it('всеки от седемте вида има ТОЧНО една команда · броят е пин', () => {
    expect(VIDOVE_PREDLOZHENIYA).toHaveLength(7);
    expect(PREDLOZHENIE).toBe('@predlozhenie:');
    const primeri: Predlozhenie[] = [
      { ...OBSHTO, vid: 'nova-stoynost', nomenklatura: 'x', tekst: 'a', belezi: {}, nomer: 1 },
      {
        ...OBSHTO,
        vid: 'preimenuvana',
        nomenklatura: 'x',
        nomer: 1,
        belezi: {},
        tekst: 'a',
        bilo: 'b',
      },
      { ...OBSHTO, vid: 'spryana', nomenklatura: 'x', nomer: 1, belezi: {}, tekst: 'a' },
      { ...OBSHTO, vid: 'varnata', nomenklatura: 'x', nomer: 1, belezi: {}, tekst: 'a' },
      { ...OBSHTO, vid: 'nov-red', tablitsa: 'imoti', kletki: {}, nomerVKnigata: null },
      { ...OBSHTO, vid: 'popravka', tablitsa: 'imoti', id: 'imot:1', kletki: {}, razliki: [] },
      { ...OBSHTO, vid: 'izklyuchi', tablitsa: 'imoti', id: 'imot:1' },
    ];
    expect(primeri.map((p) => p.vid)).toEqual([...VIDOVE_PREDLOZHENIYA]);
    const klyuchove = primeri.map((p) => {
      const kazvat = KATALOG.filter(
        (k) => k.otPredlozhenie?.(p, idNa) !== null && k.otPredlozhenie !== undefined,
      );
      expect(kazvat, p.vid).toHaveLength(1);
      return komandaZaPredlozhenie(p, idNa)?.klyuch;
    });
    expect(klyuchove).toEqual([
      'nastroyki.dobaviStoynost',
      'nastroyki.preimenuvayStoynost',
      'nastroyki.spriStoynost',
      'nastroyki.varniStoynost',
      'imoti.sazdayImot',
      'red.popraviKletka',
      'red.izklyuchi',
    ]);
    // трите таблици на прозореца · три команди за нов ред
    for (const [tablitsa, klyuch] of [
      ['obekti', 'imoti.dobaviObekt'],
      ['biznesi', 'imoti.dobaviBiznes'],
    ] as const) {
      expect(
        komandaZaPredlozhenie(
          { ...OBSHTO, vid: 'nov-red', tablitsa, kletki: {}, nomerVKnigata: null },
          idNa,
        )?.klyuch,
      ).toBe(klyuch);
    }
  });

  it('новият ред носи ВСИЧКИ колони (липсващите са null) · заместителят на Имот става id', () => {
    const k = komandaZaPredlozhenie(
      {
        ...OBSHTO,
        vid: 'nov-red',
        tablitsa: 'obekti',
        kletki: { imot: { tekst: `${PREDLOZHENIE}4` }, nomer: { chislo: 1 } },
        nomerVKnigata: null,
        zavisiOt: [4],
      },
      idNa,
    );
    const tovar = k?.tovar as { kletki: Record<string, unknown> };
    expect(k?.klyuch).toBe('imoti.dobaviObekt');
    expect(tovar.kletki).toMatchObject({ imot: { tekst: 'imot:vnos:4' }, nomer: { chislo: 1 } });
    expect(Object.keys(tovar.kletki).sort()).toEqual(
      ['adres', 'imot', 'kategoriya', 'nomer', 'papka', 'plosht', 'tsena', 'vid'].sort(),
    );
    for (const kl of ['kategoriya', 'vid', 'plosht', 'tsena', 'papka', 'adres'])
      expect(tovar.kletki[kl]).toBeNull();
    const p = komandaZaPredlozhenie(
      {
        ...OBSHTO,
        vid: 'popravka',
        tablitsa: 'biznesi',
        id: 'biznes:1',
        kletki: { imot: { tekst: `${PREDLOZHENIE}2` } },
        razliki: [],
        zavisiOt: [2],
      },
      idNa,
    );
    expect(p?.tovar).toEqual({
      tablitsa: 'biznesi',
      id: 'biznes:1',
      kletki: { imot: { tekst: 'imot:vnos:2' } },
    });
  });
});

describe('пробването и изпълнението', () => {
  it('пробата казва отказа преди отметката · зависимото не се пробва', async () => {
    const iz = await otvori();
    const predlozheniya: Predlozhenie[] = [
      {
        ...OBSHTO,
        vid: 'nova-stoynost',
        nomenklatura: NOMENKLATURA.sastoyanieNaImot,
        tekst: 'УПИ',
        belezi: {},
        nomer: 4,
      },
      {
        ...OBSHTO,
        vid: 'nov-red',
        tablitsa: 'imoti',
        kletki: { ime: { tekst: 'Панчарево' }, sastoyanie: { nomer: 2 } },
        nomerVKnigata: null,
      },
      {
        ...OBSHTO,
        vid: 'nov-red',
        tablitsa: 'obekti',
        kletki: {
          imot: { tekst: `${PREDLOZHENIE}1:imot` },
          kategoriya: { nomer: 1 },
          vid: { nomer: 1 },
          nomer: { chislo: 1 },
        },
        nomerVKnigata: null,
        zavisiOt: [1],
      },
    ];
    const probi = probvayPredlozheniyata(iz, predlozheniya, idNa);
    expect(probi.map((p) => [p.probvano, p.otkaz?.join(' ') ?? null])).toEqual([
      [true, '„УПИ" вече е в „Състояние на Имот" (№ 2).'],
      [true, null],
      [false, null],
    ]);
    expect(iz.ogledalo().broySabitiya).toBe(1);
  });

  it('спира при първия отказ · неопитаните се броят · същите ключове после = повторено', async () => {
    const iz = await otvori();
    const predlozheniya: Predlozhenie[] = [
      {
        ...OBSHTO,
        vid: 'nov-red',
        tablitsa: 'imoti',
        kletki: { ime: { tekst: 'Панчарево' }, sastoyanie: { nomer: 2 }, ...PRAZEN, nomer: null },
        nomerVKnigata: null,
      },
      {
        ...OBSHTO,
        vid: 'nova-stoynost',
        nomenklatura: NOMENKLATURA.sastoyanieNaImot,
        tekst: 'УПИ',
        belezi: {},
        nomer: 4,
      },
      {
        ...OBSHTO,
        vid: 'nov-red',
        tablitsa: 'obekti',
        kletki: {
          imot: { tekst: `${PREDLOZHENIE}0` },
          kategoriya: { nomer: 1 },
          vid: { nomer: 1 },
          nomer: { chislo: 1 },
          ...PRAZEN,
        },
        nomerVKnigata: null,
        zavisiOt: [0],
      },
      {
        ...OBSHTO,
        vid: 'nov-red',
        tablitsa: 'obekti',
        kletki: {
          imot: { tekst: `${PREDLOZHENIE}5` },
          kategoriya: { nomer: 1 },
          vid: { nomer: 1 },
          nomer: { chislo: 2 },
          ...PRAZEN,
        },
        nomerVKnigata: null,
        zavisiOt: [5],
      },
    ];
    const r = await izpalniPredlozheniyata(iz, predlozheniya, new Set([0, 1, 2, 3]), idNa, KOGATO);
    expect([r.izbrani, r.prieti, r.povtoreni]).toEqual([4, 1, 0]);
    expect(r.otkaz?.indeks).toBe(1);
    expect(r.neopitani).toEqual([2, 3]);
    expect(r.propusnati).toEqual([]);
    expect(r.sverka.nared).toBe(true);
    expect([...r.sastoyaniya.entries()]).toEqual([
      [0, 'priet'],
      [1, 'otkazan'],
      [2, 'neopitan'],
      [3, 'neopitan'],
    ]);
    // човекът маха отказаното и натиска пак · същите ключове · нищо не се дублира
    const pak = await izpalniPredlozheniyata(iz, predlozheniya, new Set([0, 2, 3]), idNa, KOGATO);
    expect([pak.izbrani, pak.prieti, pak.povtoreni, pak.otkaz]).toEqual([3, 1, 1, null]);
    expect(pak.propusnati).toEqual([3]); // зависи от № 5, което го няма
    expect(pak.sverka.nared).toBe(true);
    const o = iz.ogledalo();
    expect(o.tablitsi.get('imoti')!.broy).toBe(1);
    expect(o.tablitsi.get('obekti')!.broy).toBe(1);
    expect(o.tablitsi.get('obekti')!.indeks.has('obekt:vnos:2')).toBe(true);
  });

  it('номерът на новата стойност се сверява при изпълнение · разминал се → отказ с думи, не друга дума', async () => {
    const iz = await otvori();
    const predlozheniya: Predlozhenie[] = [
      {
        ...OBSHTO,
        vid: 'nova-stoynost',
        nomenklatura: NOMENKLATURA.sastoyanieNaImot,
        tekst: 'Продаден',
        belezi: {},
        nomer: 4,
      },
      {
        ...OBSHTO,
        vid: 'nov-red',
        tablitsa: 'imoti',
        kletki: { ime: { tekst: 'Панчарево' }, sastoyanie: { nomer: 4 }, ...PRAZEN, nomer: null },
        nomerVKnigata: null,
        zavisiOt: [0],
      },
    ];
    // междувременно друг раздел е добавил „Наследство" · „Продаден" вече ще стане № 5
    const r0 = await iz.izpalni('drug', 'nastroyki.dobaviStoynost', {
      nomenklatura: NOMENKLATURA.sastoyanieNaImot,
      tekst: 'Наследство',
      belezi: {},
    });
    expect('otkaz' in r0).toBe(false);
    const r = await izpalniPredlozheniyata(iz, predlozheniya, new Set([0, 1]), idNa, KOGATO);
    expect([r.prieti, r.otkaz?.indeks]).toEqual([1, 1]);
    expect(r.otkaz?.zashto).toEqual([
      '„Продаден" не е № 4 в „Състояние на Имот" — номерът се е разминал; прочети Книгата пак.',
    ]);
    expect(iz.ogledalo().tablitsi.get('imoti')!.broy).toBe(0);
  });

  it('разписката се записва и при нула · втора за същия файл е следващ rev, не повторение', async () => {
    const iz = await otvori();
    const tovar = {
      otpechatakNaFayla: 'abcdef0123456789',
      iznesenoNa: '',
      kursorSeqNaIznosa: 0,
      predlozheni: 0,
      izbrani: 0,
      prieti: 0,
      otkazani: 0,
      nahodki: 0,
      vnesenoNa: KOGATO,
    };
    const r1 = await iz.izpalni('r1', 'kniga.vnesi', tovar);
    expect('otkaz' in r1).toBe(false);
    const r2 = await iz.izpalni('r2', 'kniga.vnesi', {
      ...tovar,
      predlozheni: 3,
      izbrani: 2,
      prieti: 2,
    });
    expect('otkaz' in r2).toBe(false);
    expect(iz.ogledalo().vnasyaniya.map((v) => [v.predlozheni, v.prieti])).toEqual([
      [0, 0],
      [3, 2],
    ]);
    const lazha = await iz.izpalni('r3', 'kniga.vnesi', {
      ...tovar,
      predlozheni: 3,
      izbrani: 1,
      prieti: 2,
    });
    expect('otkaz' in lazha && lazha.zashto[0]).toBe(
      'Приетите и отказаните не могат да са повече от избраните.',
    );
  });
});
