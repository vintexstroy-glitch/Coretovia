/**
 * КОМАНДИТЕ ПРЕЗ ИЗПЪЛНИТЕЛЯ · вехата на резена · от край до край, без DOM.
 *
 * Откриване → стойност → Имот → Обект → номерация → поправка → изключване →
 * сторно → разписка за Книгата. Пробването не пише; повторният ключ връща
 * същото; същият ключ с друг товар се отказва; отказите са с думи, поименно.
 */

import { describe, expect, it } from 'vitest';
import { eOtkaz, type Otkaz } from '../src/komandi/izpalnenie.js';
import type { Predvaritelno } from '../src/komandi/komanda.js';
import { MODEL, NOMENKLATURA } from '../src/model/osnova.js';
import { otpechatakNaModela } from '../src/model/otpechatak.js';
import { poNomer } from '../src/model/nomenklatura.js';
import { redKato, zhiviteRedove } from '../src/ogledalo/tablitsa.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import { nomerNaRed, tekstNaNomera } from '../src/smetach/nomeratsiya.js';
import { KNIGA, knigaZaTest, STOPANIN, VERIGA_NA_SLUZHITEL } from './pomoshtni.js';

async function otvori() {
  const k = knigaZaTest();
  let takt = 0;
  const nachalo = Date.parse('2026-09-05T12:00:00.000Z');
  const iz = await Izpalnitel.otvori({
    vrata: k.vrata,
    dnevnik: k.dnevnik,
    model: MODEL,
    veriga: KNIGA,
    aktor: () => STOPANIN,
    sega: () => {
      takt += 1;
      return new Date(nachalo + takt * 1000).toISOString();
    },
  });
  return { k, iz };
}

const PRAZEN_IMOT = { nomer: null, plosht: null, tsena: null, papka: null, adres: null };
const PRAZEN_OBEKT = { plosht: null, tsena: null, papka: null, adres: null };

function uspeh<T>(r: T | Otkaz): T {
  if (eOtkaz(r)) throw new Error(`неочакван отказ: ${r.zashto.join(' | ')}`);
  return r;
}
function otkazat(r: unknown): Otkaz {
  if (!eOtkaz(r)) throw new Error('очакваше се отказ');
  return r;
}

/** Книгата с открит Стопанин, една добавена стойност, един Имот и един Обект. */
async function nachalo() {
  const { k, iz } = await otvori();
  uspeh(await iz.izpalni('k0', 'stopanin.otkriy', { imeyl: STOPANIN }));
  uspeh(
    await iz.izpalni('k1', 'nastroyki.dobaviStoynost', {
      nomenklatura: NOMENKLATURA.sastoyanieNaImot,
      tekst: 'Продаден',
      belezi: {},
    }),
  );
  uspeh(
    await iz.izpalni('k2', 'imoti.sazdayImot', {
      kletki: { ime: { tekst: 'Студентски Град' }, sastoyanie: { nomer: 2 }, ...PRAZEN_IMOT },
    }),
  );
  uspeh(
    await iz.izpalni('k3', 'imoti.dobaviObekt', {
      kletki: {
        imot: { tekst: 'imot:k2' },
        kategoriya: { nomer: 1 },
        vid: { nomer: 1 },
        nomer: { chislo: 27 },
        ...PRAZEN_OBEKT,
      },
    }),
  );
  return { k, iz };
}

const nomer = (iz: Izpalnitel, tablitsa: string, id: string): string => {
  const o = iz.ogledalo();
  return tekstNaNomera(nomerNaRed(o, tablitsa, o.tablitsi.get(tablitsa)!.indeks.get(id)!));
};

describe('от край до край · през Изпълнителя', () => {
  it('преди откриването всичко се отказва с думи · откриването е веднъж', async () => {
    const { iz } = await otvori();
    expect(otkazat(iz.probvay('x', 'imoti.sazdayImot', { kletki: {} })).zashto).toEqual([
      'Книгата не е открита — първо Стопанинът.',
    ]);
    expect(
      otkazat(await iz.izpalni('x', 'stopanin.otkriy', { imeyl: 'drug@x.bg' })).zashto[0],
    ).toMatch(/с имейла на този, който я отваря/);
    const r = uspeh(await iz.izpalni('k0', 'stopanin.otkriy', { imeyl: STOPANIN }));
    expect(r.seqove).toEqual([1]);
    expect(r.povtoreno).toBe(false);
    expect(iz.ogledalo().stopanin).toBe(STOPANIN);
    expect(
      otkazat(await iz.izpalni('k0b', 'stopanin.otkriy', { imeyl: STOPANIN })).zashto[0],
    ).toMatch(/вече е открита/);
  });

  it('пробването не пише · изпълнението пише · повторният ключ връща същото · друг товар се отказва', async () => {
    const { k, iz } = await otvori();
    uspeh(await iz.izpalni('k0', 'stopanin.otkriy', { imeyl: STOPANIN }));
    const tovar = { nomenklatura: NOMENKLATURA.sastoyanieNaImot, tekst: 'Продаден', belezi: {} };
    const pred = uspeh(iz.probvay('k1', 'nastroyki.dobaviStoynost', tovar)) as Predvaritelno;
    expect(pred.operatsii).toHaveLength(1);
    expect(pred.operatsii[0]?.payload).toEqual({ ...tovar, nomer: 4 });
    expect(pred.operatsii[0]?.expectedRev).toBe(0);
    expect(pred.kursor.seq).toBe(1);
    expect((await k.dnevnik.posledno(KNIGA))?.seq).toBe(1);

    const r1 = uspeh(await iz.izpalni('k1', 'nastroyki.dobaviStoynost', tovar, pred.otpechatak));
    expect(r1.seqove).toEqual([2]);
    expect(r1.sverka.nared).toBe(true);
    const r2 = uspeh(await iz.izpalni('k1', 'nastroyki.dobaviStoynost', tovar));
    expect(r2.povtoreno).toBe(true);
    expect(r2.seqove).toEqual([2]);
    expect((await k.dnevnik.posledno(KNIGA))?.seq).toBe(2);
    expect(
      otkazat(await iz.izpalni('k1', 'nastroyki.dobaviStoynost', { ...tovar, tekst: 'Друго' }))
        .zashto[0],
    ).toMatch(/ползван за друго/);
    const n = iz.ogledalo().nomenklaturi.get(NOMENKLATURA.sastoyanieNaImot)!;
    expect(poNomer(n, 4)?.tekst).toBe('Продаден');
  });

  it('Имот · Обект · номерът се смята · rev-предпазителят е върху всяка операция', async () => {
    const { iz } = await nachalo();
    expect(nomer(iz, 'imoti', 'imot:k2')).toBe('1');
    expect(nomer(iz, 'obekti', 'obekt:k3')).toBe('1.1.1.27');
    const pred = uspeh(
      iz.probvay('k4', 'red.popraviKletka', {
        tablitsa: 'obekti',
        id: 'obekt:k3',
        kletki: { tsena: { stoynost_st: 25000000 } },
      }),
    ) as Predvaritelno;
    expect(pred.operatsii[0]?.expectedRev).toBe(4);
    expect(pred.razliki).toEqual([
      { kakvo: 'цена', bilo: '', stava: expect.stringMatching(/250/) },
    ]);
    expect(iz.ogledalo().neprocheteni).toEqual([]);
  });

  it('променено междувременно · отпечатъкът от пробването не важи след чужд запис', async () => {
    const { iz } = await nachalo();
    const tovar = { nomenklatura: NOMENKLATURA.sastoyanieNaImot, tekst: 'Нова', belezi: {} };
    const pred = uspeh(iz.probvay('k5', 'nastroyki.dobaviStoynost', tovar)) as Predvaritelno;
    uspeh(await iz.izpalni('k6', 'nastroyki.dobaviStoynost', { ...tovar, tekst: 'Друга' }));
    expect(
      otkazat(await iz.izpalni('k5', 'nastroyki.dobaviStoynost', tovar, pred.otpechatak)).zashto,
    ).toEqual(['Променено междувременно — виж отново, преди да запишеш.']);
    // без очакван отпечатък минава · с новия номер
    const r = uspeh(await iz.izpalni('k5', 'nastroyki.dobaviStoynost', tovar));
    expect(r.seqove).toHaveLength(1);
    expect(poNomer(iz.ogledalo().nomenklaturi.get(NOMENKLATURA.sastoyanieNaImot)!, 6)?.tekst).toBe(
      'Нова',
    );
  });
});

describe('предусловията · поименно', () => {
  it('дублиран кортеж · Видът извън Категорията · категория със своя таблица · мъртва връзка', async () => {
    const { iz } = await nachalo();
    const obekt = (kletki: Record<string, unknown>) =>
      otkazat(
        iz.probvay('x', 'imoti.dobaviObekt', { kletki: { ...PRAZEN_OBEKT, ...kletki } }),
      ).zashto.join(' ');
    const osnova = {
      imot: { tekst: 'imot:k2' },
      kategoriya: { nomer: 1 },
      vid: { nomer: 1 },
      nomer: { chislo: 27 },
    };
    expect(obekt(osnova)).toMatch(/Номер 1\.1\.1\.27 вече е зает/);
    expect(obekt({ ...osnova, kategoriya: { nomer: 2 }, vid: { nomer: 3 } })).toMatch(
      /Няма № 3 в „Вид на обект"/,
    );
    expect(obekt({ ...osnova, kategoriya: { nomer: 3 } })).toMatch(/има своя таблица/);
    expect(obekt({ ...osnova, imot: { tekst: 'imot:nyama' } })).toMatch(/Няма ред „imot:nyama"/);
    expect(obekt({ ...osnova, vid: { nomer: 9 } })).toMatch(/Няма № 9/);
  });

  it('дубъл в номенклатура · спряна дума · преименуване върху чужда · спряна не влиза в ред', async () => {
    const { iz } = await nachalo();
    const st = (klyuch: string, tovar: unknown) =>
      otkazat(iz.probvay('x', klyuch, tovar)).zashto.join(' ');
    const sast = NOMENKLATURA.sastoyanieNaImot;
    expect(
      st('nastroyki.dobaviStoynost', { nomenklatura: sast, tekst: ' УПИ', belezi: {} }),
    ).toMatch(/вече е в/);
    expect(
      st('nastroyki.preimenuvayStoynost', {
        nomenklatura: sast,
        nomer: 1,
        belezi: {},
        tekst: 'УПИ',
      }),
    ).toMatch(/вече е № 2/);
    uspeh(
      await iz.izpalni('s1', 'nastroyki.spriStoynost', {
        nomenklatura: sast,
        nomer: 3,
        belezi: {},
      }),
    );
    expect(
      st('nastroyki.dobaviStoynost', { nomenklatura: sast, tekst: 'Строеж', belezi: {} }),
    ).toMatch(/СПРЯНА \(№ 3\) — върни я/);
    expect(st('nastroyki.spriStoynost', { nomenklatura: sast, nomer: 3, belezi: {} })).toMatch(
      /вече е спряна/,
    );
    expect(
      st('imoti.sazdayImot', {
        kletki: { ime: { tekst: 'Х' }, sastoyanie: { nomer: 3 }, ...PRAZEN_IMOT },
      }),
    ).toMatch(/„Строеж" е спряна от Настройки/);
    uspeh(
      await iz.izpalni('s2', 'nastroyki.varniStoynost', {
        nomenklatura: sast,
        nomer: 3,
        belezi: {},
      }),
    );
    expect(st('nastroyki.varniStoynost', { nomenklatura: sast, nomer: 3, belezi: {} })).toMatch(
      /не е спряна/,
    );
    uspeh(
      iz.probvay('x', 'imoti.sazdayImot', {
        kletki: { ime: { tekst: 'Х' }, sastoyanie: { nomer: 3 }, ...PRAZEN_IMOT },
      }),
    );
  });

  it('видът по белег · № 1 под Паркинг е НПМ · спира се с белега си', async () => {
    const { iz } = await nachalo();
    const vid = NOMENKLATURA.vidNaObekt;
    uspeh(
      await iz.izpalni('v1', 'nastroyki.spriStoynost', {
        nomenklatura: vid,
        nomer: 1,
        belezi: { kategoriya: 2 },
      }),
    );
    const n = iz.ogledalo().nomenklaturi.get(vid)!;
    expect(poNomer(n, 1, { kategoriya: 2 })?.spryana).toBe(true);
    expect(poNomer(n, 1, { kategoriya: 1 })?.spryana).toBe(false);
    expect(poNomer(n, 1)).toBeUndefined();
    const r = uspeh(
      await iz.izpalni('v2', 'nastroyki.dobaviStoynost', {
        nomenklatura: vid,
        tekst: 'ППМ',
        belezi: { kategoriya: 2 },
      }),
    );
    expect(r.seqove).toHaveLength(1);
    expect(poNomer(iz.ogledalo().nomenklaturi.get(vid)!, 2, { kategoriya: 2 })?.tekst).toBe('ППМ');
  });

  it('смяна на Категория иска нов Вид · същата категория не го чисти · нищо за промяна се отказва · изключен ред не се поправя', async () => {
    const { iz } = await nachalo();
    // без нов Вид · отказ с имената на номенклатурите (и двете колони са „Състояние")
    expect(
      otkazat(
        iz.probvay('p1', 'red.popraviKletka', {
          tablitsa: 'obekti',
          id: 'obekt:k3',
          kletki: { kategoriya: { nomer: 2 } },
        }),
      ).zashto,
    ).toEqual(['„Състояние на Обект" е сменена — избери и „Вид на обект" от новата.']);
    // същата категория плюс друга клетка НЕ чисти Вида
    const sashta = uspeh(
      iz.probvay('p0', 'red.popraviKletka', {
        tablitsa: 'obekti',
        id: 'obekt:k3',
        kletki: { kategoriya: { nomer: 1 }, tsena: { stoynost_st: 100 } },
      }),
    ) as Predvaritelno;
    expect(sashta.operatsii[0]?.payload).toMatchObject({
      kletki: { kategoriya: { nomer: 1 }, tsena: { stoynost_st: 100 } },
    });
    expect(
      (sashta.operatsii[0]!.payload as { kletki: Record<string, unknown> }).kletki,
    ).not.toHaveProperty('vid');
    // с нов Вид от новата категория минава
    uspeh(
      await iz.izpalni('p1', 'red.popraviKletka', {
        tablitsa: 'obekti',
        id: 'obekt:k3',
        kletki: { kategoriya: { nomer: 2 }, vid: { nomer: 1 } },
      }),
    );
    expect(nomer(iz, 'obekti', 'obekt:k3')).toBe('1.2.1.27');
    expect(
      otkazat(
        iz.probvay('x', 'red.popraviKletka', {
          tablitsa: 'obekti',
          id: 'obekt:k3',
          kletki: { nomer: { chislo: 27 } },
        }),
      ).zashto,
    ).toEqual(['Нищо не се променя.']);
    uspeh(await iz.izpalni('p2', 'red.izklyuchi', { tablitsa: 'obekti', id: 'obekt:k3' }));
    expect(
      otkazat(
        iz.probvay('x', 'red.popraviKletka', {
          tablitsa: 'obekti',
          id: 'obekt:k3',
          kletki: { nomer: { chislo: 1 } },
        }),
      ).zashto[0],
    ).toMatch(/Изключен ред не се поправя/);
  });

  it('Имот с живи редове под себе си не се изключва · изключен се връща · два пъти не', async () => {
    const { iz } = await nachalo();
    expect(
      otkazat(await iz.izpalni('i1', 'red.izklyuchi', { tablitsa: 'imoti', id: 'imot:k2' }))
        .zashto[0],
    ).toMatch(/живи редове под себе си \(1 в „obekti"\)/);
    uspeh(await iz.izpalni('i2', 'red.izklyuchi', { tablitsa: 'obekti', id: 'obekt:k3' }));
    expect(zhiviteRedove(iz.ogledalo().tablitsi.get('obekti')!)).toEqual([]);
    expect(
      otkazat(await iz.izpalni('i3', 'red.izklyuchi', { tablitsa: 'obekti', id: 'obekt:k3' }))
        .zashto,
    ).toEqual(['Редът вече е изключен.']);
    uspeh(await iz.izpalni('i4', 'red.izklyuchi', { tablitsa: 'imoti', id: 'imot:k2' }));
    uspeh(await iz.izpalni('i5', 'red.varni', { tablitsa: 'imoti', id: 'imot:k2' }));
    expect(redKato(iz.ogledalo().tablitsi.get('imoti')!, 0).izklyuchen).toBe(false);
  });
});

describe('задачата на Управление (ADR-005)', () => {
  const zadacha = (kam: string, oshte: Record<string, unknown> = {}) => ({
    kletki: {
      kam: { tekst: kam },
      vid: { nomer: 1 },
      ime: { tekst: 'Сондаж' },
      ot: { tekst: '2026-09-10' },
      do: { tekst: '2026-09-12' },
      otsenka: { nomer: 1 },
      byudzhet: { stoynost_st: 25000000 },
      ...oshte,
    },
  });

  it('под Имот · под Обект · под Бизнес · родител без ред или изключен се отказва с думи', async () => {
    const { iz } = await nachalo();
    uspeh(
      await iz.izpalni('b1', 'imoti.dobaviBiznes', {
        kletki: {
          imot: { tekst: 'imot:k2' },
          sastoyanie: { nomer: 1 },
          nomer: { chislo: 1 },
          ...PRAZEN_OBEKT,
          drugi: null,
        },
      }),
    );
    uspeh(await iz.izpalni('z1', 'upravlenie.dobaviZadacha', zadacha('imot:k2')));
    uspeh(await iz.izpalni('z2', 'upravlenie.dobaviZadacha', zadacha('obekt:k3')));
    uspeh(await iz.izpalni('z3', 'upravlenie.dobaviZadacha', zadacha('biznes:b1')));
    const tv = iz.ogledalo().tablitsi.get('zadachi')!;
    expect(zhiviteRedove(tv)).toHaveLength(3);
    expect(tv.id.slice(0, 3)).toEqual(['zadacha:z1', 'zadacha:z2', 'zadacha:z3']);
    expect(redKato(tv, 0).kletki['kam']).toEqual({ tekst: 'imot:k2' });
    const otkaz = (tovar: unknown) =>
      otkazat(iz.probvay('x', 'upravlenie.dobaviZadacha', tovar)).zashto.join(' ');
    expect(otkaz(zadacha('imot:nyama'))).toMatch(
      /Няма ред „imot:nyama" в „imoti" · „obekti" · „biznesi"/,
    );
    expect(otkaz(zadacha('zadacha:z1'))).toMatch(
      /трябва да сочи ред от „imoti" или „obekti" или „biznesi"/,
    );
    expect(otkaz(zadacha('imot:k2', { do: { tekst: '2026-09-01' } }))).toMatch(
      /Краят \(2026-09-01\) е преди началото \(2026-09-10\)/,
    );
    expect(otkaz(zadacha('imot:k2', { ot: { tekst: '10.09.2026' } }))).toMatch(
      /не е дата ГГГГ-ММ-ДД/,
    );
    expect(otkaz(zadacha('imot:k2', { vid: { nomer: 9 } }))).toMatch(/Няма № 9 в „Вид на задача"/);
    expect(otkaz(zadacha('imot:k2', { ime: null }))).toMatch(/kletki\.ime: очаква се object/);
  });

  it('родител с живи задачи не се изключва · изключената задача освобождава · клетката се поправя на място', async () => {
    const { iz } = await nachalo();
    uspeh(await iz.izpalni('z1', 'upravlenie.dobaviZadacha', zadacha('obekt:k3')));
    expect(
      otkazat(await iz.izpalni('i1', 'red.izklyuchi', { tablitsa: 'obekti', id: 'obekt:k3' }))
        .zashto[0],
    ).toMatch(/живи редове под себе си \(1 в „zadachi"\)/);
    uspeh(
      await iz.izpalni('p1', 'red.popraviKletka', {
        tablitsa: 'zadachi',
        id: 'zadacha:z1',
        kletki: { do: { tekst: '2026-09-30' }, otsenka: null },
      }),
    );
    const tv = iz.ogledalo().tablitsi.get('zadachi')!;
    expect(redKato(tv, 0).kletki['do']).toEqual({ tekst: '2026-09-30' });
    expect(redKato(tv, 0).kletki['otsenka']).toBeUndefined();
    expect(
      otkazat(
        iz.probvay('x', 'red.popraviKletka', {
          tablitsa: 'zadachi',
          id: 'zadacha:z1',
          kletki: { ot: { tekst: '2026-10-01' } },
        }),
      ).zashto[0],
    ).toMatch(/Краят \(2026-09-30\) е преди началото \(2026-10-01\)/);
    uspeh(await iz.izpalni('i2', 'red.izklyuchi', { tablitsa: 'zadachi', id: 'zadacha:z1' }));
    uspeh(await iz.izpalni('i3', 'red.izklyuchi', { tablitsa: 'obekti', id: 'obekt:k3' }));
  });

  it('десният бутон върху Имот, Обект или Бизнес ОТВАРЯ чернова с родителя · върху задача го няма', async () => {
    const { iz } = await nachalo();
    const desni = (tablitsa: string, id: string) =>
      iz.butoniZa('upravlenie', { tablitsa, id }).filter((b) => b.myasto === 'desen-buton');
    const naImota = desni('imoti', 'imot:k2');
    expect(naImota.map((b) => [b.klyuch, b.razreshena, b.otvaryaChernova])).toEqual([
      ['upravlenie.dobaviZadacha', true, true],
      ['red.izklyuchi', false, false],
      ['red.varni', false, false],
      ['obshto.storno', true, false],
    ]);
    expect(naImota[0]?.tovar).toEqual({
      kletki: {
        kam: { tekst: 'imot:k2' },
        vid: null,
        ime: null,
        ot: null,
        do: null,
        otsenka: null,
        byudzhet: null,
      },
    });
    expect(desni('obekti', 'obekt:k3')[0]?.klyuch).toBe('upravlenie.dobaviZadacha');
    uspeh(await iz.izpalni('z1', 'upravlenie.dobaviZadacha', zadacha('obekt:k3')));
    expect(desni('zadachi', 'zadacha:z1').map((b) => b.klyuch)).toEqual([
      'red.izklyuchi',
      'red.varni',
      'obshto.storno',
    ]);
    // в прозореца Имоти задачата не се предлага · командата е на Управление
    expect(
      iz
        .butoniZa('imoti', { tablitsa: 'imoti', id: 'imot:k2' })
        .some((b) => b.klyuch === 'upravlenie.dobaviZadacha'),
    ).toBe(false);
  });
});

describe('сторното и разписката', () => {
  it('сторно на създаването гаси реда · живото Огледало се пресгъва · забраните са с думи', async () => {
    const { iz } = await nachalo();
    const seqNaObekta = redKato(iz.ogledalo().tablitsi.get('obekti')!, 0).seq;
    const r = uspeh(
      await iz.izpalni('st1', 'obshto.storno', {
        veriga: null,
        seq: seqNaObekta,
        prichina: 'грешен номер',
      }),
    );
    expect(r.seqove).toEqual([5]);
    const o = iz.ogledalo();
    expect(o.tablitsi.get('obekti')!.broy).toBe(0);
    expect(o.pogaseni.map((p) => [p.seq, p.prichina])).toEqual([[seqNaObekta, 'грешен номер']]);
    expect(o.sverka.nared).toBe(true);
    const st = (seq: number) =>
      otkazat(iz.probvay('x', 'obshto.storno', { veriga: null, seq, prichina: 'пак' })).zashto[0];
    expect(st(1)).toBe('Откриването на Книгата не се сторнира.');
    expect(st(5)).toMatch(/Сторно на сторно/);
    expect(st(seqNaObekta)).toMatch(/вече е сторнирано \(vintexstroy#5\)/);
    expect(st(99)).toMatch(/Няма събитие/);
  });

  it('разписката иска текущия Модел и текущия курсор · и броя на живите редове', async () => {
    const { iz } = await nachalo();
    const o = iz.ogledalo();
    const tovar = {
      otpechatak: otpechatakNaModela(MODEL),
      kursor: o.kursori.get(KNIGA)!,
      redove: {
        imoti: 1,
        obekti: 1,
        biznesi: 0,
        zadachi: 0,
        dvizheniya: 0,
        kesh: 0,
        dds: 0,
        stopani: 0,
        sluzhiteli: 0,
        dostap: 0,
      },
      iznesenoNa: '2026-09-05T12:30:00.000Z',
    };
    expect(
      otkazat(
        iz.probvay('x', 'kniga.iznesi', {
          ...tovar,
          redove: {
            imoti: 2,
            obekti: 1,
            biznesi: 0,
            zadachi: 0,
            dvizheniya: 0,
            kesh: 0,
            dds: 0,
            stopani: 0,
            sluzhiteli: 0,
            dostap: 0,
          },
        }),
      ).zashto[0],
    ).toMatch(/imoti 2 ≠ 1/);
    expect(
      otkazat(iz.probvay('x', 'kniga.iznesi', { ...tovar, otpechatak: 'друг' })).zashto[0],
    ).toMatch(/друг Модел/);
    const r = uspeh(await iz.izpalni('kn1', 'kniga.iznesi', tovar));
    expect(r.seqove).toEqual([5]);
    expect(iz.ogledalo().knigi).toHaveLength(1);
    expect(otkazat(iz.probvay('x', 'kniga.iznesi', tovar)).zashto[0]).toMatch(
      /друго състояние \(seq 4, сега 5\)/,
    );
  });

  it('сверките затварят · слушателят получава всяко ново Огледало · Дневникът брои колкото Изпълнителят', async () => {
    const { k, iz } = await nachalo();
    let broy = 0;
    const otpishi = iz.abonirai(() => {
      broy += 1;
    });
    uspeh(
      await iz.izpalni('a1', 'nastroyki.dobaviStoynost', {
        nomenklatura: NOMENKLATURA.kategoriya,
        tekst: 'Терен',
        belezi: {},
      }),
    );
    uspeh(
      await iz.izpalni('a1', 'nastroyki.dobaviStoynost', {
        nomenklatura: NOMENKLATURA.kategoriya,
        tekst: 'Терен',
        belezi: {},
      }),
    );
    otpishi();
    uspeh(
      await iz.izpalni('a2', 'nastroyki.dobaviStoynost', {
        nomenklatura: NOMENKLATURA.kategoriya,
        tekst: 'Друг',
        belezi: {},
      }),
    );
    expect(broy).toBe(1);
    expect(iz.sverki.nezatvoreni).toEqual([]);
    expect(iz.sverki.vsichki.length).toBeGreaterThan(0);
    expect((await k.dnevnik.chetiVsichki(KNIGA)).length).toBe(iz.ogledalo().broySabitiya);
    expect(iz.ogledalo().broySabitiya).toBe(6);
  });

  it('спряна Врата · изпълнението се отказва с причината · четенето върви', async () => {
    const { iz } = await nachalo();
    iz.zatvori('инцидент');
    expect(
      otkazat(await iz.izpalni('z1', 'red.izklyuchi', { tablitsa: 'obekti', id: 'obekt:k3' }))
        .zashto,
    ).toEqual(['Вратата е спряна: инцидент']);
    expect(iz.ogledalo().tablitsi.get('obekti')!.broy).toBe(1);
    iz.otvori();
    uspeh(await iz.izpalni('z1', 'red.izklyuchi', { tablitsa: 'obekti', id: 'obekt:k3' }));
  });
});

describe('два раздела · и втора верига', () => {
  it('чужд запис → REPLAY при първия опит, отказ с думи, и Огледалото вече знае', async () => {
    const { k, iz } = await nachalo();
    let takt = 100;
    const drug = await Izpalnitel.otvori({
      vrata: k.vrata,
      dnevnik: k.dnevnik,
      model: MODEL,
      veriga: KNIGA,
      aktor: () => STOPANIN,
      sega: () => {
        takt += 1;
        return new Date(Date.parse('2026-09-05T12:00:00.000Z') + takt * 1000).toISOString();
      },
    });
    const tovar = { nomenklatura: NOMENKLATURA.kategoriya, tekst: 'Терен', belezi: {} };
    uspeh(await drug.izpalni('d1', 'nastroyki.dobaviStoynost', tovar));
    // първият раздел още не знае · същият номер · Вратата отказва по rev, не по текст
    const r = otkazat(
      await iz.izpalni('a1', 'nastroyki.dobaviStoynost', { ...tovar, tekst: 'Друг терен' }),
    );
    expect(r.zashto[0]).toMatch(/rev/);
    // и след отказа Огледалото е пресгънато от Дневника · вторият опит минава с № 5
    expect(poNomer(iz.ogledalo().nomenklaturi.get(NOMENKLATURA.kategoriya)!, 4)?.tekst).toBe(
      'Терен',
    );
    const r2 = uspeh(
      await iz.izpalni('a2', 'nastroyki.dobaviStoynost', { ...tovar, tekst: 'Друг терен' }),
    );
    expect(r2.seqove).toHaveLength(1);
    expect(poNomer(iz.ogledalo().nomenklaturi.get(NOMENKLATURA.kategoriya)!, 5)?.tekst).toBe(
      'Друг терен',
    );
    expect(iz.sverki.nezatvoreni).toEqual([]);
  });

  it('същият ключ с друг товар в НОВА сесия се отказва по записаното под opId', async () => {
    const { k, iz } = await nachalo();
    uspeh(
      await iz.izpalni('x1', 'nastroyki.dobaviStoynost', {
        nomenklatura: NOMENKLATURA.kategoriya,
        tekst: 'Терен',
        belezi: {},
      }),
    );
    let takt = 200;
    const nova = await Izpalnitel.otvori({
      vrata: k.vrata,
      dnevnik: k.dnevnik,
      model: MODEL,
      veriga: KNIGA,
      aktor: () => STOPANIN,
      sega: () => {
        takt += 1;
        return new Date(Date.parse('2026-09-05T12:00:00.000Z') + takt * 1000).toISOString();
      },
    });
    const r = otkazat(
      await nova.izpalni('x1', 'nastroyki.dobaviStoynost', {
        nomenklatura: NOMENKLATURA.kategoriya,
        tekst: 'Друго',
        belezi: {},
      }),
    );
    expect(r.zashto[0]).toMatch(/ползван за друго/);
    expect((await k.dnevnik.posledno(KNIGA))?.seq).toBe(5);
  });

  it('служителят пише в своята верига · и сторнира събитие от веригата на Стопанина', async () => {
    const { k, iz } = await nachalo();
    let takt = 300;
    const sluzhitel = await Izpalnitel.otvori({
      vrata: k.vrata,
      dnevnik: k.dnevnik,
      model: MODEL,
      veriga: VERIGA_NA_SLUZHITEL,
      kniga: KNIGA,
      aktor: () => 'sluzhitel@example.bg',
      sega: () => {
        takt += 1;
        return new Date(Date.parse('2026-09-05T12:00:00.000Z') + takt * 1000).toISOString();
      },
    });
    expect(sluzhitel.ogledalo().stopanin).toBe(STOPANIN);
    const r = uspeh(
      await sluzhitel.izpalni('s1', 'imoti.dobaviObekt', {
        kletki: {
          imot: { tekst: 'imot:k2' },
          kategoriya: { nomer: 2 },
          vid: { nomer: 1 },
          nomer: { chislo: 11 },
          ...PRAZEN_OBEKT,
        },
      }),
    );
    expect(r.seqove).toEqual([1]);
    expect(nomer(sluzhitel, 'obekti', 'obekt:s1')).toBe('1.2.1.11');
    expect(redKato(sluzhitel.ogledalo().tablitsi.get('obekti')!, 1).veriga).toBe(
      VERIGA_NA_SLUZHITEL,
    );
    // сторно на Обекта на Стопанина · от чуждата верига, с нейното име
    const st = uspeh(
      await sluzhitel.izpalni('s2', 'obshto.storno', { veriga: KNIGA, seq: 4, prichina: 'грешен' }),
    );
    expect(st.seqove).toEqual([2]);
    expect(sluzhitel.ogledalo().tablitsi.get('obekti')!.id).toEqual(['obekt:s1']);
    // Стопанинът вижда същото след пресгъване
    await iz.prezaredi();
    expect(iz.ogledalo().tablitsi.get('obekti')!.id).toEqual(['obekt:s1']);
    expect(iz.ogledalo().sverka.nared).toBe(true);
  });
});

describe('категория без видове', () => {
  it('„Бизнес" няма видове · нова стойност в „Вид на обект" под нея се отказва с думи', async () => {
    const { iz } = await nachalo();
    const r = otkazat(
      await iz.izpalni('v1', 'nastroyki.dobaviStoynost', {
        nomenklatura: NOMENKLATURA.vidNaObekt,
        tekst: 'Кантора',
        belezi: { kategoriya: 3 },
      }),
    );
    expect(r.zashto).toEqual(['„Бизнес" няма видове — тя е своя таблица.']);
  });
});

describe('часовникът назад (отложено от ADR-003 §8)', () => {
  it('такт, който върви назад, не ражда REPLAY · Изпълнителят го стяга с милисекунда напред', async () => {
    const k = knigaZaTest();
    let sega = Date.parse('2026-09-05T12:00:10.000Z');
    const iz = await Izpalnitel.otvori({
      vrata: k.vrata,
      dnevnik: k.dnevnik,
      model: MODEL,
      veriga: KNIGA,
      aktor: () => STOPANIN,
      sega: () => new Date(sega).toISOString(),
    });
    uspeh(await iz.izpalni('k0', 'stopanin.otkriy', { imeyl: STOPANIN }));
    // часовникът на устройството се връща с десет секунди назад
    sega -= 10_000;
    uspeh(
      await iz.izpalni('k1', 'nastroyki.dobaviStoynost', {
        nomenklatura: NOMENKLATURA.sastoyanieNaImot,
        tekst: 'Продаден',
        belezi: {},
      }),
    );
    sega -= 5_000;
    uspeh(
      await iz.izpalni('k2', 'imoti.sazdayImot', {
        kletki: { ime: { tekst: 'Студентски Град' }, sastoyanie: { nomer: 2 }, ...PRAZEN_IMOT },
      }),
    );
    const s = await k.dnevnik.chetiVsichki(KNIGA);
    expect(s.map((x) => x.seq)).toEqual([1, 2, 3]);
    const ts = s.map((x) => Date.parse(x.ts));
    expect(ts[1]).toBe(ts[0]! + 1);
    expect(ts[2]).toBe(ts[1]! + 1);
    expect(iz.sverki.nezatvoreni).toEqual([]);
  });
});
