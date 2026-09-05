/**
 * ПРАВОТО на Длъжността · четирите оси на неговия лист „Служители" (ADR-008).
 *
 * Правило 23: правото има ТРИ стойности и само СТЕСНЯВА. Тук се пази точно
 * това — че „Редактира" значи „не съм стеснил нищо", че записаният ред бие
 * базовия, и че когато един човек носи ДВЕ Длъжности, важи най-тясната.
 *
 * Изреченията са НЕГОВИ (A17:F21), дословно; кодът чете от тях две неща —
 * правото по първата дума и обхвата: останалото.
 */

import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/model/osnova.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import { eOtkaz } from '../src/komandi/izpalnenie.js';
import {
  dlazhnosttaNaImeyla,
  dostapaMi,
  dostapaNaDlazhnostta,
  DLAZHNOSTI_S_RAZDAVANE,
  DUMI_NA_PRAVOTO,
  mozheDaRazdavaDlazhnosti,
  mozheDaRedaktira,
  obhvatOtDumite,
  poTyasnoto,
  PRAVA,
  pravoOtDumite,
  pravotoNaImeyla,
  razdavaDostap,
} from '../src/smetach/pravo.js';
import { KNIGA, knigaZaTest, STOPANIN } from './pomoshtni.js';

const KOGATO = '2026-09-05T13:00:00.000Z';

/** Номерата на Длъжностите · базовите му стойности, в неговия ред. */
const DLAZHNOST = {
  stopanin: 1,
  upravitel: 2,
  pomoshtnik: 3,
  sluzhitel: 4,
  nablyudatel: 5,
} as const;

const chovek = (ime: string, imeyl: string, nomer: number) => ({
  kletki: {
    ime: { tekst: ime },
    telefon: null,
    imeyl: { tekst: imeyl },
    adres: null,
    dlazhnost: { nomer },
  },
});

async function otvori() {
  const k = knigaZaTest();
  let takt = 0;
  // кой пише · сменя се, за да се провери правото на ДРУГ човек, не на Стопанина
  let koyPishe = STOPANIN;
  const stani = (imeyl: string) => {
    koyPishe = imeyl;
  };
  const iz = await Izpalnitel.otvori({
    vrata: k.vrata,
    dnevnik: k.dnevnik,
    model: MODEL,
    veriga: KNIGA,
    aktor: () => koyPishe,
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
  return { iz, zapishi, stani };
}

describe('правото се чете от НЕГОВОТО изречение', () => {
  it('първата дума дава правото · останалото е обхватът · празното е скрито', () => {
    expect(pravoOtDumite('Редактира всичко')).toBe('redaktira');
    expect(pravoOtDumite('Вижда само всичко')).toBe('vizhda');
    expect(pravoOtDumite('Вижда само таб Служители')).toBe('vizhda');
    expect(pravoOtDumite('')).toBe('skrito');
    expect(pravoOtDumite('   ')).toBe('skrito');
    // дословно неговото D19, с двата интервала
    expect(obhvatOtDumite('Редактира  хедъри: Заплати, Фактури Кеш, Фактури Карта')).toBe(
      'хедъри: Заплати, Фактури Кеш, Фактури Карта',
    );
    expect(obhvatOtDumite('Редактира всичко')).toBe('всичко');
  });

  it('трите стойности са в реда на стесняването · и по-тясното печели', () => {
    expect(PRAVA).toEqual(['redaktira', 'vizhda', 'skrito']);
    expect(Object.values(DUMI_NA_PRAVOTO)).toEqual(['Редактира', 'Вижда', 'Скрито']);
    expect(poTyasnoto('redaktira', 'vizhda')).toBe('vizhda');
    expect(poTyasnoto('vizhda', 'redaktira')).toBe('vizhda');
    expect(poTyasnoto('vizhda', 'skrito')).toBe('skrito');
    expect(poTyasnoto('redaktira', 'redaktira')).toBe('redaktira');
  });
});

describe('достъпът на Длъжността', () => {
  it('без записан ред важи БАЗОВИЯТ от Книгата му · и си казва, че не е записан', async () => {
    const { iz } = await otvori();
    const d = dostapaNaDlazhnostta(iz.ogledalo(), 'Помощник Управител');
    expect(d.zapisan).toBe(false);
    expect(d.dumi.hedari).toBe('Редактира  хедъри: Заплати, Фактури Кеш, Фактури Карта');
    expect(d.pravo).toEqual({
      tabove: 'vizhda',
      hedari: 'redaktira',
      redove: 'vizhda',
      zhurnal: 'vizhda',
    });
  });

  it('непозната Длъжност не отваря врати · всичките ѝ оси са скрити', async () => {
    const { iz } = await otvori();
    const d = dostapaNaDlazhnostta(iz.ogledalo(), 'Градинар');
    expect(d.zapisan).toBe(false);
    expect(Object.values(d.pravo)).toEqual(['skrito', 'skrito', 'skrito', 'skrito']);
  });

  it('ЗАПИСАНИЯТ ред бие базовия · стеснението е решение на човек', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi('d1', 'sluzhiteli.dobaviDlazhnost', {
      kletki: {
        dlazhnost: { nomer: DLAZHNOST.pomoshtnik },
        tabove: { tekst: 'Вижда всичко' },
        hedari: { tekst: 'Вижда само всичко' },
        redove: { tekst: 'Вижда само всичко' },
        zhurnal: { tekst: 'Вижда само всичко' },
      },
    });
    const d = dostapaNaDlazhnostta(iz.ogledalo(), 'Помощник Управител');
    expect(d.zapisan).toBe(true);
    expect(d.pravo.hedari).toBe('vizhda');
  });
});

describe('правото на един ЧОВЕК', () => {
  it('Длъжността идва от реда му · Стопани и Служители се четат в този ред', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi(
      's1',
      'sluzhiteli.dobaviSluzhitel',
      chovek('Помощникът', 'pomoshtnik@example.bg', DLAZHNOST.pomoshtnik),
    );
    const o = iz.ogledalo();
    expect(dlazhnosttaNaImeyla(o, 'pomoshtnik@example.bg')).toBe('Помощник Управител');
    expect(dlazhnosttaNaImeyla(o, 'POMOSHTNIK@example.bg')).toBe('Помощник Управител');
    expect(dlazhnosttaNaImeyla(o, 'nikoy@example.bg')).toBe('');
    expect(dlazhnosttaNaImeyla(o, '')).toBe('');
  });

  it('Стопанинът на Книгата редактира ВИНАГИ · дори без ред в таблиците', async () => {
    const { iz } = await otvori();
    const o = iz.ogledalo();
    expect(dlazhnosttaNaImeyla(o, STOPANIN)).toBe('');
    expect(pravotoNaImeyla(o, STOPANIN, 'zhurnal')).toBe('redaktira');
    expect(mozheDaRedaktira(o, STOPANIN, 'Заплати Кеш')).toBe(true);
  });

  it('човек без ред ВИЖДА, но не редактира · най-тясното, което върши работа', async () => {
    const { iz } = await otvori();
    const o = iz.ogledalo();
    expect(pravotoNaImeyla(o, 'nikoy@example.bg', 'redove')).toBe('vizhda');
    expect(mozheDaRedaktira(o, 'nikoy@example.bg', 'Заплати Кеш')).toBe(false);
  });

  it('ДВЕ Длъжности на един човек · важи НАЙ-ТЯСНАТА (правило 23)', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi(
      's1',
      'sluzhiteli.dobaviSluzhitel',
      chovek('Двулик', 'dvulik@example.bg', DLAZHNOST.pomoshtnik),
    );
    await zapishi(
      's2',
      'sluzhiteli.dobaviSluzhitel',
      chovek('Двулик · втори ред', 'dvulik@example.bg', DLAZHNOST.nablyudatel),
    );
    const o = iz.ogledalo();
    // Помощникът редактира хедъри, Наблюдателят само вижда → вижда
    expect(pravotoNaImeyla(o, 'dvulik@example.bg', 'hedari')).toBe('vizhda');
    expect(mozheDaRedaktira(o, 'dvulik@example.bg', 'Заплати Кеш')).toBe(false);
  });
});

describe('кой редактира кой хедър · неговото D19', () => {
  it('Помощник Управителят редактира ТРИТЕ секции от изречението му и нищо друго', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi(
      's1',
      'sluzhiteli.dobaviSluzhitel',
      chovek('Помощникът', 'pomoshtnik@example.bg', DLAZHNOST.pomoshtnik),
    );
    const o = iz.ogledalo();
    const mozhe = (hedar: string) => mozheDaRedaktira(o, 'pomoshtnik@example.bg', hedar);
    expect(mozhe('Заплати Кеш')).toBe(true);
    expect(mozhe('Фактури Кеш')).toBe(true);
    expect(mozhe('Фактури Карта')).toBe(true);
    expect(mozhe('Наем Банка')).toBe(false);
    expect(mozhe('Кредити')).toBe(false);
    expect(mozhe('Фактури Бнка')).toBe(false);
  });

  it('Управителят редактира ВСИЧКО · Наблюдателят нищо', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi(
      's1',
      'sluzhiteli.dobaviSluzhitel',
      chovek('Управителят', 'upravitel@example.bg', DLAZHNOST.upravitel),
    );
    await zapishi(
      's2',
      'sluzhiteli.dobaviSluzhitel',
      chovek('Наблюдателят', 'nablyudatel@example.bg', DLAZHNOST.nablyudatel),
    );
    const o = iz.ogledalo();
    expect(mozheDaRedaktira(o, 'upravitel@example.bg', 'Кредити')).toBe(true);
    expect(mozheDaRedaktira(o, 'nablyudatel@example.bg', 'Заплати Кеш')).toBe(false);
    // Журналът е разликата между Стопанина и Управителя (неговите C17 · C18)
    expect(pravotoNaImeyla(o, 'upravitel@example.bg', 'zhurnal')).toBe('vizhda');
    expect(pravotoNaImeyla(o, 'upravitel@example.bg', 'redove')).toBe('redaktira');
  });
});

describe('личният достъп · за Профила', () => {
  it('четирите оси носят НЕГОВИТЕ глави, думата на правото и изречението дословно', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi(
      's1',
      'sluzhiteli.dobaviSluzhitel',
      chovek('Помощникът', 'pomoshtnik@example.bg', DLAZHNOST.pomoshtnik),
    );
    const d = dostapaMi(iz.ogledalo(), 'pomoshtnik@example.bg');
    expect(d.dlazhnost).toBe('Помощник Управител');
    expect(d.osi.map((x) => x.pravo)).toEqual(['Вижда', 'Редактира', 'Вижда', 'Вижда']);
    expect(d.osi[1]?.dumi).toBe('Редактира  хедъри: Заплати, Фактури Кеш, Фактури Карта');
  });

  it('човек без ред · Длъжността е празна и всяка ос е празна (липсващото се КАЗВА)', async () => {
    const { iz } = await otvori();
    const d = dostapaMi(iz.ogledalo(), 'nikoy@example.bg');
    expect(d.dlazhnost).toBe('');
    expect(d.osi.map((x) => x.dumi)).toEqual(['', '', '', '']);
    expect(d.osi.map((x) => x.pravo)).toEqual(['Скрито', 'Скрито', 'Скрито', 'Скрито']);
  });
});

describe('кой РАЗДАВА Длъжности · негово, 05.09', () => {
  const dumiteNaOtkaza = (r: unknown): string =>
    eOtkaz(r) ? r.zashto.join(' ') : 'мина, а не биваше';

  it('Управителят и Помощник Управителят раздават · Наблюдателят и Служителят — не', async () => {
    const { iz, zapishi } = await otvori();
    for (const [ime, imeyl, nomer] of [
      ['Управителят', 'upravitel@example.bg', DLAZHNOST.upravitel],
      ['Помощникът', 'pomoshtnik@example.bg', DLAZHNOST.pomoshtnik],
      ['Служителят', 'sluzhitel@example.bg', DLAZHNOST.sluzhitel],
      ['Наблюдателят', 'nablyudatel@example.bg', DLAZHNOST.nablyudatel],
    ] as const) {
      await zapishi(`s-${imeyl}`, 'sluzhiteli.dobaviSluzhitel', chovek(ime, imeyl, nomer));
    }
    const o = iz.ogledalo();
    expect(mozheDaRazdavaDlazhnosti(o, 'upravitel@example.bg')).toBe(true);
    expect(mozheDaRazdavaDlazhnosti(o, 'pomoshtnik@example.bg')).toBe(true);
    expect(mozheDaRazdavaDlazhnosti(o, 'sluzhitel@example.bg')).toBe(false);
    expect(mozheDaRazdavaDlazhnosti(o, 'nablyudatel@example.bg')).toBe(false);
    expect(mozheDaRazdavaDlazhnosti(o, 'nikoy@example.bg')).toBe(false);
    // Стопанинът на Книгата е над двамата · иначе първият вход не назначава никого
    expect(mozheDaRazdavaDlazhnosti(o, STOPANIN)).toBe(true);
    expect(DLAZHNOSTI_S_RAZDAVANE).toEqual(['Стопанин', 'Управител', 'Помощник Управител']);
  });

  it('Портата ОТКАЗВА с думи · и бутонът го казва предварително (правило 12)', async () => {
    const { iz, zapishi, stani } = await otvori();
    await zapishi(
      's1',
      'sluzhiteli.dobaviSluzhitel',
      chovek('Наблюдателят', 'nablyudatel@example.bg', DLAZHNOST.nablyudatel),
    );
    stani('nablyudatel@example.bg');
    const otkazat = iz.probvay('x1', 'sluzhiteli.dobaviDlazhnost', {
      kletki: {
        dlazhnost: { nomer: DLAZHNOST.upravitel },
        tabove: { tekst: 'Редактира всичко' },
        hedari: { tekst: 'Редактира всичко' },
        redove: { tekst: 'Редактира всичко' },
        zhurnal: { tekst: 'Редактира всичко' },
      },
    });
    expect(dumiteNaOtkaza(otkazat)).toMatch(
      /Длъжности се раздават от Управител и Помощник Управител .* Ти си Наблюдател\./,
    );
    const buton = iz.butoniZa('sluzhiteli').find((b) => b.klyuch === 'sluzhiteli.dobaviDlazhnost')!;
    expect(buton.razreshena).toBe(false);
    expect(buton.zashto).toMatch(/Ти си Наблюдател/);
  });

  it('ЗАДНАТА врата е затворена · Длъжност не се пише и през клетката', async () => {
    const { iz, zapishi, stani } = await otvori();
    await zapishi(
      's1',
      'sluzhiteli.dobaviSluzhitel',
      chovek('Наблюдателят', 'nablyudatel@example.bg', DLAZHNOST.nablyudatel),
    );
    const id = iz.ogledalo().tablitsi.get('sluzhiteli')!.id[0]!;
    stani('nablyudatel@example.bg');
    const popravka = (kletki: Record<string, unknown>) =>
      iz.probvay('x1', 'red.popraviKletka', { tablitsa: 'sluzhiteli', id, kletki });
    expect(dumiteNaOtkaza(popravka({ dlazhnost: { nomer: DLAZHNOST.upravitel } }))).toMatch(
      /Длъжности се раздават/,
    );
    // телефонът не е раздаване · него го поправя всеки, който пише редове
    expect(eOtkaz(popravka({ telefon: { tekst: '0888 000 001' } }))).toBe(false);
    // махането на човек също раздава достъп (маха го)
    expect(
      dumiteNaOtkaza(iz.probvay('x2', 'red.izklyuchi', { tablitsa: 'sluzhiteli', id })),
    ).toMatch(/Длъжности се раздават/);
  });

  it('раздаването се ПОЗНАВА по таблицата и по колоните', () => {
    expect(razdavaDostap('dostap', [])).toBe(true);
    expect(razdavaDostap('sluzhiteli', ['dlazhnost'])).toBe(true);
    expect(razdavaDostap('stopani', ['ime', 'dlazhnost'])).toBe(true);
    expect(razdavaDostap('sluzhiteli', ['telefon', 'adres'])).toBe(false);
    expect(razdavaDostap('zadachi', ['dlazhnost'])).toBe(false);
  });
});
