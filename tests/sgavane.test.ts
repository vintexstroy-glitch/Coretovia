/**
 * МНОГО ВЕРИГИ, ЕДНО ОГЛЕДАЛО · тактът и сгъването.
 *
 * ПРЕНОС от MasterBook. Третият раздел („seq НЕ се сблъсква между веригите")
 * иска Огледало, което да сгъне потока — то идва с резен 1 (колонното), и
 * тогава разделът се връща с него. Тук стоят тактът и самото сгъване.
 *
 * Три обещания се пазят тук, и трите са от плана:
 *
 *   1. РЕДЪТ НА ПОДАВАНЕ НЕ ЗНАЧИ НИЩО. Разбъркаш ли веригите, потокът излиза
 *      байт за байт същият. Без това „кой е последен" зависи от реда, в който
 *      носителят е върнал файловете — тоест от случайност.
 *   2. `seq` НЕ СЕ СБЛЪСКВА между веригите. Всяка тръгва от 1; сторно на seq 5
 *      в едната не бива да гаси seq 5 в другите. Това беше най-опасното нещо в
 *      целия резен и се пази поименно.
 *   3. СВЕРКАТА ЗАТВАРЯ (правило 7) — Σ дължини ↔ дължина на потока, и нулата
 *      се записва.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno, type Sabitie } from '../src/yadro/index.js';
import { naprediChasovnika, sravniPoTakt, taktNaSabitie } from '../src/yadro/takt.js';
import { sgani } from '../src/ogledalo/sgavane.js';
import { SHA } from './pomoshtni.js';

const KOGATO = '2026-08-26T09:00:00.000Z';

/** Една верига с N прости събития · без домейн, за да се мери СГЪВАНЕТО. */
async function veriga(klyuch: string, broy: number, ot: number): Promise<readonly Sabitie[]> {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  for (let i = 0; i < broy; i += 1) {
    await vrata.dobavi({
      opId: `${klyuch}-${i}`,
      ts: new Date(Date.UTC(2026, 7, 26, 9, 0, ot + i)).toISOString(),
      naematel: klyuch,
      actor: `${klyuch}@example.bg`,
      type: 'ИмотДобавен',
      sashtnost: { vid: 'imot', id: `${klyuch}-${i}` },
      payload: { adres: `ул. ${i}`, edinitsa: 'А', ploshtad_kvsm: 60 },
    });
  }
  return dnevnik.chetiVsichki(klyuch);
}

describe('тактът', () => {
  it('чете времето като ЧИСЛО, не като текст', () => {
    const s = { ts: '2026-08-26', naematel: 'a', seq: 1 } as Sabitie;
    expect(taktNaSabitie(s).kogato).toBe(Date.parse('2026-08-26'));
  });

  it('непарсимото време пада на нула — отпред, където се вижда', () => {
    const s = { ts: 'абв', naematel: 'a', seq: 1 } as Sabitie;
    expect(taktNaSabitie(s).kogato).toBe(0);
  });

  it('веригата разчупва равното време, seq разчупва равната верига', () => {
    const a = { ts: KOGATO, naematel: 'aaa', seq: 9 } as Sabitie;
    const b = { ts: KOGATO, naematel: 'bbb', seq: 1 } as Sabitie;
    const c = { ts: KOGATO, naematel: 'aaa', seq: 10 } as Sabitie;
    expect(sravniPoTakt(a, b)).toBeLessThan(0);
    expect(sravniPoTakt(a, c)).toBeLessThan(0);
    expect(sravniPoTakt(b, c)).toBeGreaterThan(0);
  });

  it('часовникът не се връща назад · собствената верига остава подредена', () => {
    // Часовникът на устройството скача назад с цял час.
    const nazad = naprediChasovnika('2026-08-26T09:00:00.000Z', '2026-08-26T08:00:00.000Z');
    expect(Date.parse(nazad)).toBe(Date.parse('2026-08-26T09:00:00.000Z') + 1);
    // Върви ли напред, не се пипа.
    const napred = naprediChasovnika('2026-08-26T09:00:00.000Z', '2026-08-26T09:00:05.000Z');
    expect(napred).toBe('2026-08-26T09:00:05.000Z');
    // Първото събитие няма предходно.
    expect(naprediChasovnika(undefined, KOGATO)).toBe(KOGATO);
  });
});

describe('сгъването', () => {
  it('редът на подаване НЕ мени потока · пермутационен тест', async () => {
    const a = await veriga('kniga#pero:ivo@x.bg', 5, 0);
    const b = await veriga('kniga#pero:mira@x.bg', 4, 2);
    const v = await veriga('kniga', 3, 1);

    const podredbi: (readonly [string, readonly Sabitie[]])[][] = [
      [
        ['A', a],
        ['B', b],
        ['V', v],
      ],
      [
        ['V', v],
        ['A', a],
        ['B', b],
      ],
      [
        ['B', b],
        ['V', v],
        ['A', a],
      ],
      [
        ['B', b],
        ['A', a],
        ['V', v],
      ],
    ];

    const potoci = podredbi.map((p) =>
      sgani(
        p.map(([, v]) => v),
        KOGATO,
      )
        .potok.map((s) => s.hash)
        .join('|'),
    );
    expect(new Set(potoci).size).toBe(1);
  });

  it('сверката затваря · Σ дължини ↔ дължина на потока', async () => {
    const a = await veriga('kniga', 5, 0);
    const b = await veriga('kniga#pero:mira@x.bg', 4, 0);
    const r = sgani([a, b], KOGATO);

    expect(r.potok).toHaveLength(9);
    expect(r.sverka.razlika).toBe(0);
    expect(r.sverka.nared).toBe(true);
  });

  it('празната верига се пропуска и не влиза в резюметата', async () => {
    const a = await veriga('kniga', 2, 0);
    const r = sgani([a, []], KOGATO);

    expect(r.verigi).toHaveLength(1);
    expect(r.verigi[0]!.broy).toBe(2);
    expect(r.verigi[0]!.parviyatActor).toBe('kniga@example.bg');
  });

  it('резюметата са подредени · редът на подаване пак не личи', async () => {
    const a = await veriga('bbb', 1, 0);
    const b = await veriga('aaa', 1, 0);
    const r = sgani([a, b], KOGATO);
    expect(r.verigi.map((v) => v.veriga)).toEqual(['aaa', 'bbb']);
  });
});
