/**
 * ОТГОВОРНИКЪТ на задачата и ПРОГРАМАТА за Задачи (ADR-009).
 *
 * Негово, 05.09: „Да се добави отговорник за всяка задача." Оттам двете числа в
 * неговия A23 („днешни задачи" · „седмични задачи в таблица") се СМЯТАТ, вместо
 * да чакат дума.
 *
 * ДНЕШНА е задачата, чийто период покрива днес; СЕДМИЧНА — тази, която покрива
 * поне един ден от седмицата (понеделник–неделя). Задача без начало не се брои:
 * тя няма кога да е.
 */

import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/model/osnova.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import { nachaloNaSedmitsata, programata } from '../src/smetach/programa.js';
import { KNIGA, knigaZaTest, STOPANIN } from './pomoshtni.js';

const KOGATO = '2026-09-09T10:00:00.000Z';
/** 09.09.2026 е СРЯДА · седмицата ѝ е 07.09 (пон) – 13.09 (нед) */
const DNES = '2026-09-09';

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
  await zapishi('s1', 'sluzhiteli.dobaviSluzhitel', {
    kletki: {
      ime: { tekst: 'Помощникът' },
      telefon: null,
      imeyl: { tekst: 'pomoshtnik@example.bg' },
      adres: null,
      dlazhnost: { nomer: 3 },
    },
  });
  await zapishi('i1', 'imoti.sazdayImot', {
    kletki: {
      ime: { tekst: 'Герман' },
      sastoyanie: { nomer: 1 },
      nomer: null,
      plosht: null,
      tsena: null,
      papka: null,
      adres: null,
    },
  });
  return { iz, zapishi };
}

const zadacha = (ot: string | null, doo: string | null, otgovornik: string | null) => ({
  kletki: {
    kam: { tekst: 'imot:i1' },
    vid: { nomer: 1 },
    ime: { tekst: 'Сондаж' },
    ot: ot === null ? null : { tekst: ot },
    do: doo === null ? null : { tekst: doo },
    otsenka: null,
    byudzhet: null,
    otgovornik: otgovornik === null ? null : { tekst: otgovornik },
  },
});

describe('седмицата почва в понеделник', () => {
  it('всеки ден от една седмица дава един и същ понеделник · неделята е нейният край', () => {
    // 07.09.2026 е понеделник · 13.09 е неделя
    for (const den of ['2026-09-07', '2026-09-09', '2026-09-13'])
      expect(nachaloNaSedmitsata(den)).toBe('2026-09-07');
    expect(nachaloNaSedmitsata('2026-09-14')).toBe('2026-09-14');
    expect(nachaloNaSedmitsata('2026-09-06')).toBe('2026-08-31');
  });
});

describe('програмата за задачи', () => {
  it('без нито една задача · всеки човек стои с нули (празният ред е отговор)', async () => {
    const { iz } = await otvori();
    const p = programata(iz.ogledalo(), DNES);
    expect(p.redove.map((r) => [r.ime, r.dneshni, r.sedmichni])).toEqual([['Помощникът', 0, 0]]);
    expect([p.broyZadachi, p.bezOtgovornik, p.kamNezhivi]).toEqual([0, 0, 0]);
  });

  it('днешната се брои и в двете · седмичната само в седмичната', async () => {
    const { iz, zapishi } = await otvori();
    const kam = iz.ogledalo().tablitsi.get('sluzhiteli')!.id[0]!;
    // покрива днес (сряда)
    await zapishi('z1', 'upravlenie.dobaviZadacha', zadacha('2026-09-08', '2026-09-10', kam));
    // само петък · същата седмица
    await zapishi('z2', 'upravlenie.dobaviZadacha', zadacha('2026-09-11', null, kam));
    // следващата седмица · никъде
    await zapishi('z3', 'upravlenie.dobaviZadacha', zadacha('2026-09-16', '2026-09-17', kam));
    const r = programata(iz.ogledalo(), DNES).redove[0]!;
    expect([r.dneshni, r.sedmichni, r.vsichki]).toEqual([1, 2, 3]);
  });

  it('един ден · началото без край е задача за този ден', async () => {
    const { iz, zapishi } = await otvori();
    const kam = iz.ogledalo().tablitsi.get('sluzhiteli')!.id[0]!;
    await zapishi('z1', 'upravlenie.dobaviZadacha', zadacha(DNES, null, kam));
    const r = programata(iz.ogledalo(), DNES).redove[0]!;
    expect([r.dneshni, r.sedmichni]).toEqual([1, 1]);
  });

  it('задача БЕЗ начало не се брои никъде · и БЕЗ отговорник се КАЗВА', async () => {
    const { iz, zapishi } = await otvori();
    const kam = iz.ogledalo().tablitsi.get('sluzhiteli')!.id[0]!;
    await zapishi('z1', 'upravlenie.dobaviZadacha', zadacha(null, null, kam));
    await zapishi('z2', 'upravlenie.dobaviZadacha', zadacha(DNES, null, null));
    const p = programata(iz.ogledalo(), DNES);
    expect([p.redove[0]?.dneshni, p.redove[0]?.sedmichni, p.redove[0]?.vsichki]).toEqual([0, 0, 1]);
    expect([p.broyZadachi, p.bezOtgovornik]).toEqual([2, 1]);
  });

  it('изключеният човек не е ред · задачите му се БРОЯТ отделно, не изчезват', async () => {
    const { iz, zapishi } = await otvori();
    const kam = iz.ogledalo().tablitsi.get('sluzhiteli')!.id[0]!;
    await zapishi('z1', 'upravlenie.dobaviZadacha', zadacha(DNES, null, kam));
    await zapishi('x1', 'red.izklyuchi', { tablitsa: 'sluzhiteli', id: kam });
    const p = programata(iz.ogledalo(), DNES);
    expect(p.redove).toEqual([]);
    expect([p.broyZadachi, p.kamNezhivi]).toEqual([1, 1]);
  });

  it('и Стопаните носят задачи · те са хора като служителите', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi('st1', 'sluzhiteli.dobaviStopan', {
      kletki: {
        ime: { tekst: 'Стопанинът' },
        telefon: null,
        imeyl: { tekst: STOPANIN },
        adres: null,
        dlazhnost: { nomer: 1 },
      },
    });
    const stopan = iz.ogledalo().tablitsi.get('stopani')!.id[0]!;
    await zapishi('z1', 'upravlenie.dobaviZadacha', zadacha(DNES, null, stopan));
    const p = programata(iz.ogledalo(), DNES);
    // Стопаните вървят преди Служителите · в реда на неговия лист
    expect(p.redove.map((r) => [r.ime, r.dneshni])).toEqual([
      ['Стопанинът', 1],
      ['Помощникът', 0],
    ]);
  });
});
