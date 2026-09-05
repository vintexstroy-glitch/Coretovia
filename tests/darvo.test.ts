/**
 * ДЪРВОТО · Имот → Обект/Бизнес → Задача · в реда на номерацията (ADR-005).
 *
 * Неговият лист (A20–E36): под всеки Имот стоят Обектите и Бизнесите му по
 * номерация, задачите — под реда, към който са. Сверката: редове в дървото =
 * родители + задачи с жив родител; сирак = задача без жив родител, казва се.
 */

import { describe, expect, it } from 'vitest';
import { MODEL, NOMENKLATURA } from '../src/model/osnova.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import { TIP } from '../src/sabitiya/registar.js';
import { darvoto } from '../src/smetach/darvo.js';
import { tekstNaNomera } from '../src/smetach/nomeratsiya.js';
import { KNIGA, knigaZaTest, STOPANIN } from './pomoshtni.js';

const KOGATO = '2026-09-05T13:00:00.000Z';
const PRAZEN = { plosht: null, tsena: null, papka: null, adres: null };

async function ogledalo() {
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
  const zapishi = async (id: string, klyuch: string, tovar: unknown) => {
    const r = await iz.izpalni(id, klyuch, tovar);
    if ('otkaz' in r) throw new Error(r.zashto.join(' | '));
  };
  await zapishi('k0', 'stopanin.otkriy', { imeyl: STOPANIN });
  const imot = (id: string, ime: string) =>
    zapishi(id, 'imoti.sazdayImot', {
      kletki: { ime: { tekst: ime }, sastoyanie: { nomer: 2 }, nomer: null, ...PRAZEN },
    });
  await imot('i1', 'Герман');
  await imot('i2', 'Студентски Град');
  const obekt = (id: string, imot: string, kategoriya: number, vid: number, nomer: number) =>
    zapishi(id, 'imoti.dobaviObekt', {
      kletki: {
        imot: { tekst: imot },
        kategoriya: { nomer: kategoriya },
        vid: { nomer: vid },
        nomer: { chislo: nomer },
        ...PRAZEN,
      },
    });
  // нарочно в обратен ред на номерацията
  await obekt('o27', 'imot:i2', 1, 1, 27);
  await obekt('o1', 'imot:i2', 1, 1, 1);
  await obekt('p20', 'imot:i2', 2, 1, 20);
  await zapishi('b1', 'imoti.dobaviBiznes', {
    kletki: {
      imot: { tekst: 'imot:i2' },
      sastoyanie: { nomer: 1 },
      nomer: { chislo: 1 },
      ...PRAZEN,
      drugi: null,
    },
  });
  const zadacha = (id: string, kam: string, ime: string, ot: string | null) =>
    zapishi(id, 'upravlenie.dobaviZadacha', {
      kletki: {
        kam: { tekst: kam },
        vid: { nomer: 1 },
        ime: { tekst: ime },
        ot: ot === null ? null : { tekst: ot },
        do: null,
        otsenka: null,
        byudzhet: null,
        otgovornik: null,
      },
    });
  await zadacha('z1', 'obekt:o27', 'СМР', '2026-09-10');
  await zadacha('z2', 'obekt:o27', 'Чистене', '2026-09-01');
  await zadacha('z3', 'imot:i1', 'Сондаж', null);
  await zadacha('z4', 'biznes:b1', 'ЕРМ Запад', null);
  await zadacha('z5', 'imot:i2', 'Без дата', null);
  return iz.ogledalo();
}

describe('дървото', () => {
  it('Имот → задачите му → Обектите и Бизнесите по номерация, всеки със задачите си по начало', async () => {
    const d = darvoto(await ogledalo());
    const opis = d.redove.map((r) =>
      r.vid === 'roditel' ? `${r.nivo}:${r.tablitsa}:${tekstNaNomera(r.nomer)}` : `z:${r.id}`,
    );
    expect(opis).toEqual([
      '0:imoti:1',
      'z:zadacha:z3',
      '0:imoti:2',
      'z:zadacha:z5',
      '1:obekti:2.1.1.1',
      '1:obekti:2.1.1.27',
      'z:zadacha:z2', // 2026-09-01 преди 2026-09-10
      'z:zadacha:z1',
      '1:obekti:2.2.1.20',
      '1:biznesi:2.3.1',
      'z:zadacha:z4',
    ]);
    expect(d.broyRoditeli).toBe(6);
    expect(d.broyZadachi).toBe(5);
    expect(d.siratsi).toEqual([]);
    expect(d.redove).toHaveLength(d.broyRoditeli + d.broyZadachi);
  });

  it('задачата носи родителя си · таблица и id · за екрана и за Книгата', async () => {
    const d = darvoto(await ogledalo());
    const z1 = d.redove.find((r) => r.vid === 'zadacha' && r.id === 'zadacha:z1');
    expect(z1?.vid === 'zadacha' && [z1.roditelTablitsa, z1.roditelId]).toEqual([
      'obekti',
      'obekt:o27',
    ]);
  });

  it('задача без жив родител е СИРАК · казва се, не се крие', async () => {
    const k = knigaZaTest();
    await k.otkriy();
    await k.zapishi(
      TIP.stoynostZapisana,
      { vid: 'nomenklatura', id: NOMENKLATURA.vidNaZadacha },
      { nomenklatura: NOMENKLATURA.vidNaZadacha, nomer: 1, tekst: 'Дело', belezi: {} },
    );
    await k.zapishi(
      TIP.redZapisan,
      { vid: 'zadacha', id: 'zadacha:s' },
      {
        tablitsa: 'zadachi',
        id: 'zadacha:s',
        kletki: { kam: { tekst: 'imot:nyama' }, vid: { nomer: 1 }, ime: { tekst: 'сирак' } },
      },
    );
    const o = fold(await k.dnevnik.chetiVsichki(KNIGA), MODEL, KOGATO);
    const d = darvoto(o);
    expect(d.redove).toEqual([]);
    expect(d.siratsi).toEqual([0]);
    expect(d.broyZadachi).toBe(0);
  });
});
