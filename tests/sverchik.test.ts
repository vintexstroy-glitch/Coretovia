/**
 * СВЕРЧИКЪТ · неподвижната точка (износ → внос = нищо), поправка, нов ред,
 * махнат ред, номенклатурите от Настройки, растежът САМО от Настройки, редът
 * без ключ (по кортеж · по име · вмъкнат), дублите в един файл, центовете,
 * NFC — и неговата Книга (мострата) срещу празно Огледало, до изпълнение през
 * Портата и втора неподвижна точка.
 */

import { describe, expect, it } from 'vitest';
import { razpoznayKnigata } from '../src/kniga/chetene.js';
import { KLYUCH_KOLONA_UPRAVLENIE } from '../src/kniga/dumi.js';
import {
  type KletkaZaPisane,
  napishiKniga,
  type OpisNaList,
  prochetiKniga,
} from '../src/kniga/ooxml.js';
import { knigataOtOgledaloto } from '../src/kniga/pisane.js';
import { PREDLOZHENIE, sveri } from '../src/kniga/sverchik.js';
import { MODEL, NOMENKLATURA, PROZORTSI } from '../src/model/osnova.js';
import { zhiviteRedove } from '../src/ogledalo/tablitsa.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import { izpalniPredlozheniyata } from '../src/porta/vnasyane.js';
import { nomerNaRed, tekstNaNomera } from '../src/smetach/nomeratsiya.js';
import { KNIGA, knigaZaTest, STOPANIN, VERIGA_NA_SLUZHITEL } from './pomoshtni.js';
import { MOSTRA } from './mostri/mostra-kniga.js';

const KOGATO = '2026-09-05T15:00:00.000Z';
const IMOTI = PROZORTSI.find((p) => p.klyuch === 'imoti')!.list;
const NASTROYKI = PROZORTSI.find((p) => p.klyuch === 'nastroyki')!.list;
/** ключовете на действията в тестовете · детерминистични, за да е повторяем тестът */
const idNa = (i: number): string => `kniga-test:${i}`;

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
  return { k, iz, zapishi };
}

const PRAZEN = { plosht: null, tsena: null, papka: null, adres: null };

async function nashata() {
  const { iz, zapishi } = await otvori();
  await zapishi('k0', 'stopanin.otkriy', { imeyl: STOPANIN });
  await zapishi('i1', 'imoti.sazdayImot', {
    kletki: { ime: { tekst: 'Гара Яна' }, sastoyanie: { nomer: 2 }, nomer: null, ...PRAZEN },
  });
  await zapishi('i2', 'imoti.sazdayImot', {
    kletki: { ime: { tekst: 'Студентски Град' }, sastoyanie: { nomer: 2 }, nomer: null, ...PRAZEN },
  });
  await zapishi('o1', 'imoti.dobaviObekt', {
    kletki: {
      imot: { tekst: 'imot:i2' },
      kategoriya: { nomer: 1 },
      vid: { nomer: 1 },
      nomer: { chislo: 27 },
      ...PRAZEN,
      tsena: { stoynost_st: 12345678 },
    },
  });
  await zapishi('b1', 'imoti.dobaviBiznes', {
    kletki: {
      imot: { tekst: 'imot:i1' },
      sastoyanie: { nomer: 1 },
      nomer: { chislo: 1 },
      ...PRAZEN,
      drugi: null,
    },
  });
  await zapishi('b2', 'imoti.dobaviBiznes', {
    kletki: {
      imot: { tekst: 'imot:i1' },
      sastoyanie: { nomer: 2 },
      nomer: { chislo: 2 },
      ...PRAZEN,
      drugi: null,
    },
  });
  return { iz, zapishi };
}

/** Лист, който тестът може да пипа · редовете са изменяеми · слетите клетки падат (Excel ги мести сам). */
type PromenimList = Omit<OpisNaList, 'redove' | 'slivaniya'> & {
  redove: KletkaZaPisane[][];
  slivaniya: string[];
};

/** Книгата на Огледалото като листове за писане · за да се променят преди четене. */
function listove(iz: Izpalnitel): PromenimList[] {
  const o = iz.ogledalo();
  return knigataOtOgledaloto(o, o.kursori.get(KNIGA)!, KOGATO).listove.map((l) => ({
    ...l,
    redove: l.redove.map((r) => [...r]),
    slivaniya: [],
  }));
}

async function sveriListove(iz: Izpalnitel, listove: readonly OpisNaList[]) {
  const o = iz.ogledalo();
  const procheteno = await prochetiKniga(await napishiKniga(listove));
  return sveri(o, razpoznayKnigata(procheteno, o, KOGATO), KOGATO);
}

const redPoKlyuch = (l: PromenimList, klyuch: string): number =>
  l.redove.findIndex((r) => r[9] === klyuch);

/** Редът без ключ · както Excel го пише, когато човекът го е вмъкнал · без колона J. */
const bezKlyuch = (red: KletkaZaPisane[]): KletkaZaPisane[] => red.slice(0, 9);

describe('неподвижната точка', () => {
  it('износ → внос без промяна = нула предложения · нула находки · сверките затварят', async () => {
    const { iz } = await nashata();
    const otchet = await sveriListove(iz, listove(iz));
    expect(otchet.predlozheniya).toEqual([]);
    expect(otchet.nahodki).toEqual([]);
    expect(otchet.obobshtenie).toBe('0 предложения · 0 находки · 0 бележки');
    for (const s of otchet.sverki) expect(s.nared, s.kakvo).toBe(true);
    expect(otchet.sluzhebno?.kursor?.seq).toBe(6);
  });

  it('NFD „й" от друга клавиатура не е промяна · NFC още при четенето', async () => {
    const { iz, zapishi } = await nashata();
    await zapishi('i3', 'imoti.sazdayImot', {
      kletki: { ime: { tekst: 'Бойчиновци' }, sastoyanie: { nomer: 1 }, nomer: null, ...PRAZEN },
    });
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const ri3 = redPoKlyuch(imoti, 'imot:i3');
    imoti.redove[ri3]![1] = 'Бойчиновци'.normalize('NFD');
    expect(imoti.redove[ri3]![1]).not.toBe('Бойчиновци');
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya).toEqual([]);
  });
});

describe('променена Книга', () => {
  it('сменена цена → поправка · дописан Имот → нов ред · махнат Бизнес → изключване, неотметнато', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    // цената на Обекта · F · 123 456,78 → 99 999,50
    const ro = redPoKlyuch(imoti, 'obekt:o1');
    imoti.redove[ro]![5] = 99999.5;
    // нов Имот на реда под последния (Имоти свършват на ред 7; ред 8 е празен)
    const ri2 = redPoKlyuch(imoti, 'imot:i2');
    imoti.redove.splice(ri2 + 1, 0, [null, 'Панчарево', 'УПИ', null, 12.5, 250000]);
    // Бизнес b2 изчезва
    const rb2 = redPoKlyuch(imoti, 'biznes:b2');
    imoti.redove.splice(rb2, 1);
    const otchet = await sveriListove(iz, l);
    expect(otchet.nahodki.filter((n) => n.stepen === 'greshka')).toEqual([]);
    expect(otchet.predlozheniya.map((p) => [p.vid, p.poPodrazbirane])).toEqual([
      ['nov-red', true],
      ['popravka', true],
      ['izklyuchi', false],
    ]);
    const nov = otchet.predlozheniya[0]!;
    expect(nov.vid === 'nov-red' && nov.kletki).toEqual({
      ime: { tekst: 'Панчарево' },
      sastoyanie: { nomer: 2 },
      plosht: { chislo: 125000 },
      tsena: { stoynost_st: 25000000 },
    });
    const popravka = otchet.predlozheniya[1]!;
    expect(popravka.vid === 'popravka' && popravka.kletki).toEqual({
      tsena: { stoynost_st: 9999950 },
    });
    expect(popravka.vid === 'popravka' && popravka.razliki[0]?.kakvo).toBe('цена');
    expect(otchet.predlozheniya[2]!.zashto).toMatch(/^1\.3\.2 го няма в Книгата/); // b2 е под Имот 1 · „Гара Яна"
  });

  it('вмъкнат Имот в средата е НОВ ред, не преименуване на чуждия · номерът му е позиция', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    // между i1 (ред 6) и i2 (ред 7) · в Excel A би станало „2" и i2 би слязъл на „3"
    const ri2 = redPoKlyuch(imoti, 'imot:i2');
    imoti.redove.splice(ri2, 0, ['2', 'Панчарево', 'УПИ']);
    imoti.redove[ri2 + 1]![0] = '3';
    const otchet = await sveriListove(iz, l);
    expect(otchet.nahodki.filter((n) => n.stepen === 'greshka')).toEqual([]);
    expect(otchet.predlozheniya.map((p) => p.vid)).toEqual(['nov-red']);
    const nov = otchet.predlozheniya[0]!;
    expect(nov.vid === 'nov-red' && nov.kletki['ime']).toEqual({ tekst: 'Панчарево' });
  });

  it('Имот без ключ · същото име → поправка на него (бележка) · две живи с това име → грешка', async () => {
    const { iz, zapishi } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const ri1 = redPoKlyuch(imoti, 'imot:i1');
    imoti.redove[ri1] = bezKlyuch(imoti.redove[ri1]!);
    imoti.redove[ri1]![4] = 7.5; // площ · нова
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya.map((p) => [p.vid, 'id' in p ? p.id : ''])).toEqual([
      ['popravka', 'imot:i1'],
    ]);
    expect(otchet.nahodki.map((n) => [n.stepen, n.kakvo])).toEqual([
      ['beleshka', 'Редът няма ключ — разпознат по името „Гара Яна" (1).'],
    ]);
    // втори жив Имот с това име · вече не се знае кой
    await zapishi('i3', 'imoti.sazdayImot', {
      kletki: { ime: { tekst: 'Гара Яна' }, sastoyanie: { nomer: 1 }, nomer: null, ...PRAZEN },
    });
    const l2 = listove(iz);
    const imoti2 = l2.find((x) => x.ime === IMOTI)!;
    const r1 = redPoKlyuch(imoti2, 'imot:i1');
    imoti2.redove[r1] = bezKlyuch(imoti2.redove[r1]!);
    const dvusmisleno = await sveriListove(iz, l2);
    // Бизнесите с ключ под „Гара Яна" мълчат: родителят им е известен, името е същото
    expect(dvusmisleno.nahodki.map((n) => [n.stepen, n.kakvo])).toEqual([
      ['greshka', '„Гара Яна" е име на 2 живи реда — без ключ не се знае кой; редът не влиза.'],
    ]);
    // и живият, който не е видян, се предлага за изключване (неотметнато)
    expect(dvusmisleno.predlozheniya.map((p) => p.vid)).toEqual(['izklyuchi']);
  });

  it('Обект без ключ · същият кортеж 3.1.1.27 → поправка на него · друг номер → нов ред', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const ro = redPoKlyuch(imoti, 'obekt:o1');
    imoti.redove[ro] = bezKlyuch(imoti.redove[ro]!);
    imoti.redove[ro]![5] = 1; // цената → 1,00
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya.map((p) => [p.vid, 'id' in p ? p.id : ''])).toEqual([
      ['popravka', 'obekt:o1'],
    ]);
    const l2 = listove(iz);
    const imoti2 = l2.find((x) => x.ime === IMOTI)!;
    const ro2 = redPoKlyuch(imoti2, 'obekt:o1');
    imoti2.redove.splice(ro2 + 1, 0, [null, null, 'апартамент', 28]);
    const nov = await sveriListove(iz, l2);
    expect(nov.predlozheniya.map((p) => p.vid)).toEqual(['nov-red']);
    expect(nov.predlozheniya[0]!.zashto).toMatch(/Нов ред в „Обекти/);
  });

  it('два нови реда с един номер в един файл · вторият е грешка · два нови Имота с едно име също', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const ro = redPoKlyuch(imoti, 'obekt:o1');
    imoti.redove.splice(ro + 1, 0, [null, null, 'апартамент', 28], [null, null, 'апартамент', 28]);
    const ri2 = redPoKlyuch(imoti, 'imot:i2');
    imoti.redove.splice(ri2 + 1, 0, [null, 'Панчарево', 'УПИ'], [null, 'Панчарево', 'ПИ']);
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya.map((p) => p.vid)).toEqual(['nov-red', 'nov-red']);
    expect(otchet.nahodki.map((n) => [n.stepen, n.adres])).toEqual([
      ['greshka', 'A9'],
      ['greshka', `A${ro + 5}`],
    ]);
    expect(otchet.nahodki[0]!.kakvo).toMatch(/Същият Имот по име вече е нов ред в Книгата \(A8\)/);
    expect(otchet.nahodki[1]!.kakvo).toMatch(/Същият номер вече е нов ред/);
  });

  it('празна задължителна клетка не изпразва · празна незадължителна изпразва · нецяло не се чете', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const ro = redPoKlyuch(imoti, 'obekt:o1');
    imoti.redove[ro]![2] = null; // Видът (задължителен) · празен → остава
    imoti.redove[ro]![5] = null; // цената · празна → изпразва
    const ri1 = redPoKlyuch(imoti, 'imot:i1');
    imoti.redove[ri1]![5] = 12.345; // нецяло → находка
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya.map((p) => p.vid)).toEqual(['popravka']);
    const p = otchet.predlozheniya[0]!;
    expect(p.vid === 'popravka' && p.kletki).toEqual({ tsena: null });
    expect(otchet.nahodki.map((n) => [n.adres, n.stepen])).toEqual([
      ['F6', 'greshka'],
      [`C${ro + 1}`, 'beleshka'],
    ]);
  });

  it('законните центове минават · 1,15 · 0,29 · 85,12 · и площта 85,12 кв. м', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const ri1 = redPoKlyuch(imoti, 'imot:i1');
    const ri2 = redPoKlyuch(imoti, 'imot:i2');
    const ro = redPoKlyuch(imoti, 'obekt:o1');
    imoti.redove[ri1]![5] = 1.15;
    imoti.redove[ri2]![5] = 0.29;
    imoti.redove[ro]![5] = 85.12;
    imoti.redove[ro]![4] = 85.12;
    const otchet = await sveriListove(iz, l);
    expect(otchet.nahodki).toEqual([]);
    expect(otchet.predlozheniya.map((p) => (p.vid === 'popravka' ? p.kletki : null))).toEqual([
      { tsena: { stoynost_st: 115 } },
      { tsena: { stoynost_st: 29 } },
      { plosht: { chislo: 851200 }, tsena: { stoynost_st: 8512 } },
    ]);
  });

  it('Настройки · нова стойност в празния ред · преименувана · изтрита = спряна', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const nastroyki = l.find((x) => x.ime === NASTROYKI)!;
    const r = (klyuch: string) => nastroyki.redove.findIndex((x) => x[5] === klyuch);
    nastroyki.redove[r('sastoyanie-na-imot##2')]![2] = 'УПИ (Урегулиран Поземлен Имот)';
    nastroyki.redove[r('sastoyanie-na-imot##3')]![2] = null;
    // празният ред след подтаблицата · веднага след № 3
    nastroyki.redove[r('sastoyanie-na-imot##3') + 1] = [null, null, 'Продаден'];
    // нов Вид под Паркинг · белегът по текста на категорията
    nastroyki.redove[r('vid-na-obekt#2#1') + 1] = [null, null, 'ППМ', 'Паркинг'];
    const otchet = await sveriListove(iz, l);
    expect(otchet.nahodki.filter((n) => n.stepen === 'greshka')).toEqual([]);
    expect(
      otchet.predlozheniya.map((p) => [
        p.vid,
        'tekst' in p ? p.tekst : '',
        'nomer' in p ? p.nomer : 0,
      ]),
    ).toEqual([
      ['preimenuvana', 'УПИ (Урегулиран Поземлен Имот)', 2],
      ['spryana', 'Строеж', 3],
      ['nova-stoynost', 'Продаден', 4],
      ['nova-stoynost', 'ППМ', 2],
    ]);
    const ppm = otchet.predlozheniya[3]!;
    expect(ppm.vid === 'nova-stoynost' && ppm.belezi).toEqual({ kategoriya: 2 });
  });

  it('непозната дума в таблица е ГРЕШКА · „добави я в Настройки" · менюто расте само оттам', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const ri1 = redPoKlyuch(imoti, 'imot:i1');
    imoti.redove[ri1]![2] = 'Продаден';
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya).toEqual([]);
    expect(otchet.nahodki.map((n) => [n.stepen, n.adres, n.kakvo])).toEqual([
      [
        'greshka',
        `C${ri1 + 1}`,
        '„Продаден" не е в „Състояние на Имот" — добави я в подтаблицата на листа Настройки(Стопанин) и зареди пак.',
      ],
    ]);
  });

  it('същата дума в Настройки И в таблицата → нова стойност + редът я сочи · и минава през Портата', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const nastroyki = l.find((x) => x.ime === NASTROYKI)!;
    const ri1 = redPoKlyuch(imoti, 'imot:i1');
    imoti.redove[ri1]![2] = 'Продаден';
    const r3 = nastroyki.redove.findIndex((x) => x[5] === 'sastoyanie-na-imot##3');
    nastroyki.redove[r3 + 1] = [null, null, 'Продаден'];
    const otchet = await sveriListove(iz, l);
    expect(otchet.nahodki).toEqual([]);
    expect(otchet.predlozheniya.map((p) => p.vid)).toEqual(['nova-stoynost', 'popravka']);
    expect(otchet.predlozheniya[1]!.zavisiOt).toEqual([0]);
    const p1 = otchet.predlozheniya[1]!;
    expect(p1.vid === 'popravka' && p1.kletki).toEqual({ sastoyanie: { nomer: 4 } });
    const r = await izpalniPredlozheniyata(iz, otchet.predlozheniya, new Set([0, 1]), idNa, KOGATO);
    expect(r.prieti).toBe(2);
    expect(r.otkaz).toBeNull();
    expect(r.sverka.nared).toBe(true);
    const o = iz.ogledalo();
    expect(o.nomenklaturi.get(NOMENKLATURA.sastoyanieNaImot)!.stoynosti.at(-1)?.tekst).toBe(
      'Продаден',
    );
    const sled = await sveriListove(iz, listove(iz));
    expect(sled.predlozheniya).toEqual([]);
  });

  it('дописан Имот в празния ред под Имотите · инструкциите на Обектите не стават данни', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const ri2 = redPoKlyuch(imoti, 'imot:i2');
    // празният ред след последния Имот (ред 8) · веднага под него са инструкциите на Обектите
    expect(imoti.redove[ri2 + 1]).toEqual([]);
    imoti.redove[ri2 + 1] = [null, 'Панчарево', 'УПИ'];
    const otchet = await sveriListove(iz, l);
    expect(otchet.nahodki).toEqual([]);
    expect(otchet.predlozheniya.map((p) => [p.vid, 'tablitsa' in p ? p.tablitsa : ''])).toEqual([
      ['nov-red', 'imoti'],
    ]);
  });

  it('изпразнен ред с ключ = махнат → изключване, неотметнато · родителят чака децата', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    // Имот i1 и двата му Бизнеса изчезват · i1 е изпразнен (Excel не трие ред със заключена клетка)
    const ri1 = redPoKlyuch(imoti, 'imot:i1');
    imoti.redove[ri1] = [null, null, null, null, null, null, null, null, null, 'imot:i1'];
    imoti.redove.splice(redPoKlyuch(imoti, 'biznes:b2'), 1);
    imoti.redove.splice(redPoKlyuch(imoti, 'biznes:b1'), 1);
    const otchet = await sveriListove(iz, l);
    expect(otchet.nahodki).toEqual([]);
    expect(otchet.predlozheniya.map((p) => [p.vid, 'id' in p ? p.id : '', p.zavisiOt])).toEqual([
      ['izklyuchi', 'imot:i1', [1, 2]],
      ['izklyuchi', 'biznes:b1', []],
      ['izklyuchi', 'biznes:b2', []],
    ]);
    expect(otchet.predlozheniya[0]!.zashto).toMatch(/^1 „Гара Яна" е изпразнен в Книгата/);
    // изпълнението подрежда: децата, после родителят · Портата не отказва
    const r = await izpalniPredlozheniyata(
      iz,
      otchet.predlozheniya,
      new Set([0, 1, 2]),
      idNa,
      KOGATO,
    );
    expect([r.prieti, r.otkaz, r.propusnati]).toEqual([3, null, []]);
    expect(zhiviteRedove(iz.ogledalo().tablitsi.get('imoti')!)).toHaveLength(1);
  });

  it('СБЛЪСЪК · редът е пипан в програмата след износа → поправката е неотметната, с думите', async () => {
    const { iz, zapishi } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const ro = redPoKlyuch(imoti, 'obekt:o1');
    imoti.redove[ro]![5] = 99999.5;
    // междувременно в програмата цената става 1,00
    await zapishi('p1', 'red.popraviKletka', {
      tablitsa: 'obekti',
      id: 'obekt:o1',
      kletki: { tsena: { stoynost_st: 100 } },
    });
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya.map((p) => [p.vid, p.poPodrazbirane])).toEqual([
      ['popravka', false],
    ]);
    const z = otchet.predlozheniya[0]!.zashto;
    expect(
      z.startsWith(
        'СБЛЪСЪК · 2.1.1.27 е променен в програмата след износа (seq 7 > 6) · Книгата иска: цена: 1,00',
      ),
    ).toBe(true);
    expect(z).toMatch(/99.999,50/);
  });

  it('изпразнен Бизнес под ДРУГ Имот е изключване, не поправка към Имота отгоре', async () => {
    const { iz, zapishi } = await nashata();
    await zapishi('b3', 'imoti.dobaviBiznes', {
      kletki: {
        imot: { tekst: 'imot:i2' },
        sastoyanie: { nomer: 1 },
        nomer: { chislo: 1 },
        ...PRAZEN,
        drugi: null,
      },
    });
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const rb3 = redPoKlyuch(imoti, 'biznes:b3');
    imoti.redove[rb3] = [null, null, null, null, null, null, null, null, null, 'biznes:b3'];
    const otchet = await sveriListove(iz, l);
    expect(otchet.nahodki).toEqual([]);
    expect(
      otchet.predlozheniya.map((p) => [p.vid, 'id' in p ? p.id : '', p.poPodrazbirane]),
    ).toEqual([['izklyuchi', 'biznes:b3', false]]);
  });

  it('СБЛЪСЪК и от ДРУГА верига · служителят е писал след износа · и нова верига е сблъсък', async () => {
    const { iz, k } = await (async () => {
      const r = await otvori();
      await r.zapishi('k0', 'stopanin.otkriy', { imeyl: STOPANIN });
      await r.zapishi('i1', 'imoti.sazdayImot', {
        kletki: { ime: { tekst: 'Гара Яна' }, sastoyanie: { nomer: 2 }, nomer: null, ...PRAZEN },
      });
      await r.zapishi('o1', 'imoti.dobaviObekt', {
        kletki: {
          imot: { tekst: 'imot:i1' },
          kategoriya: { nomer: 1 },
          vid: { nomer: 1 },
          nomer: { chislo: 27 },
          ...PRAZEN,
          tsena: { stoynost_st: 100 },
        },
      });
      return r;
    })();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    imoti.redove[redPoKlyuch(imoti, 'obekt:o1')]![5] = 99999.5;
    // служителят, в своята верига, СЛЕД износа
    const sluzhitel = await Izpalnitel.otvori({
      vrata: k.vrata,
      dnevnik: k.dnevnik,
      model: MODEL,
      veriga: VERIGA_NA_SLUZHITEL,
      kniga: KNIGA,
      aktor: () => 'sluzhitel@example.bg',
      sega: () => '2026-09-05T15:30:00.000Z',
    });
    const r = await sluzhitel.izpalni('s1', 'red.popraviKletka', {
      tablitsa: 'obekti',
      id: 'obekt:o1',
      kletki: { tsena: { stoynost_st: 200 } },
    });
    expect('otkaz' in r).toBe(false);
    await iz.prezaredi();
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya.map((p) => [p.vid, p.poPodrazbirane])).toEqual([
      ['popravka', false],
    ]);
    expect(otchet.predlozheniya[0]!.zashto).toMatch(
      /^СБЛЪСЪК · 1\.1\.1\.27 е променен в програмата след износа \(seq 1 > 0 · нова верига vintexstroy~sluzhitel\)/,
    );
  });

  it('ред, записан в програмата СЛЕД износа, не е „махнат" · бележка, не изключване', async () => {
    const { iz, zapishi } = await nashata();
    const l = listove(iz);
    await zapishi('i3', 'imoti.sazdayImot', {
      kletki: { ime: { tekst: 'Панчарево' }, sastoyanie: { nomer: 2 }, nomer: null, ...PRAZEN },
    });
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya).toEqual([]);
    expect(otchet.nahodki.map((n) => [n.stepen, n.kakvo])).toEqual([
      [
        'beleshka',
        '3 „Панчарево" е записан в програмата след износа — Книгата е по-стара; не се изключва.',
      ],
    ]);
  });

  it('две живи с едно име · връзка по име е грешка · Бизнес с ключ при преименуван Имот пази родителя си', async () => {
    const { iz, zapishi } = await nashata();
    await zapishi('i3', 'imoti.sazdayImot', {
      kletki: { ime: { tekst: 'Гара Яна' }, sastoyanie: { nomer: 1 }, nomer: null, ...PRAZEN },
    });
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const rb1 = redPoKlyuch(imoti, 'biznes:b1');
    imoti.redove[rb1] = bezKlyuch(imoti.redove[rb1]!);
    const otchet = await sveriListove(iz, l);
    expect(otchet.nahodki.map((n) => [n.stepen, n.kakvo])).toEqual([
      [
        'greshka',
        '„Гара Яна" е име на 2 живи Имота — по име не се знае кой; редът не влиза без ключ.',
      ],
    ]);
    // с ключ · Имотът е преименуван в програмата след износа · родителят остава, цената влиза
    const { iz: iz2, zapishi: zapishi2 } = await nashata();
    const l2 = listove(iz2);
    await zapishi2('p1', 'red.popraviKletka', {
      tablitsa: 'imoti',
      id: 'imot:i1',
      kletki: { ime: { tekst: 'Гара Яна (ЖК)' } },
    });
    const imoti2 = l2.find((x) => x.ime === IMOTI)!;
    imoti2.redove[redPoKlyuch(imoti2, 'biznes:b1')]![5] = 60;
    const otchet2 = await sveriListove(iz2, l2);
    // и двата Бизнеса са под преименувания Имот · по една бележка на ред, родителят остава
    expect(otchet2.nahodki.map((n) => [n.stepen, n.kakvo])).toEqual([
      [
        'beleshka',
        'Името на Имота „Гара Яна" в Книгата е старо — родителят на реда остава, както е в програмата.',
      ],
      [
        'beleshka',
        'Името на Имота „Гара Яна" в Книгата е старо — родителят на реда остава, както е в програмата.',
      ],
    ]);
    const p = otchet2.predlozheniya.find((x) => x.vid === 'popravka' && x.id === 'biznes:b1')!;
    expect(p.vid === 'popravka' && p.kletki).toEqual({ tsena: { stoynost_st: 6000 } });
  });

  it('Настройки · друга дума в „Спряна" е грешка · повторен ключ е нова стойност · същата нова дума два пъти е една · втората зависи от първата', async () => {
    const { iz, zapishi } = await nashata();
    await zapishi('s1', 'nastroyki.spriStoynost', {
      nomenklatura: NOMENKLATURA.sastoyanieNaImot,
      nomer: 1,
      belezi: {},
    });
    const l = listove(iz);
    const nastroyki = l.find((x) => x.ime === NASTROYKI)!;
    const r = (klyuch: string) => nastroyki.redove.findIndex((x) => x[5] === klyuch);
    // спряната ПИ е ПОСЛЕДНИЯТ ред на подтаблицата · след нея е празният ред
    const rPI = r('sastoyanie-na-imot##1');
    nastroyki.redove[rPI]![4] = 'да';
    const r3 = rPI;
    nastroyki.redove[r3 + 1] = [null, 'УПИ2', 'УПИ2', null, null, 'sastoyanie-na-imot##2'];
    // празният ред на подтаблицата е зает от копието · дописваме двете нови в реда на Вид на обект? не —
    // новите стойности на „Състояние на Имот" стоят във втори и трети ред след копието
    nastroyki.redove.splice(
      r3 + 2,
      0,
      [null, null, 'Продаден'],
      [null, null, 'Наследство'],
      [null, null, 'Продаден'],
    );
    const otchet = await sveriListove(iz, l);
    expect(otchet.nahodki.map((n) => [n.stepen, n.adres, n.kakvo])).toEqual([
      [
        'greshka',
        `E${rPI + 1}`,
        '„да" в „Спряна" не е дума, която чета — пиши „спряна" или остави празно.',
      ],
      ['beleshka', `C${r3 + 2}`, 'Ключът на реда е повторен — чета го като нова стойност.'],
      [
        'beleshka',
        `C${r3 + 5}`,
        `„Продаден" вече е нова стойност в Книгата (C${r3 + 3}) — чета я веднъж.`,
      ],
    ]);
    expect(
      otchet.predlozheniya.map((p) => [
        p.vid,
        'tekst' in p ? p.tekst : '',
        'nomer' in p ? p.nomer : 0,
        p.zavisiOt,
      ]),
    ).toEqual([
      ['nova-stoynost', 'УПИ2', 4, []],
      ['nova-stoynost', 'Продаден', 5, [0]],
      ['nova-stoynost', 'Наследство', 6, [1]],
    ]);
  });

  it('думата Е в номенклатурата, но под друга категория · находката казва групата, не „добави я в Настройки"', async () => {
    const { iz, zapishi } = await nashata();
    await zapishi('o2', 'imoti.dobaviObekt', {
      kletki: {
        imot: { tekst: 'imot:i2' },
        kategoriya: { nomer: 2 },
        vid: { nomer: 1 },
        nomer: { chislo: 11 },
        ...PRAZEN,
      },
    });
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    // празният ред след Обектите стои под последната група (2.2 · Студентски Град · Паркинг)
    const ro2 = redPoKlyuch(imoti, 'obekt:o2');
    imoti.redove[ro2 + 1] = [null, null, 'апартамент', 28];
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya).toEqual([]);
    expect(otchet.nahodki.map((n) => n.kakvo)).toEqual([
      '„апартамент" е в „Вид на обект", но под „Сграда", а редът е под група ….2 (Студентски Град · Паркинг) — премести го под групата „Студентски Град · Сграда" или напиши над него групов ред „….1 · Студентски Град · Сграда".',
    ]);
  });

  it('формула без резултат е находка, не изпразване', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const ro = redPoKlyuch(imoti, 'obekt:o1');
    imoti.redove[ro]![5] = { formula: '85*100', rezultat: undefined as unknown as number };
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya).toEqual([]);
    expect(otchet.nahodki.map((n) => [n.stepen, n.adres])).toEqual([['greshka', `F${ro + 1}`]]);
    expect(otchet.nahodki[0]!.kakvo).toMatch(/^Формула без резултат \(=85\*100\)/);
  });

  it('Книга на друг Стопанин → нищо не се предлага', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const sl = l.find((x) => x.ime === '_coretovia')!;
    const rs = sl.redove.findIndex((r) => r[0] === 'stopanin');
    sl.redove[rs] = ['stopanin', 'drug@example.bg'];
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya).toEqual([]);
    expect(otchet.nahodki.map((n) => n.kakvo)).toEqual([
      'Книгата е изнесена от друг Стопанин — не се слива с тази (правило 21); нищо не се предлага.',
    ]);
  });

  it('друг Модел (отпечатък) → нищо не се предлага', async () => {
    const { iz } = await nashata();
    const l = listove(iz);
    const sl = l.find((x) => x.ime === '_coretovia')!;
    sl.redove[1] = ['otpechatak', 'друг'];
    const otchet = await sveriListove(iz, l);
    expect(otchet.predlozheniya).toEqual([]);
    expect(otchet.nahodki[0]?.kakvo).toMatch(/друг Модел/);
  });
});

describe('неговата Книга · мострата срещу празно Огледало', () => {
  it('50 предложения · петте Имота · деветте задачи · шестимата му хора · базовият Достъп НЕ се предлага', async () => {
    const { iz } = await otvori();
    await iz.izpalni('k0', 'stopanin.otkriy', { imeyl: STOPANIN });
    const o = iz.ogledalo();
    const otchet = sveri(
      o,
      razpoznayKnigata(await prochetiKniga(await napishiKniga(MOSTRA)), o, KOGATO),
      KOGATO,
    );
    const vidove = otchet.predlozheniya.map((p) => p.vid);
    expect(vidove.filter((v) => v === 'nov-red')).toHaveLength(50);
    // Стопанинът му и петимата служители · а базовите редове на Достъпа са КАРТИНА
    const poTablitsa = (klyuch: string) =>
      otchet.predlozheniya.filter((x) => 'tablitsa' in x && x.tablitsa === klyuch);
    expect(poTablitsa('stopani')).toHaveLength(1);
    expect(poTablitsa('sluzhiteli')).toHaveLength(5);
    expect(poTablitsa('dostap')).toEqual([]);
    expect(
      otchet.predlozheniya.filter((p) => p.vid === 'nov-red' && p.tablitsa === 'zadachi'),
    ).toHaveLength(9);
    // грешки има САМО от листа Сметки: в макета му K носи думи вместо числа, а
    // движението иска сума и месец — всяка липса се КАЗВА с адрес (правило 12)
    const greshki = otchet.nahodki.filter((n) => n.stepen === 'greshka');
    expect(greshki.filter((n) => n.list !== 'Сметки')).toEqual([]);
    expect(greshki.some((n) => n.kakvo.endsWith('не е сума.'))).toBe(true);
    expect(greshki.some((n) => n.kakvo.includes('задължителна е, редът не влиза'))).toBe(true);
    expect(
      otchet.predlozheniya.filter((p) => 'tablitsa' in p && p.tablitsa === 'dvizheniya'),
    ).toEqual([]);
    expect(
      otchet.nahodki.filter((n) => n.kakvo.startsWith('Номерът „5.1.1.')).map((n) => n.adres),
    ).toEqual(['A42', 'A43', 'A44', 'A45', 'A46', 'A47', 'A48']);
    const obekt = otchet.predlozheniya.find((p) => p.vid === 'nov-red' && p.tablitsa === 'obekti')!;
    expect(obekt.vid === 'nov-red' && obekt.kletki['imot']).toEqual({
      tekst: `${PREDLOZHENIE}1:imot`,
    });
    expect(obekt.zavisiOt).toEqual([1]);
    const biznes = otchet.predlozheniya.find(
      (p) => p.vid === 'nov-red' && p.tablitsa === 'biznesi',
    )!;
    expect(biznes.vid === 'nov-red' && biznes.kletki['imot']).toEqual({
      tekst: `${PREDLOZHENIE}1:imot`,
    });
  });

  it('приети до едно · Огледалото носи Книгата му · после е неподвижна точка · същите ключове = повторено', async () => {
    const { iz } = await otvori();
    await iz.izpalni('k0', 'stopanin.otkriy', { imeyl: STOPANIN });
    const o = iz.ogledalo();
    const otchet = sveri(
      o,
      razpoznayKnigata(await prochetiKniga(await napishiKniga(MOSTRA)), o, KOGATO),
      KOGATO,
    );
    const vsichki = new Set(otchet.predlozheniya.map((_p, i) => i));
    const r = await izpalniPredlozheniyata(iz, otchet.predlozheniya, vsichki, idNa, KOGATO);
    expect(r.otkaz).toBeNull();
    expect(r.prieti).toBe(50);
    expect(r.sverka.nared).toBe(true);
    const sled = iz.ogledalo();
    expect(zhiviteRedove(sled.tablitsi.get('imoti')!)).toHaveLength(5);
    expect(zhiviteRedove(sled.tablitsi.get('obekti')!)).toHaveLength(28);
    expect(zhiviteRedove(sled.tablitsi.get('biznesi')!)).toHaveLength(2);
    expect(zhiviteRedove(sled.tablitsi.get('zadachi')!)).toHaveLength(9);
    const nomera = zhiviteRedove(sled.tablitsi.get('obekti')!).map((i) =>
      tekstNaNomera(nomerNaRed(sled, 'obekti', i)),
    );
    expect(nomera).toContain('3.1.1.27');
    expect(nomera).toContain('2.1.4.1');
    expect(nomera).toContain('5.2.1.1');
    expect(
      zhiviteRedove(sled.tablitsi.get('biznesi')!).map((i) =>
        tekstNaNomera(nomerNaRed(sled, 'biznesi', i)),
      ),
    ).toEqual(['2.3.1', '2.3.2']);
    // „Приеми" втори път със СЪЩИТЕ ключове (правило 5) · нищо ново
    const vtori = await izpalniPredlozheniyata(iz, otchet.predlozheniya, vsichki, idNa, KOGATO);
    expect(vtori.povtoreni).toBe(50);
    expect(iz.ogledalo().broySabitiya).toBe(sled.broySabitiya);
    // същият файл втори път · Сверчикът вече не предлага нищо · нашата Книга също
    const pak = sveri(
      sled,
      razpoznayKnigata(await prochetiKniga(await napishiKniga(MOSTRA)), sled, KOGATO),
      KOGATO,
    );
    expect(pak.predlozheniya.filter((p) => p.vid !== 'popravka')).toEqual([]);
    const nashata = await sveriListove(iz, listove(iz));
    expect(nashata.predlozheniya).toEqual([]);
  });
});

describe('Управление · задачите през Книгата (ADR-005)', () => {
  const UPR = PROZORTSI.find((p) => p.klyuch === 'upravlenie')!.list;
  const KL = KLYUCH_KOLONA_UPRAVLENIE - 1;

  async function sZadachi() {
    const { iz, zapishi } = await nashata();
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
          otgovornik: null,
          ...oshte,
        },
      });
    await zadacha('z1', 'imot:i1', 1, 'Сондаж', {
      ot: { tekst: '2026-09-10' },
      do: { tekst: '2026-09-12' },
      byudzhet: { stoynost_st: 25000000 },
    });
    await zadacha('z2', 'obekt:o1', 2, 'Брокер');
    return { iz, zapishi };
  }

  it('износ → внос = нула предложения · и със задачи', async () => {
    const { iz } = await sZadachi();
    const otchet = await sveriListove(iz, listove(iz));
    expect(otchet.predlozheniya).toEqual([]);
    expect(otchet.nahodki).toEqual([]);
    for (const s of otchet.sverki) expect(s.nared, s.kakvo).toBe(true);
  });

  it('сменен бюджет и край → поправка · дописана задача под Обект без ключ → нов ред към него · махната → изключване', async () => {
    const { iz } = await sZadachi();
    const l = listove(iz);
    const upr = l.find((x) => x.ime === UPR)!;
    const rz1 = upr.redove.findIndex((r) => r[KL] === 'zadacha:z1');
    upr.redove[rz1]![9] = 300000; // J · бюджетът
    upr.redove[rz1]![5] = '2026-09-10 / 2026-09-30'; // F · краят
    // дописана задача под Обекта · веднага под груповия му ред · само E
    const ro1 = upr.redove.findIndex((r) => r[KL] === 'grupa:obekt:o1');
    const nov: (typeof upr.redove)[number] = [];
    nov[4] = 'Дело / СМР';
    nov[6] = 'Спешно';
    upr.redove.splice(ro1 + 1, 0, nov);
    // z2 изчезва
    const rz2 = upr.redove.findIndex((r) => r[KL] === 'zadacha:z2');
    upr.redove.splice(rz2, 1);
    const otchet = await sveriListove(iz, l);
    expect(otchet.nahodki.filter((n) => n.stepen === 'greshka')).toEqual([]);
    expect(
      otchet.predlozheniya.map((p) => ['tablitsa' in p ? p.tablitsa : '', p.vid, p.poPodrazbirane]),
    ).toEqual([
      ['zadachi', 'popravka', true],
      ['zadachi', 'nov-red', true],
      ['zadachi', 'izklyuchi', false],
    ]);
    const popravka = otchet.predlozheniya[0]!;
    expect(popravka.vid === 'popravka' && popravka.kletki).toEqual({
      do: { tekst: '2026-09-30' },
      byudzhet: { stoynost_st: 30000000 },
    });
    const novRed = otchet.predlozheniya[1]!;
    expect(novRed.vid === 'nov-red' && novRed.kletki).toEqual({
      kam: { tekst: 'obekt:o1' },
      vid: { nomer: 1 },
      ime: { tekst: 'СМР' },
      otsenka: { nomer: 2 },
    });
    expect(novRed.zashto).toBe('Нова задача: към 2.1.1.27 · Вид Дело · име СМР · Оценка Спешно.');
    expect(otchet.predlozheniya[2]!.zashto).toMatch(/„Брокер" го няма в Книгата/);
    // приемат се и трите · Огледалото: z1 поправена · нова под Обекта · z2 изключена
    const r = await izpalniPredlozheniyata(
      iz,
      otchet.predlozheniya,
      new Set([0, 1, 2]),
      idNa,
      KOGATO,
    );
    expect(r.otkaz).toBeNull();
    expect(r.prieti).toBe(3);
    const sled = iz.ogledalo();
    const tv = sled.tablitsi.get('zadachi')!;
    expect(zhiviteRedove(tv)).toHaveLength(2);
    // същата Книга втори път · новата задача без ключ се разпознава по родител · вид · име · начало
    const pak = await sveriListove(iz, l);
    expect(pak.predlozheniya).toEqual([]);
    expect(pak.nahodki.map((n) => n.kakvo)).toEqual([
      'Редът няма ключ — разпознат по родител · вид · име · начало.',
    ]);
  });

  it('задача без ключ под НОВ Имот от същата Книга → сочи предложението му', async () => {
    const { iz } = await sZadachi();
    const l = listove(iz);
    const upr = l.find((x) => x.ime === UPR)!;
    // нов Имот в Имоти (без ключ) · и групов ред за него в Управление със задача
    const imoti = l.find((x) => x.ime === IMOTI)!;
    const ri2 = redPoKlyuch(imoti, 'imot:i2');
    imoti.redove.splice(ri2 + 1, 0, [null, 'Панчарево', 'УПИ']);
    const sbor = upr.redove.findIndex((r) => r[0] === 'сбор');
    const grupa: (typeof upr.redove)[number] = ['3', 'Панчарево', 'УПИ'];
    const zad: (typeof upr.redove)[number] = [];
    zad[4] = 'Преписка / [лице]';
    upr.redove.splice(sbor - 1, 0, grupa, zad);
    const otchet = await sveriListove(iz, l);
    expect(otchet.nahodki.filter((n) => n.stepen === 'greshka')).toEqual([]);
    const vidove = otchet.predlozheniya.map((p) => ['tablitsa' in p ? p.tablitsa : '', p.vid]);
    expect(vidove).toEqual([
      ['imoti', 'nov-red'],
      ['zadachi', 'nov-red'],
    ]);
    const z = otchet.predlozheniya[1]!;
    expect(z.vid === 'nov-red' && z.kletki['kam']).toEqual({ tekst: `${PREDLOZHENIE}0:imot` });
    expect(z.zavisiOt).toEqual([0]);
    const r = await izpalniPredlozheniyata(iz, otchet.predlozheniya, new Set([0, 1]), idNa, KOGATO);
    expect(r.prieti).toBe(2);
    const tv = iz.ogledalo().tablitsi.get('zadachi')!;
    const nova = zhiviteRedove(tv)
      .map((i) => tv.id[i])
      .find((id) => id !== 'zadacha:z1' && id !== 'zadacha:z2')!;
    expect(nova).toBe('zadacha:kniga-test:1');
  });
});
