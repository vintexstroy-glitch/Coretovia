/**
 * ЧЕТЕНЕТО НА КНИГАТА · две Книги: неговата (мострата, без служебен лист и без
 * ключове) и нашата (изнесена от Огледалото, с ключове). Разпознаване по лента и
 * глава, групи, клетки по вид, номенклатури, находки с адрес, сверки.
 */

import { describe, expect, it } from 'vitest';
import { namerIzbor, razpoznayKnigata } from '../src/kniga/chetene.js';
import { napishiKniga, prochetiKniga } from '../src/kniga/ooxml.js';
import { knigataOtOgledaloto } from '../src/kniga/pisane.js';
import { MODEL, NOMENKLATURA } from '../src/model/osnova.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import { KNIGA, knigaZaTest, STOPANIN } from './pomoshtni.js';
import { MOSTRA } from './mostri/mostra-kniga.js';

const KOGATO = '2026-09-05T14:00:00.000Z';
const PRAZNO = fold([], MODEL, KOGATO);

describe('неговата Книга · мострата без служебен лист', () => {
  it('трите таблици се разпознават по лента и глава · без ключове', async () => {
    const kniga = await prochetiKniga(await napishiKniga(MOSTRA));
    const p = razpoznayKnigata(kniga, PRAZNO, KOGATO);
    expect(p.sluzhebno).toBeNull();
    expect([...p.tablitsi.keys()]).toEqual(['imoti', 'obekti', 'biznesi']);
    const imoti = p.tablitsi.get('imoti')!;
    expect(imoti.sKlyuchove).toBe(false);
    expect(imoti.redNaGlavata).toBe(5);
    expect(imoti.redove.map((r) => r.nomeratsiya)).toEqual(['1', '2', '3', '4', '5']);
    expect(imoti.redove.every((r) => r.klyuch === null)).toBe(true);
    const obekti = p.tablitsi.get('obekti')!;
    expect(
      obekti.grupi.map((g) => `${g.imotNomer}.${g.kategoriya} ${g.imotIme} ${g.kategoriyaTekst}`),
    ).toEqual([
      '2.1 Гара Яна Сграда',
      '3.1 Студентски Град Сграда',
      '3.2 Студентски Град Паркинг',
      '5.2 С.Г. БАРИЕРА Паркинг',
    ]);
    expect(obekti.redove).toHaveLength(28);
    expect(obekti.redove[0]?.grupa?.red).toBe(17);
    expect(p.tablitsi.get('biznesi')!.redove.map((r) => r.nomeratsiya)).toEqual(['2.3.1', '2.3.2']);
    for (const s of p.sverki) expect(s.nared, s.kakvo).toBe(true);
  });

  it('клетките се четат по вида · думите извън номенклатурите са находки или бележки', async () => {
    const kniga = await prochetiKniga(await napishiKniga(MOSTRA));
    const p = razpoznayKnigata(kniga, PRAZNO, KOGATO);
    const imoti = p.tablitsi.get('imoti')!;
    const kletka = (red: number, kolona: string) =>
      imoti.redove[red]!.kletki.find((k) => k.kolona === kolona)!;
    // „ПИ (Поземлен Имот)" → ПИ по началото · бележка · „УПИ" точно
    expect(kletka(0, 'sastoyanie').stoynost).toEqual({ nomer: 1 });
    expect(kletka(2, 'sastoyanie').stoynost).toEqual({ nomer: 2 });
    expect(kletka(0, 'ime').stoynost).toEqual({ tekst: 'Герман' });
    expect(kletka(0, 'nomer').stoynost).toEqual({ chislo: 0 });
    const obekti = p.tablitsi.get('obekti')!;
    // „Склад" → „склад" без главни · бележка · Видът е в категорията на групата
    expect(obekti.redove[0]!.kletki.find((k) => k.kolona === 'vid')!.stoynost).toEqual({
      nomer: 4,
    });
    // „НПМ(Наземно Парко Място)" → НПМ по началото · бележка на C35
    const npm = obekti.redove.find((r) => r.nomeratsiya === '3.2.1.11')!;
    expect(npm.kletki.find((k) => k.kolona === 'vid')!.stoynost).toEqual({ nomer: 1 });
    const belezhki = p.nahodki.filter((n) => n.stepen === 'beleshka');
    expect(belezhki.some((n) => n.adres === 'C6' && n.kakvo.includes('по началото'))).toBe(true);
    expect(belezhki.some((n) => n.adres === 'C18' && n.kakvo.includes('главните'))).toBe(true);
    expect(belezhki.some((n) => n.adres === 'C35' && n.kakvo.includes('по началото'))).toBe(true);
    expect(p.nahodki.filter((n) => n.stepen === 'greshka')).toEqual([]);
    // Бизнесите · Имотът по име не е жив (Огледалото е празно) · непознат родител
    const b = p.tablitsi.get('biznesi')!.redove[0]!;
    expect(b.kletki.find((k) => k.kolona === 'imot')!.nepoznatRoditel).toBe('Гара Яна');
    expect(b.kletki.find((k) => k.kolona === 'sastoyanie')!.stoynost).toEqual({ nomer: 1 });
  });
});

async function nashata() {
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
  const PRAZEN = { plosht: null, tsena: null, papka: null, adres: null };
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
      plosht: { chislo: 851234 },
    },
  });
  await zapishi('o2', 'imoti.dobaviObekt', {
    kletki: {
      imot: { tekst: 'imot:i1' },
      kategoriya: { nomer: 1 },
      vid: { nomer: 4 },
      nomer: { chislo: 1 },
      ...PRAZEN,
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
  await zapishi('s1', 'nastroyki.spriStoynost', {
    nomenklatura: NOMENKLATURA.sastoyanieNaImot,
    nomer: 1,
    belezi: {},
  });
  return iz;
}

describe('изборът по началото', () => {
  it('най-дългото начало печели · „Сграда Б (стара)" е „Сграда Б", не „Сграда"', async () => {
    const iz = await nashata();
    const r = await iz.izpalni('kb', 'nastroyki.dobaviStoynost', {
      nomenklatura: NOMENKLATURA.kategoriya,
      tekst: 'Сграда Б',
      belezi: {},
    });
    expect('otkaz' in r).toBe(false);
    const kategorii = iz.ogledalo().nomenklaturi.get(NOMENKLATURA.kategoriya)!;
    expect(namerIzbor(kategorii, 'Сграда Б (стара)', {})?.tekst).toBe('Сграда Б');
    expect(namerIzbor(kategorii, 'Сграда (стара)', {})?.tekst).toBe('Сграда');
  });
});

describe('нашата Книга · изнесена от Огледалото · с ключове', () => {
  it('всеки ред носи ключа си · групите от ключа · клетките до цента · служебното', async () => {
    const iz = await nashata();
    const o = iz.ogledalo();
    const kniga = knigataOtOgledaloto(o, o.kursori.get(KNIGA)!, KOGATO);
    const p = razpoznayKnigata(await prochetiKniga(await napishiKniga(kniga.listove)), o, KOGATO);
    expect(p.nahodki).toEqual([]);
    expect(p.sluzhebno?.versiya).toBe(1);
    expect(p.sluzhebno?.kursor?.seq).toBe(o.kursori.get(KNIGA)!.seq);
    const imoti = p.tablitsi.get('imoti')!;
    expect(imoti.sKlyuchove).toBe(true);
    expect(imoti.redove.map((r) => r.klyuch)).toEqual(['imot:i1', 'imot:i2']);
    const obekti = p.tablitsi.get('obekti')!;
    expect(obekti.grupi.map((g) => [g.imotId, g.kategoriya])).toEqual([
      ['imot:i1', 1],
      ['imot:i2', 1],
    ]);
    const ap = obekti.redove.find((r) => r.klyuch === 'obekt:o1')!;
    expect(ap.grupa?.imotId).toBe('imot:i2');
    expect(ap.kletki.find((k) => k.kolona === 'tsena')!.stoynost).toEqual({
      stoynost_st: 12345678,
    });
    expect(ap.kletki.find((k) => k.kolona === 'plosht')!.stoynost).toEqual({ chislo: 851234 });
    expect(ap.kletki.find((k) => k.kolona === 'vid')!.stoynost).toEqual({ nomer: 1 });
    // Бизнесите · Имотът по име → жив id · и на втория ред (слятата клетка носи името)
    const b = p.tablitsi.get('biznesi')!;
    expect(b.redove.map((r) => r.kletki.find((k) => k.kolona === 'imot')!.stoynost)).toEqual([
      { tekst: 'imot:i1' },
      { tekst: 'imot:i1' },
    ]);
    // номенклатурите · ключ · номер · спряна
    const sast = p.nomenklaturi.get(NOMENKLATURA.sastoyanieNaImot)!;
    expect(sast.stoynosti.map((s) => [s.nomer, s.tekst, s.spryana])).toEqual([
      [2, 'УПИ', false],
      [3, 'Строеж', false],
      [1, 'ПИ', true],
    ]);
    const vid = p.nomenklaturi.get(NOMENKLATURA.vidNaObekt)!;
    expect(vid.stoynosti.find((s) => s.tekst === 'НПМ')?.belezi).toEqual({ kategoriya: 2 });
    expect(p.nomenklaturi.size).toBe(11);
    for (const s of p.sverki) expect(s.nared, s.kakvo).toBe(true);
  });
});
