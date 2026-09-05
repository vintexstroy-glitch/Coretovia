/**
 * ОГЛЕДАЛОТО · колонното сгъване срещу наивния оракул, сторното като маска,
 * сверката, редът на веригите и непрочетеното.
 *
 * Всяко събитие тук е минало през истинската Врата (`knigaZaTest`), защото
 * Огледалото чете каквото Журналът държи, а не каквото тестът си представя.
 */

import { describe, expect, it } from 'vitest';
import { NOMENKLATURA } from '../src/model/osnova.js';
import { MODEL } from '../src/model/osnova.js';
import { naivnoSgavane } from '../src/ogledalo/naivno.js';
import { fold, type Ogledalo, tablitsaVOgledaloto } from '../src/ogledalo/ogledalo.js';
import { sgani } from '../src/ogledalo/sgavane.js';
import { kletkaNa, redKato, zhiviteRedove } from '../src/ogledalo/tablitsa.js';
import { TIP } from '../src/sabitiya/registar.js';
import { zhivite } from '../src/model/nomenklatura.js';
import { KNIGA, knigaZaTest, type KnigaZaTest, VERIGA_NA_SLUZHITEL } from './pomoshtni.js';

const KOGATO = '2026-09-05T10:00:00.000Z';

const red = (
  k: KnigaZaTest,
  tablitsa: string,
  id: string,
  kletki: Record<string, unknown>,
  veriga?: string,
) =>
  k.zapishi(
    TIP.redZapisan,
    { vid: tablitsa === 'imoti' ? 'imot' : tablitsa === 'obekti' ? 'obekt' : 'biznes', id },
    { tablitsa, id, kletki },
    veriga === undefined ? {} : { veriga },
  );

/** Историята на резена, през Вратата · връща Книгата, за да се дописва. */
async function istoriya(): Promise<KnigaZaTest> {
  const k = knigaZaTest();
  await k.otkriy(); // 1
  await k.zapishi(
    TIP.stoynostZapisana,
    { vid: 'nomenklatura', id: NOMENKLATURA.sastoyanieNaImot },
    { nomenklatura: NOMENKLATURA.sastoyanieNaImot, nomer: 4, tekst: 'Продаден', belezi: {} },
  ); // 2
  await red(k, 'imoti', 'imot:a', {
    ime: { tekst: 'Студентски Град' },
    sastoyanie: { nomer: 2 },
    tsena: { stoynost_st: 300000 },
  }); // 3
  await red(k, 'imoti', 'imot:b', { ime: { tekst: 'Гара Яна' }, sastoyanie: { nomer: 2 } }); // 4
  await red(k, 'obekti', 'obekt:1', {
    imot: { tekst: 'imot:a' },
    kategoriya: { nomer: 1 },
    vid: { nomer: 1 },
    nomer: { chislo: 27 },
  }); // 5
  await red(k, 'obekti', 'obekt:1', {
    tsena: { stoynost_st: 25000000 },
    plosht: { chislo: 850000 },
  }); // 6
  await red(k, 'obekti', 'obekt:1', { plosht: null }); // 7
  await k.zapishi(
    TIP.redIzklyuchen,
    { vid: 'obekt', id: 'obekt:1' },
    { tablitsa: 'obekti', id: 'obekt:1', izklyuchen: true },
  ); // 8
  await red(k, 'biznesi', 'biznes:1', {
    imot: { tekst: 'imot:b' },
    sastoyanie: { nomer: 1 },
    nomer: { chislo: 1 },
  }); // 9
  await red(k, 'biznesi', 'biznes:1', { drugi: { tekst: '?' } }); // 10
  await k.zapishi(
    TIP.storno,
    { vid: 'biznes', id: 'biznes:1' },
    { pogasyavaSeq: 9, prichina: 'грешен имот' },
  ); // 11
  await k.zapishi(
    TIP.stoynostSpryana,
    { vid: 'nomenklatura', id: NOMENKLATURA.sastoyanieNaImot },
    { nomenklatura: NOMENKLATURA.sastoyanieNaImot, nomer: 1, spryana: true, belezi: {} },
  ); // 12
  // грешен слот · минава Вратата (тя не знае Модела), пада в Огледалото
  await red(k, 'imoti', 'imot:c', { tsena: { chislo: 5 } }); // 13
  await k.zapishi('НещоНепознато', { vid: 'imot', id: 'imot:a' }, {}); // 14
  await red(k, 'imoti', 'imot:a', { papka: { tekst: 'drive://x' } }); // 15
  return k;
}

/** Огледалото като чист обект · за сравнение байт за байт. */
function snimka(o: Ogledalo): unknown {
  const tablitsi: Record<string, unknown[]> = {};
  for (const [klyuch, t] of o.tablitsi) {
    tablitsi[klyuch] = [];
    for (let i = 0; i < t.broy; i += 1) tablitsi[klyuch]!.push(redKato(t, i));
  }
  const nomenklaturi: Record<string, unknown> = {};
  for (const [klyuch, n] of o.nomenklaturi) nomenklaturi[klyuch] = n.stoynosti;
  return {
    stopanin: o.stopanin,
    tablitsi,
    nomenklaturi,
    prilozheni: o.prilozheni,
    pogaseni: o.pogaseni.length,
  };
}

describe('колонното Огледало == наивното сгъване', () => {
  it('ред по ред, клетка по клетка, за всяка таблица · и броячите', async () => {
    const k = await istoriya();
    const s = await k.sabitiya();
    const o = fold(s, MODEL, KOGATO);
    const n = naivnoSgavane(s, MODEL);

    expect(o.stopanin).toBe(n.stopanin);
    for (const [klyuch, t] of o.tablitsi) {
      const nt = n.tablitsi.get(klyuch)!;
      expect(t.id).toEqual([...nt.keys()]);
      for (let i = 0; i < t.broy; i += 1) {
        const r = redKato(t, i);
        const nr = nt.get(r.id)!;
        expect(r.kletki).toEqual(nr.kletki);
        expect(r.izklyuchen).toBe(nr.izklyuchen);
        expect(r.seq).toBe(nr.seq);
        expect(r.veriga).toBe(nr.veriga);
      }
    }
    for (const [klyuch, zh] of o.nomenklaturi)
      expect(zh.stoynosti).toEqual(n.nomenklaturi.get(klyuch)!.stoynosti);
    expect([o.prilozheni, o.pogaseni.length, o.storna, o.neprocheteni.length]).toEqual([
      n.prilozheni,
      n.pogaseni,
      n.storna,
      n.neprocheteni,
    ]);
    expect([o.knigi.length, o.vnasyaniya.length]).toEqual([n.knigi, n.vnasyaniya]);
  });

  it('стойностите са каквито са записани · последната дума бие ПО ПОЛЕ · null изпразва', async () => {
    const o = fold(await (await istoriya()).sabitiya(), MODEL, KOGATO);
    const imoti = tablitsaVOgledaloto(o, 'imoti');
    const obekti = tablitsaVOgledaloto(o, 'obekti');
    expect(imoti.broy).toBe(2);
    expect(redKato(imoti, 0).kletki).toEqual({
      ime: { tekst: 'Студентски Град' },
      sastoyanie: { nomer: 2 },
      tsena: { stoynost_st: 300000 },
      papka: { tekst: 'drive://x' },
    });
    expect(redKato(obekti, 0).kletki).toEqual({
      imot: { tekst: 'imot:a' },
      kategoriya: { nomer: 1 },
      vid: { nomer: 1 },
      nomer: { chislo: 27 },
      tsena: { stoynost_st: 25000000 },
    });
    expect(kletkaNa(obekti, 0, 'plosht')).toBeNull();
    expect(redKato(obekti, 0).izklyuchen).toBe(true);
    expect(zhiviteRedove(obekti)).toEqual([]);
    expect(redKato(imoti, 0).seq).toBe(15);
    expect(o.kursori.get(KNIGA)?.seq).toBe(15);
  });

  it('номенклатурата живее в Огледалото · добавена стойност · спряна стойност', async () => {
    const o = fold(await (await istoriya()).sabitiya(), MODEL, KOGATO);
    const n = o.nomenklaturi.get(NOMENKLATURA.sastoyanieNaImot)!;
    expect(n.stoynosti.map((s) => s.tekst)).toEqual(['ПИ', 'УПИ', 'Строеж', 'Продаден']);
    expect(zhivite(n).map((s) => s.nomer)).toEqual([2, 3, 4]);
    expect(n.stoynosti[3]?.bazova).toBe(false);
  });
});

describe('сторното е маска · и сверката затваря', () => {
  it('сторно на създаването гаси целия ред · и поправките му', async () => {
    const o = fold(await (await istoriya()).sabitiya(), MODEL, KOGATO);
    expect(tablitsaVOgledaloto(o, 'biznesi').broy).toBe(0);
    expect(o.pogaseni.map((p) => [p.seq, p.prichina])).toEqual([
      [9, 'грешен имот'],
      [10, 'създаването на реда е сторнирано (vintexstroy#9)'],
    ]);
    expect(o.pogaseni[0]?.storniranOt).toBe('vintexstroy#11');
  });

  it('непрочетеното се брои и казва защо', async () => {
    const o = fold(await (await istoriya()).sabitiya(), MODEL, KOGATO);
    expect(o.neprocheteni.map((n) => [n.seq, n.zashto[0]])).toEqual([
      [13, 'Колона „цена" носи „stoynost_st", а клетката е „chislo".'],
      [14, 'Непознат тип събитие „НещоНепознато".'],
    ]);
    expect(tablitsaVOgledaloto(o, 'imoti').indeks.has('imot:c')).toBe(false);
  });

  it('приложени + погасени + сторна + непрочетени = събития · и нулата се записва', async () => {
    const o = fold(await (await istoriya()).sabitiya(), MODEL, KOGATO);
    expect(o.broySabitiya).toBe(15);
    expect([o.prilozheni, o.pogaseni.length, o.storna, o.neprocheteni.length]).toEqual([
      10, 2, 1, 2,
    ]);
    expect(o.sverka.nared).toBe(true);
    expect(o.sverka.razlika).toBe(0);
    expect(o.sverka.kogato).toBe(KOGATO);
  });

  it('сторно на сторно не възкресява', async () => {
    const k = await istoriya();
    await k.zapishi(
      TIP.storno,
      { vid: 'biznes', id: 'biznes:1' },
      { pogasyavaSeq: 11, prichina: 'сгрешено сторно' },
    ); // 16
    const o = fold(await k.sabitiya(), MODEL, KOGATO);
    expect(tablitsaVOgledaloto(o, 'biznesi').broy).toBe(0);
    expect(o.storna).toBe(2);
    expect(o.sverka.nared).toBe(true);
  });

  it('живо Сторно = пълно пресгъване · Огледалото след сторното е Огледалото на потока', async () => {
    const k = await istoriya();
    const predi = fold(await k.sabitiya(), MODEL, KOGATO);
    expect(zhiviteRedove(tablitsaVOgledaloto(predi, 'imoti'))).toEqual([0, 1]);
    await k.zapishi(
      TIP.storno,
      { vid: 'imot', id: 'imot:b' },
      { pogasyavaSeq: 4, prichina: 'дубъл' },
    );
    const sled = fold(await k.sabitiya(), MODEL, KOGATO);
    expect(tablitsaVOgledaloto(sled, 'imoti').id).toEqual(['imot:a']);
  });

  it('празен Журнал дава празно Огледало с базовите номенклатури', () => {
    const o = fold([], MODEL, KOGATO);
    expect(o.stopanin).toBe('');
    expect(o.nomenklaturi.get(NOMENKLATURA.kategoriya)?.stoynosti).toHaveLength(3);
    expect(o.sverka).toMatchObject({ vhod: 0, izhod: 0, nared: true });
  });
});

describe('две вериги · редът на подаване няма значение', () => {
  it('fold(sgani(A,B)) == fold(sgani(B,A)) · и служителят пише в своята верига', async () => {
    const k = await istoriya();
    await red(
      k,
      'obekti',
      'obekt:2',
      {
        imot: { tekst: 'imot:a' },
        kategoriya: { nomer: 2 },
        vid: { nomer: 1 },
        nomer: { chislo: 11 },
      },
      VERIGA_NA_SLUZHITEL,
    );
    await red(k, 'obekti', 'obekt:2', { tsena: { stoynost_st: 1500000 } }, VERIGA_NA_SLUZHITEL);
    await red(k, 'imoti', 'imot:a', { adres: { tekst: 'maps://a' } });
    const a = await k.sabitiya(KNIGA);
    const b = await k.sabitiya(VERIGA_NA_SLUZHITEL);
    expect(b).toHaveLength(2);
    const o1 = fold(sgani([a, b], KOGATO).potok, MODEL, KOGATO);
    const o2 = fold(sgani([b, a], KOGATO).potok, MODEL, KOGATO);
    expect(snimka(o1)).toEqual(snimka(o2));
    const obekti = tablitsaVOgledaloto(o1, 'obekti');
    expect(obekti.id).toEqual(['obekt:1', 'obekt:2']);
    expect(redKato(obekti, 1).veriga).toBe(VERIGA_NA_SLUZHITEL);
    expect(o1.kursori.get(VERIGA_NA_SLUZHITEL)?.seq).toBe(2);
    expect(o1.sverka.nared).toBe(true);
  });
});

describe('складът расте · и непознатият ред не се ражда от изключване', () => {
  it('четирийсет реда в една таблица · колонно == наивно · до цента', async () => {
    const k = knigaZaTest();
    await k.otkriy();
    for (let n = 1; n <= 40; n += 1) {
      await red(k, 'imoti', `imot:${n}`, {
        ime: { tekst: `Имот ${n}` },
        sastoyanie: { nomer: 1 + (n % 3) },
        tsena: { stoynost_st: n * 100001 },
        plosht: { chislo: n * 12345 },
      });
    }
    const s = await k.sabitiya();
    const o = fold(s, MODEL, KOGATO);
    const n = naivnoSgavane(s, MODEL);
    const t = tablitsaVOgledaloto(o, 'imoti');
    expect(t.broy).toBe(40);
    for (let i = 0; i < 40; i += 1) {
      expect(redKato(t, i).kletki).toEqual(n.tablitsi.get('imoti')!.get(`imot:${i + 1}`)!.kletki);
    }
    expect(redKato(t, 39).kletki['tsena']).toEqual({ stoynost_st: 4000040 });
    expect(o.sverka.nared).toBe(true);
  });

  it('изключване на ред, който не е раждан, е непрочетено · не ражда ред', async () => {
    const k = knigaZaTest();
    await k.otkriy();
    await k.zapishi(
      TIP.redIzklyuchen,
      { vid: 'imot', id: 'imot:nyama' },
      { tablitsa: 'imoti', id: 'imot:nyama', izklyuchen: true },
    );
    const s = await k.sabitiya();
    const o = fold(s, MODEL, KOGATO);
    expect(tablitsaVOgledaloto(o, 'imoti').broy).toBe(0);
    expect(o.neprocheteni.map((x) => x.seq)).toEqual([2]);
    expect(naivnoSgavane(s, MODEL).neprocheteni).toBe(1);
    expect(o.sverka.nared).toBe(true);
  });

  it('невалидно сторно е непрочетено, не маска', async () => {
    const k = await istoriya();
    await k.zapishi(TIP.storno, { vid: 'imot', id: 'imot:a' }, { pogasyavaSeq: 3, prichina: '' });
    const s = await k.sabitiya();
    const o = fold(s, MODEL, KOGATO);
    expect(tablitsaVOgledaloto(o, 'imoti').id).toContain('imot:a');
    expect(o.neprocheteni.map((x) => x.seq)).toEqual([13, 14, 16]);
    expect(o.storna).toBe(1);
    expect(o.sverka.nared).toBe(true);
    expect(naivnoSgavane(s, MODEL).storna).toBe(1);
  });
});
