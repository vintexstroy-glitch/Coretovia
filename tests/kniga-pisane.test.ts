/**
 * КНИГАТА НА ИЗХОД · от Огледалото до .xlsx и обратно, клетка по клетка.
 *
 * Осем листа + служебният; инструкциите му дословно; лентите слети; главите
 * неговите; номерацията текст; групови редове с ключ `grupa:`; валидациите
 * сочат подтаблиците на Настройки; „Ключ" скрит и заключен; данните
 * отключени; спряната стойност стои в реда си и липсва от списъка; сверката
 * на всеки лист затваря.
 */

import { describe, expect, it } from 'vitest';
import { knigataOtOgledaloto } from '../src/kniga/pisane.js';
import { napishiKniga, prochetiKniga, type ProchetenList } from '../src/kniga/ooxml.js';
import { AGENTI, GLAVI_NA_AGENTITE, statusNaAgenta } from '../src/model/agenti.js';
import { DUMI_OT_KNIGATA } from '../src/model/dumi-ot-knigata.js';
import { MODEL, NOMENKLATURA, PROZORTSI, SLUZHEBEN_LIST } from '../src/model/osnova.js';
import { otpechatakNaModela } from '../src/model/otpechatak.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import { KNIGA, knigaZaTest, STOPANIN } from './pomoshtni.js';

const KOGATO = '2026-09-05T13:00:00.000Z';
const PRAZEN = { plosht: null, tsena: null, papka: null, adres: null };

async function knigata() {
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
  const imot = (id: string, ime: string, sastoyanie: number) =>
    zapishi(id, 'imoti.sazdayImot', {
      kletki: { ime: { tekst: ime }, sastoyanie: { nomer: sastoyanie }, nomer: null, ...PRAZEN },
    });
  await imot('i1', 'Герман', 1);
  await imot('i2', 'Гара Яна', 2);
  await imot('i3', 'Студентски Град', 2);
  const obekt = (
    id: string,
    imot: string,
    kategoriya: number,
    vid: number,
    nomer: number,
    oshte: Record<string, unknown> = {},
  ) =>
    zapishi(id, 'imoti.dobaviObekt', {
      kletki: {
        imot: { tekst: imot },
        kategoriya: { nomer: kategoriya },
        vid: { nomer: vid },
        nomer: { chislo: nomer },
        ...PRAZEN,
        ...oshte,
      },
    });
  await obekt('o1', 'imot:i3', 1, 1, 27, {
    tsena: { stoynost_st: 12345678 },
    plosht: { chislo: 851234 },
  });
  await obekt('o2', 'imot:i3', 1, 2, 8);
  await obekt('o3', 'imot:i3', 2, 1, 11);
  await obekt('o4', 'imot:i2', 1, 4, 1);
  await obekt('o5', 'imot:i2', 1, 4, 2);
  await zapishi('x1', 'red.izklyuchi', { tablitsa: 'obekti', id: 'obekt:o5' });
  const biznes = (id: string, imot: string, sastoyanie: number, nomer: number) =>
    zapishi(id, 'imoti.dobaviBiznes', {
      kletki: {
        imot: { tekst: imot },
        sastoyanie: { nomer: sastoyanie },
        nomer: { chislo: nomer },
        ...PRAZEN,
        drugi: { tekst: '?' },
      },
    });
  await biznes('b1', 'imot:i2', 1, 1);
  await biznes('b2', 'imot:i2', 2, 2);
  await biznes('b3', 'imot:i3', 2, 1);
  // спряна стойност, която един ред вече държи · Герман е ПИ (№ 1)
  await zapishi('s1', 'nastroyki.spriStoynost', {
    nomenklatura: NOMENKLATURA.sastoyanieNaImot,
    nomer: 1,
    belezi: {},
  });
  await zapishi('s2', 'nastroyki.dobaviStoynost', {
    nomenklatura: NOMENKLATURA.sastoyanieNaImot,
    tekst: 'Продаден',
    belezi: {},
  });
  return iz;
}

async function iznesena() {
  const iz = await knigata();
  const o = iz.ogledalo();
  const kursor = o.kursori.get(KNIGA)!;
  const kniga = knigataOtOgledaloto(o, kursor, KOGATO);
  const procheteno = await prochetiKniga(await napishiKniga(kniga.listove));
  const list = (ime: string): ProchetenList => procheteno.listove.find((l) => l.ime === ime)!;
  return { iz, o, kursor, kniga, procheteno, list };
}

const IMOTI = PROZORTSI.find((p) => p.klyuch === 'imoti')!.list;
const NASTROYKI = PROZORTSI.find((p) => p.klyuch === 'nastroyki')!.list;
const UPRAVLENIE = PROZORTSI.find((p) => p.klyuch === 'upravlenie')!.list;
const SMETKI = PROZORTSI.find((p) => p.klyuch === 'smetki')!.list;
const SLUZHITELI = PROZORTSI.find((p) => p.klyuch === 'sluzhiteli')!.list;

describe('Книгата на изход', () => {
  it('осем листа в реда му + служебният, скрит · сверката на всеки лист затваря', async () => {
    const { kniga, procheteno } = await iznesena();
    expect(procheteno.listove.map((l) => l.ime)).toEqual([
      ...PROZORTSI.map((p) => p.list),
      SLUZHEBEN_LIST,
    ]);
    expect(procheteno.listove.map((l) => l.skrit)).toEqual([...PROZORTSI.map(() => false), true]);
    expect(kniga.sverki).toHaveLength(9);
    for (const s of kniga.sverki) expect(s.nared, s.kakvo).toBe(true);
    expect(kniga.redove).toEqual({
      imoti: 3,
      obekti: 4,
      biznesi: 3,
      zadachi: 0,
      dvizheniya: 0,
      kesh: 0,
      dds: 0,
      stopani: 0,
      sluzhiteli: 0,
      dostap: 0,
    });
  });

  it('инструкциите му стоят дословно · на неговите редове в непостроените прозорци', async () => {
    const { list } = await iznesena();
    const profil = list(PROZORTSI[0]!.list);
    for (const d of DUMI_OT_KNIGATA.profil) {
      expect(profil.kletki[d.red - 1]?.[1]).toBe(d.tekst);
      expect(String(profil.kletki[d.red - 1]?.[0])).toBe(d.nomer);
    }
    const imoti = list(IMOTI);
    expect(DUMI_OT_KNIGATA.imoti).toHaveLength(8);
    // пин с ръка · неговата B1, дословно, с двойния интервал
    expect(DUMI_OT_KNIGATA.imoti[0]?.tekst).toBe(
      'Има един бутон /Създай имот/. Създай Имот вкарва имотите в списък в таблица с данните  за имота.',
    );
    expect(imoti.kletki[0]?.[1]).toBe(DUMI_OT_KNIGATA.imoti[0]?.tekst);
    expect(imoti.kletki[1]?.[1]).toBe(DUMI_OT_KNIGATA.imoti[1]?.tekst);
  });

  it('ИмотиОбектиБизнеси · лента · глава · данни, три пъти · номерацията е текст · групови редове', async () => {
    const { list } = await iznesena();
    const imoti = list(IMOTI);
    const k = imoti.kletki;
    // ред 3 празен · ред 4 лентата (слята) · ред 5 главата му · ред 6–8 трите Имота
    expect(k[2]).toEqual([]);
    expect(k[3]?.[0]).toBe('Имоти');
    expect(imoti.slivaniya).toContain('A4:H4');
    expect(k[4]?.slice(0, 8)).toEqual([
      '№',
      'име Имот',
      'Състояние',
      '№',
      'площ',
      'цена',
      'папка в драйва',
      'адрес гугъл',
    ]);
    expect(k[4]?.[9]).toBe('Ключ');
    // спряната стойност стои като ТЕКСТ (решение 20) · валидацията я няма в списъка
    expect(k[5]?.slice(0, 3)).toEqual(['1', 'Герман', 'ПИ']);
    expect(k[6]?.slice(0, 3)).toEqual(['2', 'Гара Яна', 'УПИ']);
    expect(k[7]?.slice(0, 3)).toEqual(['3', 'Студентски Град', 'УПИ']);
    expect(k[5]?.[9]).toBe('imot:i1');
    // Обектите · инструкции 10–12 · лента 14 · глава 15 · група 2.1 · Гара Яна · Сграда
    // неговият ред: инструкции 10–12 · лента 13 · глава 14 · група 15 (без празен ред след блока)
    expect(k[12]?.[0]).toBe('Обекти добавени към Имоти');
    expect(imoti.slivaniya).toContain('A13:H13');
    const redNaGrupata = k.findIndex((r) => r[0] === '2.1');
    expect(redNaGrupata).toBe(14);
    expect(k[redNaGrupata]?.slice(0, 3)).toEqual(['2.1', 'Гара Яна', 'Сграда']);
    expect(k[redNaGrupata]?.[9]).toBe('grupa:imot:i2·1');
    expect(k[redNaGrupata + 1]?.slice(0, 4)).toEqual(['2.1.4.1', null, 'склад', 1]);
    // изключеният 2.1.4.2 го няма
    expect(k.some((r) => r[0] === '2.1.4.2')).toBe(false);
    const apartament = k.find((r) => r[0] === '3.1.1.27')!;
    expect(apartament.slice(0, 6)).toEqual([
      '3.1.1.27',
      null,
      'апартамент',
      27,
      85.1234,
      123456.78,
    ]);
    expect(k.some((r) => r[0] === '3.2')).toBe(true);
    // Бизнесите · 2.3.1 и 2.3.2 под Гара Яна със слято име · 3.3.1 под Студентски Град
    const b1 = k.findIndex((r) => r[0] === '2.3.1');
    expect(k[b1]?.slice(0, 4)).toEqual(['2.3.1', 'Гара Яна', 'ФЕЦ+Батерии', 1]);
    // слятата клетка връща стойността на господаря си и в двата реда
    expect(k[b1 + 1]?.slice(0, 4)).toEqual(['2.3.2', 'Гара Яна', 'Батерии', 2]);
    expect(imoti.slivaniya).toContain(`B${b1 + 1}:B${b1 + 2}`);
    expect(k[b1 + 2]?.slice(0, 2)).toEqual(['3.3.1', 'Студентски Град']);
    expect(k[b1]?.[8]).toBe('?');
  });

  it('„Ключ" е скрита и заключена · данните са отключени · листът е защитен', async () => {
    const { list } = await iznesena();
    const imoti = list(IMOTI);
    expect(imoti.skritiKoloni).toEqual([10]);
    expect(imoti.zashtiten).toBe(true);
    expect(imoti.otklyucheni).toContain('B6');
    expect(imoti.otklyucheni).toContain('H6');
    // целият ред с данни е отключен (и A, и J), за да може Excel да го трие; главата — не
    expect(imoti.otklyucheni).toContain('A6');
    expect(imoti.otklyucheni).toContain('J6');
    expect(imoti.otklyucheni).not.toContain('B5');
    expect(imoti.otklyucheni).not.toContain('J5');
    // ЦЕЛИЯТ ред, и K..XFD · Excel трие ред само без нито една заключена клетка (ADR-004 §6)
    expect(imoti.otklyucheniRedove).toContain(6);
    expect(imoti.otklyucheniRedove).not.toContain(5);
    // празният ред след Имотите (три Имота · ред 9) е отключен · там се дописва
    expect(imoti.otklyucheni).toContain('A9');
    expect(imoti.otklyucheni).toContain('J9');
    expect(imoti.otklyucheniRedove).toContain(9);
    expect(imoti.otklyucheni).not.toContain('A10');
    const nastroyki = list(NASTROYKI);
    expect(nastroyki.skritiKoloni).toEqual([6]);
    expect(nastroyki.zashtiten).toBe(true);
    // редът със стойност отключва C „Стойност" и E „Спряна" · не № · Белег · Ключ
    const r2 = nastroyki.kletki.findIndex((r) => r[5] === 'sastoyanie-na-imot##2') + 1;
    expect(nastroyki.otklyucheni).toContain(`C${r2}`);
    expect(nastroyki.otklyucheni).toContain(`E${r2}`);
    for (const k of ['A', 'B', 'D', 'F']) expect(nastroyki.otklyucheni).not.toContain(`${k}${r2}`);
    // празният ред след подтаблица · A..E, за да се допише стойност; ключът F остава заключен —
    // иначе копие на цял ред би пренесло ключа и Сверчикът би чел „преименувана"
    let prazen = r2;
    while (nastroyki.kletki[prazen]?.some((v) => v !== null && v !== undefined)) prazen += 1;
    for (const k of ['A', 'B', 'C', 'D', 'E'])
      expect(nastroyki.otklyucheni).toContain(`${k}${prazen + 1}`);
    expect(nastroyki.otklyucheni).not.toContain(`F${prazen + 1}`);
  });

  it('листът ИИ носи инструкциите му и двете таблици с агенти · петте реда със статус', async () => {
    const { list } = await iznesena();
    const ii = list(PROZORTSI.find((p) => p.klyuch === 'ii')!.list);
    // пин с ръка · неговите пет реда и седемте му глави (zadanie/07 · A7–G7 · B8–D12)
    expect(AGENTI).toHaveLength(5);
    expect(AGENTI.map((a) => a.dlazhnost)).toEqual([
      'Сверчик',
      'Архитект',
      'Инвеститор',
      'Брокер',
      'Анализатор',
    ]);
    expect(GLAVI_NA_AGENTITE).toEqual([
      '№',
      'агент',
      'длъжност',
      'задача',
      'статус',
      'време',
      'отчет',
    ]);
    expect(ii.kletki[5]?.[0]).toBe('Активни агенти');
    expect(ii.kletki[6]).toEqual([...GLAVI_NA_AGENTITE]);
    expect(ii.kletki.slice(7, 12).map((r) => [r[0], r[1], r[2], r[4]])).toEqual(
      AGENTI.map((a) => [a.nomer, a.agent, a.dlazhnost, statusNaAgenta(a)]),
    );
    expect(ii.kletki[12]?.[0]).toBe('Неактивни агенти');
    expect(ii.kletki[13]).toEqual([...GLAVI_NA_AGENTITE]);
    expect(ii.slivaniya).toEqual(['A6:G6', 'A13:G13']);
    expect(ii.kletki).toHaveLength(14);
  });

  it('валидациите сочат подтаблиците на Настройки · само живите стойности', async () => {
    const { list } = await iznesena();
    const imoti = list(IMOTI);
    const nastroyki = list(NASTROYKI);
    const sastoyanie = imoti.validatsii.find((v) => v.obhvat === 'C6')!;
    expect(sastoyanie.formula).toMatch(
      new RegExp(
        `^'${NASTROYKI.replace('(', '\\(').replace(')', '\\)')}'!\\$C\\$\\d+:\\$C\\$\\d+$`,
      ),
    );
    const m = /\$C\$(\d+):\$C\$(\d+)/.exec(sastoyanie.formula)!;
    const ot = Number(m[1]);
    const doo = Number(m[2]);
    const stoynosti = nastroyki.kletki.slice(ot - 1, doo).map((r) => r[2]);
    // живите: УПИ · Строеж · Продаден · спряната ПИ е под тях, извън обхвата
    expect(stoynosti).toEqual(['УПИ', 'Строеж', 'Продаден']);
    expect(nastroyki.kletki[doo]?.slice(1, 5)).toEqual([1, 'ПИ', null, 'спряна']);
    // Видът на обекта сочи всички живи видове · и категорията на реда му е в „Белег"
    const vid = imoti.validatsii.find(
      (v) => v.formula.includes('$C$') && v.obhvat.startsWith('C') && v !== sastoyanie,
    );
    expect(vid).toBeDefined();
    const npm = nastroyki.kletki.find((r) => r[2] === 'НПМ')!;
    expect(npm.slice(1, 4)).toEqual([1, 'НПМ', '2']);
  });

  it('служебният лист носи версия · отпечатък · курсор · местата на таблиците', async () => {
    const { list, kursor } = await iznesena();
    const s = list(SLUZHEBEN_LIST);
    expect(s.kletki[0]).toEqual(['versiya', 1]);
    expect(s.kletki[1]?.[1]).toBe(otpechatakNaModela(MODEL));
    expect(s.kletki[2]).toEqual(['kursor', KNIGA, kursor.seq, kursor.hash]);
    expect(s.kletki[4]).toEqual(['stopanin', STOPANIN]);
    // върхът на ВСЯКА верига · тук една · сблъсъкът се мери по веригата на реда
    expect(s.kletki.filter((r) => r[0] === 'veriga')).toEqual([
      ['veriga', KNIGA, kursor.seq, kursor.hash],
    ]);
    const tablitsi = s.kletki.filter((r) => r[0] === 'tablitsa');
    expect(tablitsi.map((r) => [r[1], r[2], r[5]])).toEqual([
      ['imoti', IMOTI, 3],
      ['obekti', IMOTI, 4],
      ['biznesi', IMOTI, 3],
      ['zadachi', UPRAVLENIE, 0],
      ['dvizheniya', SMETKI, 0],
      ['kesh', SMETKI, 0],
      ['dds', SMETKI, 0],
      ['stopani', SLUZHITELI, 0],
      ['sluzhiteli', SLUZHITELI, 0],
      ['dostap', SLUZHITELI, 0],
    ]);
    expect(tablitsi[0]?.[3]).toBe('A6:J8');
    const nomenklaturi = s.kletki.filter((r) => r[0] === 'nomenklatura');
    expect(nomenklaturi).toHaveLength(11);
    // целият обхват на подтаблицата + живите · и двете с адрес
    for (const r of nomenklaturi) expect(String(r[3])).toMatch(/^A\d+:F\d+$/);
  });

  it('кръгът · всеки жив ред се намира по ключа си и носи стойностите си до цента', async () => {
    const { o, list } = await iznesena();
    const imoti = list(IMOTI);
    const poKlyuch = new Map(imoti.kletki.map((r) => [r[9], r]));
    let proverni = 0;
    for (const [klyuch, t] of o.tablitsi) {
      for (let i = 0; i < t.broy; i += 1) {
        if (t.izklyuchen[i] === 1) continue;
        const red = poKlyuch.get(t.id[i]!);
        expect(red, `${klyuch} ${t.id[i]}`).toBeDefined();
        const tsena = t.koloni.get('tsena')!.danni[i]!;
        if (!Number.isNaN(tsena)) {
          expect(Math.round((red![5] as number) * 100)).toBe(tsena);
        }
        proverni += 1;
      }
    }
    expect(proverni).toBe(10);
  });
});

describe('листът УправлениеДелаПреписки (ADR-005)', () => {
  /** Книгата с три задачи · под Имот · под Обект · под Обект с бюджет и дати */
  async function sZadachi() {
    const iz = await knigata();
    const zapishi = async (id: string, klyuch: string, tovar: unknown) => {
      const r = await iz.izpalni(id, klyuch, tovar);
      if ('otkaz' in r) throw new Error(r.zashto.join(' | '));
    };
    const zadacha = (
      id: string,
      kam: string,
      vid: number,
      ime: string,
      oshte: Record<string, unknown> = {},
    ) =>
      zapishi(id, 'upravlenie.dobaviZadacha', {
        kletki: {
          kam: { tekst: kam },
          vid: { nomer: vid },
          ime: { tekst: ime },
          ot: null,
          do: null,
          otsenka: null,
          byudzhet: null,
          ...oshte,
        },
      });
    await zadacha('z1', 'imot:i1', 1, 'Сондаж', {
      ot: { tekst: '2026-09-10' },
      do: { tekst: '2026-09-12' },
      otsenka: { nomer: 1 },
      byudzhet: { stoynost_st: 25000000 },
    });
    await zadacha('z2', 'obekt:o1', 2, 'Брокер', { ot: { tekst: '2026-11-03' } });
    await zadacha('z3', 'obekt:o1', 1, 'СМР', { byudzhet: { stoynost_st: 115 } });
    const o = iz.ogledalo();
    const kursor = o.kursori.get(KNIGA)!;
    const kniga = knigataOtOgledaloto(o, kursor, KOGATO);
    const procheteno = await prochetiKniga(await napishiKniga(kniga.listove));
    return { kniga, list: procheteno.listove.find((l) => l.ime === UPRAVLENIE)! };
  }

  it('инструкции · Бутони с думите му · две глави · „филтър" · дървото с ключове · такт · СБОР', async () => {
    const { kniga, list } = await sZadachi();
    const k = list.kletki;
    expect(kniga.redove['zadachi']).toBe(3);
    // 1–12 инструкциите му · 13 лентата Бутони · 14–15 бутоните със сливанията му
    expect(k[0]?.[1]).toBe('/Добави Дело/(Дело към Имот или към Обект)');
    expect(k[12]?.[0]).toBe('Бутони');
    expect(list.slivaniya).toContain('A13:R13');
    expect(k[13]?.[0]).toMatch(/^Отвори\(/);
    // слятата клетка носи думата и в двете си клетки при четене
    expect(k[13]?.slice(11, 13)).toEqual(['Период', 'Период']);
    expect(k[14]?.slice(11, 13)).toEqual(['начало ', 'край']);
    expect(k[14]?.slice(14, 18)).toEqual(['ден', 'месец', 'тримесечие', 'година']);
    expect(list.slivaniya).toContain('A14:A15');
    expect(list.slivaniya).toContain('L14:M14');
    expect(list.slivaniya).toContain('O14:R14');
    // 16 двете ленти · 17 главите му + „такт" ×8 + Ключ в S · 18 подглавите · 19 „филтър"
    expect(k[15]?.[0]).toBe('ОБЕКТИ');
    expect(k[15]?.[9]).toBe('Диаграма Гант (Календар)');
    expect(k[16]?.slice(0, 10)).toEqual([
      '№',
      'име Имот',
      ' Състояние за Имот или Състояние на Обект',
      '№',
      ' Задачи(нещо като състояние за Делата, Срещите и Преписките).',
      'Дата',
      'Оценка',
      'площ',
      'цена',
      'Бюджет Дела/ Бюджет Сметки',
    ]);
    expect(k[16]?.slice(10, 18)).toEqual(Array.from({ length: 8 }, () => 'такт'));
    expect(k[16]?.[18]).toBe('Ключ');
    expect(k[17]?.[5]).toBe('Начало/Край');
    // тактът · осем месеца от предишния · KOGATO е 05.09.2026 → авг 2026 … мар 2027
    expect(k[17]?.slice(10, 18)).toEqual([
      'авг 26',
      'сеп 26',
      'окт 26',
      'ное 26',
      'дек 26',
      'яну 27',
      'фев 27',
      'мар 27',
    ]);
    expect(k[18]?.slice(0, 3)).toEqual([null, 'филтър', 'филтър']);
    expect(list.skritiKoloni).toEqual([19]);
    // дървото · Имотът е групов ред с ключ · задачата под него · слетите клетки · ■ в такта
    expect(k[19]?.slice(0, 3)).toEqual(['1', 'Герман', 'ПИ']);
    expect(k[19]?.[18]).toBe('grupa:imot:i1');
    expect(k[20]?.slice(4, 7)).toEqual([
      'Дело / Сондаж',
      '2026-09-10 / 2026-09-12',
      'Спешно и Важно',
    ]);
    expect(k[20]?.[9]).toBe(250000);
    expect(k[20]?.slice(10, 18)).toEqual([null, '■', null, null, null, null, null, null]);
    expect(k[20]?.[18]).toBe('zadacha:z1');
    const o1 = k.findIndex((r) => r[18] === 'grupa:obekt:o1');
    expect(k[o1]?.slice(0, 4)).toEqual(['3.1.1.27', 'Студентски Град', 'апартамент', 27]);
    // под Обекта · по началото: Брокер (ноември) е след СМР (без дата)? не — без дата е последно
    expect(k[o1 + 1]?.slice(4, 6)).toEqual(['Среща / Брокер', '2026-11-03']);
    expect(k[o1 + 1]?.slice(10, 18)).toEqual([null, null, null, '■', null, null, null, null]);
    expect(k[o1 + 2]?.[4]).toBe('Дело / СМР');
    expect(k[o1 + 2]?.[9]).toBe(1.15);
    // СБОР · брой задачи · бюджетът · по такт, по началото на задачата
    const sbor = k.findIndex((r) => r[0] === 'сбор');
    expect(sbor).toBeGreaterThan(o1 + 2);
    expect(k[sbor]?.[1]).toBe(3);
    expect(k[sbor]?.[9]).toBe(250001.15);
    expect((k[sbor] ?? []).slice(10, 18).filter((v) => v !== null && v !== undefined)).toEqual([
      250000,
    ]);
    expect(k[sbor]?.[11]).toBe(250000);
    // отключени са редовете със задачи (E..S) и празният ред след дървото; главите и групите — не
    expect(list.otklyucheni).toContain('E21');
    expect(list.otklyucheni).toContain('S21');
    expect(list.otklyucheni).not.toContain('A20');
    expect(list.otklyucheni).not.toContain('E20');
    expect(list.otklyucheniRedove).toContain(21);
    expect(list.otklyucheniRedove).not.toContain(20);
    expect(list.otklyucheniRedove).toContain(sbor);
    for (const s of kniga.sverki) expect(s.nared, s.kakvo).toBe(true);
  });
});
