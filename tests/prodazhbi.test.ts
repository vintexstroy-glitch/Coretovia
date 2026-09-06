/**
 * ПРОДАЖБИТЕ · двете му таблици, проверките и състоянието им (ADR-010).
 *
 * Негово (05.09): „едната таблица е завършила и всичко е платено, а другата е с
 * Активни продажби които чакат плащания." Тук се пази, че състоянието се СМЯТА
 * от парите, а проверката („проверка банка" · „проверка кеш", формули в Книгата)
 * е цената минус вноските от същата страна — и се записва като сверка, дори
 * когато е нула.
 *
 * Числата са НЕГОВИТЕ от мострата (A5:T5 и A62:T62), в цели центове.
 */

import { describe, expect, it } from 'vitest';
import { LENTA_NA_PARVATA_SGRADA, LENTA_NA_VTORATA_SGRADA, MODEL } from '../src/model/osnova.js';
import { tablitsata } from '../src/model/model.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import {
  evroZaKvadrat,
  koloniteNa,
  prodazhbite,
  STRANI_NA_PLASHTANETO,
  tsenaOtKvadrat,
} from '../src/smetach/prodazhbi.js';
import { KNIGA, knigaZaTest, STOPANIN } from './pomoshtni.js';

const KOGATO = '2026-09-05T13:00:00.000Z';

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

/** Празните клетки на първата таблица · командата пише ЦЕЛИЯ ред. */
const PRAZNA1 = {
  telefon: null,
  ime: null,
  imeyl: null,
  garazh: null,
  pMyasto: null,
  maze: null,
  kvadratura: null,
  tsena: null,
  tsenaBanka: null,
  tsenaSmr: null,
  pdBanka: null,
  pdSmr: null,
  nsBanka: null,
  nsSmr: null,
  akt15Smr: null,
  akt15: null,
  akt16: null,
};

const PRAZNA2 = {
  telefon: null,
  ime: null,
  imeyl: null,
  garazh: null,
  pMyasto: null,
  maze: null,
  kvadratura: null,
  evroKvadrat: null,
  tsena: null,
  tsenaBanka: null,
  tsenaSmr: null,
  pdBanka: null,
  pdKesh: null,
  nsBanka: null,
  nsKesh: null,
  akt15Banka: null,
  akt16Banka: null,
};

/** Неговият A5 · апарт. № 1 · 84,5 кв. м · 101 400 € · платен докрай. */
const NEGOVIYAT_APARTAMENT = {
  kletki: {
    ...PRAZNA1,
    apartament: { tekst: 'апарт. № 1' },
    garazh: { chislo: 3 },
    kvadratura: { chislo: 845000 },
    tsena: { stoynost_st: 10140000 },
    tsenaBanka: { stoynost_st: 4000000 },
    tsenaSmr: { stoynost_st: 6140000 },
    pdBanka: { stoynost_st: 2000000 },
    pdSmr: { stoynost_st: 3000000 },
    nsBanka: { stoynost_st: 1500000 },
    nsSmr: { stoynost_st: 3140000 },
    akt16: { stoynost_st: 500000 },
  },
};

describe('колоните говорят по БЕЛЕГ, не по име', () => {
  it('двете му таблици казват едно и също с различни думи · белегът ги свързва', () => {
    const parva = tablitsata(MODEL, 'prodazhbi');
    const vtora = tablitsata(MODEL, 'prodazhbi2');
    // лентите му A3 и A60 · ЗАКОВАНИ с ръка, дословно (правило 21)
    expect(LENTA_NA_PARVATA_SGRADA).toBe(
      'Т А Б Л И Ц А  за продажби на Винтекс Строй ЕАД в обект: "ЖИЛИЩНА СГРАДА С ПОДЗЕМНИ ГАРАЖИ  УПИ ІХ-1691,1692, кв. 47, м. Студентски град, р-н Студентски, гр. София"',
    );
    expect(LENTA_NA_VTORATA_SGRADA).toBe(
      'Т А Б Л И Ц А  за продажбите на Винтекс Строй ЕАД в обект: ЖИЛИЩНА СГРАДА С ПОДЗЕМНИ ГАРАЖИ в УПИ V-3508, кв. 56, м. Малинова долина, р-н Студентски, гр. София',
    );
    expect(parva.ime).toBe(LENTA_NA_PARVATA_SGRADA);
    expect(vtora.ime).toBe(LENTA_NA_VTORATA_SGRADA);
    // и главите му, дословно · двайсет на всяка таблица
    expect(parva.koloni.map((k) => k.ime)).toEqual([
      'апартамент',
      'телефон',
      'име',
      'имейл',
      'гараж',
      'п. място',
      'мазе',
      'квадратура',
      'цена',
      'цена банка',
      'цена смр ',
      'ПД банка',
      'ПД смр',
      'НС банка',
      'НС смр',
      'Акт 15 смр',
      'Акт 15',
      'АКТ 16 ',
      'проверка банка',
      'проверка кеш',
    ]);
    expect(vtora.koloni.map((k) => k.ime)).toEqual([
      'апартамент',
      'телефон',
      'име',
      'имейл',
      'гараж',
      'п. място',
      'мазе',
      'квадратура',
      'евро/квадрат',
      'цена',
      'цена банка',
      'цена смр ',
      'ПД банка',
      'ПД кеш',
      'НС банка',
      'НС кеш',
      'АКТ 15 банка',
      'АКТ 16 банка ',
      'проверка банка',
      'проверка кеш',
    ]);
    expect(STRANI_NA_PLASHTANETO).toEqual(['banka', 'kesh']);
    // неговите „ПД смр" и „ПД кеш" са ЕДНО и също · и двете са вноска в кеш
    expect(koloniteNa(parva, 'vnoska', 'kesh').map((k) => k.ime)).toEqual([
      'ПД смр',
      'НС смр',
      'Акт 15 смр',
    ]);
    expect(koloniteNa(vtora, 'vnoska', 'kesh').map((k) => k.ime)).toEqual(['ПД кеш', 'НС кеш']);
    expect(koloniteNa(parva, 'tsena', 'banka').map((k) => k.ime)).toEqual(['цена банка']);
    // проверките са ЗАТВОРЕНИ · сметка не се редактира от никого (правило 23)
    expect(koloniteNa(parva, 'proverka').every((k) => k.zatvorena)).toBe(true);
    expect(koloniteNa(vtora, 'proverka').every((k) => k.zatvorena)).toBe(true);
  });

  it('евро за квадрат · и обратното · в цели центове и цели кв. см', () => {
    // неговият A62: 63,31 кв. м × 2 000 €/кв. м = 126 620 €
    expect(tsenaOtKvadrat(200000, 633100)).toBe(12662000);
    expect(evroZaKvadrat(12662000, 633100)).toBe(200000);
    // квадратура нула не е число, а липса
    expect(evroZaKvadrat(10000, 0)).toBe(0);
  });
});

describe('проверката е СМЕТНАТА, не въведена', () => {
  it('платената продажба има две нули · и това я прави платена', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi('p1', 'prodazhbi.dobaviParva', NEGOVIYAT_APARTAMENT);
    const t = prodazhbite(iz.ogledalo(), KOGATO).tablitsi[0]!;
    const r = t.redove[0]!;
    expect(r.ime).toBe('апарт. № 1');
    expect(r.strani.map((x) => [x.strana, x.tsena, x.vneseno, x.ostatak])).toEqual([
      ['banka', 4000000, 4000000, 0],
      ['kesh', 6140000, 6140000, 0],
    ]);
    expect(r.platena).toBe(true);
    // негово решение, 05.09: „Само Акт 16" · той е дошъл, значи и ЗАВЪРШЕНА
    expect([r.zavarshena, r.chaka]).toEqual([true, []]);
    // записаната цена срещу сбора на двете страни · сверка, която затваря
    expect(r.tsena).toBe(r.tsenaPoStrani);
    expect(t.sverki.every((s) => s.nared)).toBe(true);
  });

  it('липсваща вноска оставя ОСТАТЪК · и таблицата става АКТИВНА', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi('p1', 'prodazhbi.dobaviParva', {
      kletki: {
        ...NEGOVIYAT_APARTAMENT.kletki,
        nsSmr: { stoynost_st: 1140000 },
      },
    });
    const t = prodazhbite(iz.ogledalo(), KOGATO).tablitsi[0]!;
    expect(t.redove[0]?.strani[1]?.ostatak).toBe(2000000);
    expect(t.redove[0]?.platena).toBe(false);
    expect(t.sastoyanie).toBe('aktivna');
    expect(t.ostatak).toBe(2000000);
    // сверката „цена ↔ двете страни" ПАДА, защото записаната цена вече не се събира
    expect(t.sverki[0]?.nared).toBe(true);
  });

  it('ПЛАТЕНА без Акт 16 не е ЗАВЪРШЕНА · и се казва какво чака (негово, 05.09)', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi('p1', 'prodazhbi.dobaviParva', {
      kletki: {
        ...NEGOVIYAT_APARTAMENT.kletki,
        nsBanka: { stoynost_st: 2000000 },
        akt16: null,
      },
    });
    const t = prodazhbite(iz.ogledalo(), KOGATO).tablitsi[0]!;
    const r = t.redove[0]!;
    // парите са дошли докрай · актът не
    expect([r.platena, r.zavarshena, r.chaka]).toEqual([true, false, ['АКТ 16']]);
    expect([t.platenite, t.zavarshenite, t.ostatak]).toEqual([1, 0, 0]);
    expect(t.sastoyanie).toBe('aktivna');
  });

  it('празната таблица не е завършена · тя е ПРАЗНА, и това се казва', async () => {
    const { iz } = await otvori();
    const v = prodazhbite(iz.ogledalo(), KOGATO);
    expect(v.tablitsi.map((t) => t.sastoyanie)).toEqual(['prazna', 'prazna']);
    expect([v.broy, v.tsena, v.ostatak]).toEqual([0, 0, 0]);
  });

  it('ЗАВЪРШЕНА е таблицата, чиито продажби са платени докрай', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi('p1', 'prodazhbi.dobaviParva', NEGOVIYAT_APARTAMENT);
    await zapishi('p2', 'prodazhbi.dobaviParva', {
      kletki: {
        ...PRAZNA1,
        apartament: { tekst: 'апарт. № 2' },
        kvadratura: { chislo: 621000 },
        tsena: { stoynost_st: 7452000 },
        tsenaBanka: { stoynost_st: 3000000 },
        tsenaSmr: { stoynost_st: 4452000 },
        pdBanka: { stoynost_st: 1500000 },
        pdSmr: { stoynost_st: 2226000 },
        nsBanka: { stoynost_st: 1000000 },
        nsSmr: { stoynost_st: 2226000 },
        akt16: { stoynost_st: 500000 },
      },
    });
    const t = prodazhbite(iz.ogledalo(), KOGATO).tablitsi[0]!;
    expect([t.redove.length, t.platenite, t.zavarshenite, t.sastoyanie]).toEqual([
      2,
      2,
      2,
      'zavarshena',
    ]);
    // ОБЩО евро · неговият ред A58 · по колона
    expect(t.obshto['tsena']).toBe(17592000);
    expect(t.obshto['kvadratura']).toBe(1466000);
    expect(t.obshto['proverkaBanka']).toBe(0);
  });
});

describe('втората таблица · цената следва от евро/квадрат', () => {
  it('сверява се цената срещу евро/квадрат × квадратура', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi('p1', 'prodazhbi.dobaviVtora', {
      kletki: {
        ...PRAZNA2,
        apartament: { tekst: 'апартамент № 3' },
        kvadratura: { chislo: 633100 },
        evroKvadrat: { stoynost_st: 200000 },
        tsena: { stoynost_st: 12662000 },
        tsenaBanka: { stoynost_st: 5000000 },
        tsenaSmr: { stoynost_st: 7662000 },
        pdBanka: { stoynost_st: 2500000 },
        pdKesh: { stoynost_st: 3831000 },
        nsBanka: { stoynost_st: 2000000 },
        nsKesh: { stoynost_st: 3831000 },
        akt16Banka: { stoynost_st: 500000 },
      },
    });
    const t = prodazhbite(iz.ogledalo(), KOGATO).tablitsi[1]!;
    expect(t.redove[0]?.platena).toBe(true);
    expect(t.sastoyanie).toBe('zavarshena');
    expect(t.sverki.every((s) => s.nared)).toBe(true);
    // сгрешеното евро/квадрат ПАДА сверката, вместо да мине тихо
    await zapishi('p2', 'red.popraviKletka', {
      tablitsa: 'prodazhbi2',
      id: t.redove[0]!.id,
      kletki: { evroKvadrat: { stoynost_st: 210000 } },
    });
    const sled = prodazhbite(iz.ogledalo(), KOGATO).tablitsi[1]!;
    const padnala = sled.sverki.find((s) => !s.nared);
    expect(padnala?.kakvo).toContain('евро/квадрат × квадратура');
    expect(padnala?.razlika).toBe(-633100);
  });

  /**
   * ЗАКРЪГЛЯНЕТО ИМА ЕДИН ДОМ · и той не е `Math.round` (резен 6и · правило 3).
   *
   * Двете функции смятаха с `Math.round((a * b) / c)` — плаваща запетая върху
   * цели центове, и то точно там, където числото застава пред собственика.
   * Разликата не е стилова: `Math.round` закръгля половинката НАГОРЕ по числовата
   * ос, а `deliZakragleno` — ОТ нулата. При минус двете дават различно, а
   * сторното Е обърнат знак: сверка, която затваря на плюс, не затваря на минус.
   *
   * Тестът пинва ТРИ неща: точната половинка, знака, и че двете посоки се
   * връщат една в друга.
   */
  describe('евро/квадрат · закръглянето', () => {
    it('точната ПОЛОВИНКА се закръгля ОТ нулата · и в двете посоки', () => {
      // 1 цент върху 2 кв. см · 10000 / 2 = 5000 · точно, без остатък
      expect(evroZaKvadrat(1, 2)).toBe(5000);
      // 3 цента върху 4 кв. см · 30000 / 4 = 7500 · точно
      expect(evroZaKvadrat(3, 4)).toBe(7500);
      // 1 цент върху 3 кв. см · 10000 / 3 = 3333,33… → 3333
      expect(evroZaKvadrat(1, 3)).toBe(3333);
      // 5 цента върху 8 кв. см · 50000 / 8 = 6250 · точно
      expect(evroZaKvadrat(5, 8)).toBe(6250);
      // и ПОЛОВИНКАТА: 1 цент върху 8 кв. см · 10000 / 8 = 1250 · точно;
      // 3 цента върху 8 · 30000 / 8 = 3750 · точно. Половинка дава `tsenaOtKvadrat`:
      // 1250 × 12 / 10000 = 1,5 → 2 (ОТ нулата, не към по-голямото)
      expect(tsenaOtKvadrat(1250, 12)).toBe(2);
    });

    it('и при МИНУС · сторното е обърнат знак и сверката трябва да затвори', () => {
      // `Math.round(-1.5)` е -1 (към по-голямото); домът дава -2 (от нулата).
      expect(tsenaOtKvadrat(-1250, 12)).toBe(-2);
      // и симетрията: обърнатият вход дава обърнат изход, точно
      expect(tsenaOtKvadrat(-1250, 12)).toBe(-tsenaOtKvadrat(1250, 12));
      expect(evroZaKvadrat(-1, 3)).toBe(-evroZaKvadrat(1, 3));
    });

    it('нулевата квадратура е ЛИПСА, не нула', () => {
      // делене на нула не е число · функцията го КАЗВА с нула, не хвърля
      expect(evroZaKvadrat(300_000_00, 0)).toBe(0);
      expect(evroZaKvadrat(300_000_00, -5)).toBe(0);
    });
  });
});
