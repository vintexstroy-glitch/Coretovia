/**
 * МОДЕЛИТЕ НА ЕКРАНА · неговите „Отвори" и „Запази" (ADR-014).
 *
 * Негово: „Запази(записваш експерименталния модел за периоди напред)" ·
 * „Отвори(запазен по рано модел или таблица за създаване на празна таблица…)".
 *
 * Тук се пази, че моделът е ИМЕНУВАН поглед, не данни; че второто записване под
 * същото име ПОПРАВЯ, а не дублира; и че махнатият остава в Журнала, но спира да
 * се предлага (правило 1).
 */

import { describe, expect, it } from 'vitest';
import { eOtkaz } from '../src/komandi/izpalnenie.js';
import { MODEL } from '../src/model/osnova.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import { KNIGA, knigaZaTest, STOPANIN } from './pomoshtni.js';

const KOGATO = '2026-09-06T14:00:00.000Z';

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
  const zapishi = async (id: string, klyuch: string, tovar: unknown) => {
    const r = await iz.izpalni(id, klyuch, tovar);
    if ('otkaz' in r) throw new Error(r.zashto.join(' | '));
    return r;
  };
  await zapishi('k0', 'stopanin.otkriy', { imeyl: STOPANIN });
  return { iz, zapishi };
}

const MESECHEN = {
  prozorets: 'upravlenie',
  ime: 'Месечен преглед',
  snimka: { 'upravlenie.takt': 'mesets', 'upravlenie.skriyDela': true },
};

describe('моделът е ИМЕНУВАН поглед', () => {
  it('записва се и се чете от Огледалото · с прозореца и името си', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi('m1', 'ekran.zapaziModel', MESECHEN);
    const m = iz.ogledalo().modeli;
    expect(m).toHaveLength(1);
    expect([m[0]?.prozorets, m[0]?.ime]).toEqual(['upravlenie', 'Месечен преглед']);
    expect(m[0]?.snimka).toEqual(MESECHEN.snimka);
  });

  it('второто записване под СЪЩОТО име ПОПРАВЯ, не дублира', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi('m1', 'ekran.zapaziModel', MESECHEN);
    await zapishi('m2', 'ekran.zapaziModel', {
      ...MESECHEN,
      snimka: { 'upravlenie.takt': 'godina' },
    });
    const m = iz.ogledalo().modeli;
    expect(m).toHaveLength(1);
    expect(m[0]?.snimka).toEqual({ 'upravlenie.takt': 'godina' });
  });

  it('един прозорец не вижда моделите на друг', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi('m1', 'ekran.zapaziModel', MESECHEN);
    await zapishi('m2', 'ekran.zapaziModel', {
      prozorets: 'smetki',
      ime: 'Месечен преглед',
      snimka: { 'smetki.podtab': 'nap' },
    });
    const m = iz.ogledalo().modeli;
    expect(m.map((x) => x.prozorets)).toEqual(['upravlenie', 'smetki']);
    expect(m.filter((x) => x.prozorets === 'upravlenie')).toHaveLength(1);
  });

  it('МАХНАТИЯТ остава в Журнала, но спира да се предлага (правило 1)', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi('m1', 'ekran.zapaziModel', MESECHEN);
    await zapishi('m2', 'ekran.mahniModel', { ...MESECHEN, snimka: {} });
    const m = iz.ogledalo().modeli;
    expect(m).toHaveLength(1);
    expect(m[0]?.izklyuchen).toBe(true);
    // снимката се ПАЗИ · махнатият модел може да се върне със същия запис
    expect(m[0]?.snimka).toEqual(MESECHEN.snimka);
  });

  it('празното име и празната снимка се ОТКАЗВАТ с думи', async () => {
    const { iz } = await otvori();
    const otkaz = (tovar: unknown) => {
      const r = iz.probvay('x', 'ekran.zapaziModel', tovar);
      return eOtkaz(r) ? r.zashto.join(' ') : 'мина, а не биваше';
    };
    expect(otkaz({ ...MESECHEN, ime: '  ' })).toMatch(/Моделът иска име/);
    expect(otkaz({ ...MESECHEN, snimka: {} })).toMatch(/няма какво да се запази/);
    expect(otkaz({ ...MESECHEN, prozorets: 'нямаго' })).toMatch(/prozorets/);
  });

  it('махането на несъществуващ модел се ОТКАЗВА, вместо да мине тихо', async () => {
    const { iz } = await otvori();
    const r = iz.probvay('x', 'ekran.mahniModel', { ...MESECHEN, snimka: {} });
    expect(eOtkaz(r) ? r.zashto.join(' ') : '').toMatch(/Няма модел „Месечен преглед"/);
  });
});
