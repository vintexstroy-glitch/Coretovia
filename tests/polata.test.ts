/**
 * ПОЛЕТАТА С ЦИФРИ на Управление · осемте, от ляво надясно · сметнати от Огледалото.
 *
 * Негово (05.09 т.2): „полета с цифр и информация … от ляво на дясно най главните
 * и важни." Сверката: отворени + просрочени = всички задачи.
 */

import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/model/osnova.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import {
  DNI_V_SEDMITSATA,
  nomerNaSpeshnoto,
  poletataNaUpravlenie,
  SPESHNO_I_VAZHNO,
} from '../src/smetach/polata.js';
import { KNIGA, knigaZaTest, STOPANIN } from './pomoshtni.js';

const KOGATO = '2026-09-05T13:00:00.000Z';
const DNES = '2026-09-05';
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
  await zapishi('i1', 'imoti.sazdayImot', {
    kletki: { ime: { tekst: 'Герман' }, sastoyanie: { nomer: 1 }, nomer: null, ...PRAZEN },
  });
  await zapishi('o1', 'imoti.dobaviObekt', {
    kletki: {
      imot: { tekst: 'imot:i1' },
      kategoriya: { nomer: 1 },
      vid: { nomer: 1 },
      nomer: { chislo: 1 },
      ...PRAZEN,
    },
  });
  const zadacha = (id: string, kletki: Record<string, unknown>) =>
    zapishi(id, 'upravlenie.dobaviZadacha', {
      kletki: {
        kam: { tekst: 'imot:i1' },
        vid: { nomer: 1 },
        ime: { tekst: id },
        ot: null,
        do: null,
        otsenka: null,
        byudzhet: null,
        ...kletki,
      },
    });
  // спешна и отворена, с бюджет · просрочена · тази седмица (точно 6 дни) · без край · след седмицата
  await zadacha('z1', {
    otsenka: { nomer: 1 },
    do: { tekst: '2026-09-20' },
    byudzhet: { stoynost_st: 25000000 },
  });
  await zadacha('z2', {
    ot: { tekst: '2026-08-01' },
    do: { tekst: '2026-09-04' },
    byudzhet: { stoynost_st: 100 },
  });
  await zadacha('z3', { do: { tekst: '2026-09-11' } });
  await zadacha('z4', {});
  await zadacha('z5', { do: { tekst: '2026-09-12' }, byudzhet: { stoynost_st: 5000 } });
  return iz.ogledalo();
}

describe('полетата с цифри', () => {
  it('„Спешно и Важно" е негова дума и стои с № 1 в Оценка · седмицата е седем дни', async () => {
    expect(SPESHNO_I_VAZHNO).toBe('Спешно и Важно');
    expect(DNI_V_SEDMITSATA).toBe(7);
    expect(nomerNaSpeshnoto(await ogledalo())).toBe(1);
  });

  it('осемте полета от ляво надясно · с числата от Огледалото · бюджетът е цели центове', async () => {
    const p = poletataNaUpravlenie(await ogledalo(), DNES, KOGATO);
    expect(p.poleta.map((x) => [x.klyuch, x.stoynost, x.vid])).toEqual([
      ['speshni', 1, 'broy'],
      ['prosrocheni', 1, 'broy'],
      ['tazi-sedmitsa', 1, 'broy'],
      ['otvoreni', 4, 'broy'],
      ['byudzhet', 25005000, 'evro'],
      ['imoti', 1, 'broy'],
      ['obekti', 1, 'broy'],
      ['biznesi', 0, 'broy'],
    ]);
    expect(p.poleta.map((x) => x.ime)).toEqual([
      'Спешно и Важно',
      'просрочени',
      'тази седмица',
      'отворени задачи',
      'Бюджет Дела',
      'Имоти',
      'Обекти',
      'Бизнеси',
    ]);
  });

  it('сверката · отворени + просрочени = всички · и при празно Огледало', async () => {
    const p = poletataNaUpravlenie(await ogledalo(), DNES, KOGATO);
    expect(p.sverka.nared).toBe(true);
    expect(p.sverka.vhod).toBe(5);
    const k = knigaZaTest();
    const iz = await Izpalnitel.otvori({
      vrata: k.vrata,
      dnevnik: k.dnevnik,
      model: MODEL,
      veriga: KNIGA,
      aktor: () => STOPANIN,
      sega: () => KOGATO,
    });
    const prazno = poletataNaUpravlenie(iz.ogledalo(), DNES, KOGATO);
    expect(prazno.poleta.map((x) => x.stoynost)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(prazno.sverka.nared).toBe(true);
  });
});
