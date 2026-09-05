/**
 * МЕРКИТЕ НА СКОРОСТТА · обещани в `docs/00` §3 за резен 3 · числата са в плана.
 *
 * Сгъването на 20 000 събития и дървото + Гантът за 2 000 задачи — под изброен
 * праг, БРОЕНИ от тест, не преценени. Праговете са щедри нарочно: тестът върви
 * успоредно с другите файлове на слаба машина; целта е да хване поредица от
 * порядъци (квадратично сгъване), не микросекунди.
 */

import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/model/osnova.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { TIP } from '../src/sabitiya/registar.js';
import { darvoto } from '../src/smetach/darvo.js';
import { filtrirayDarvoto } from '../src/smetach/filtar.js';
import { lentaNa, reshetka } from '../src/smetach/gant.js';
import type { Sabitie } from '../src/yadro/sabitie.js';
import { KNIGA, STOPANIN } from './pomoshtni.js';

const KOGATO = '2026-09-05T13:00:00.000Z';
/** праговете · милисекунди · домът на числата е `docs/03-plan.md` */
const PRAG_SGAVANE_MS = 1500;
const PRAG_DARVO_I_GANT_MS = 200;
const BROY_SABITIYA = 20_000;
const BROY_ZADACHI = 2_000;

/** Събития без хеш · сгъването не проверява веригата (това е работа на Вратата при запис). */
function sabitiya(): Sabitie[] {
  const s: Sabitie[] = [];
  let seq = 0;
  const dobavi = (type: string, sashtnost: { vid: string; id: string }, payload: unknown): void => {
    seq += 1;
    s.push({
      ts: new Date(Date.parse(KOGATO) + seq).toISOString(),
      naematel: KNIGA,
      actor: STOPANIN,
      type,
      sashtnost,
      payload,
      seq,
      prevHash: '',
      hash: '',
    } as Sabitie);
  };
  dobavi(TIP.stopaninZapisan, { vid: 'stopanin', id: KNIGA }, { imeyl: STOPANIN });
  const imoti = 100;
  const obekti = 400;
  for (let i = 0; i < imoti; i += 1)
    dobavi(
      TIP.redZapisan,
      { vid: 'imot', id: `imot:${i}` },
      {
        tablitsa: 'imoti',
        id: `imot:${i}`,
        kletki: { ime: { tekst: `Имот ${i}` }, sastoyanie: { nomer: 2 } },
      },
    );
  for (let i = 0; i < obekti; i += 1)
    dobavi(
      TIP.redZapisan,
      { vid: 'obekt', id: `obekt:${i}` },
      {
        tablitsa: 'obekti',
        id: `obekt:${i}`,
        kletki: {
          imot: { tekst: `imot:${i % imoti}` },
          kategoriya: { nomer: 1 },
          vid: { nomer: 1 },
          nomer: { chislo: i },
        },
      },
    );
  for (let i = 0; i < BROY_ZADACHI; i += 1) {
    const den = 1 + (i % 28);
    dobavi(
      TIP.redZapisan,
      { vid: 'zadacha', id: `zadacha:${i}` },
      {
        tablitsa: 'zadachi',
        id: `zadacha:${i}`,
        kletki: {
          kam: { tekst: i % 2 === 0 ? `obekt:${i % obekti}` : `imot:${i % imoti}` },
          vid: { nomer: 1 + (i % 4) },
          ime: { tekst: `Задача ${i}` },
          ot: { tekst: `2026-09-${String(den).padStart(2, '0')}` },
          do: { tekst: `2026-10-${String(den).padStart(2, '0')}` },
          byudzhet: { stoynost_st: i * 100 },
        },
      },
    );
  }
  // поправки на клетки, докато се съберат 20 000 · всяка пипа един ред
  while (s.length < BROY_SABITIYA) {
    const i = s.length % BROY_ZADACHI;
    dobavi(
      TIP.redZapisan,
      { vid: 'zadacha', id: `zadacha:${i}` },
      { tablitsa: 'zadachi', id: `zadacha:${i}`, kletki: { byudzhet: { stoynost_st: s.length } } },
    );
  }
  return s;
}

describe('мерките на скоростта', () => {
  it(`сгъването на ${BROY_SABITIYA} събития е под ${PRAG_SGAVANE_MS} ms · и сверката затваря`, () => {
    const s = sabitiya();
    expect(s).toHaveLength(BROY_SABITIYA);
    const t0 = performance.now();
    const o = fold(s, MODEL, KOGATO);
    const ms = performance.now() - t0;
    expect(o.sverka.nared).toBe(true);
    expect(o.prilozheni).toBe(BROY_SABITIYA);
    expect(o.tablitsi.get('zadachi')?.broy).toBe(BROY_ZADACHI);
    expect(ms, `сгъването отне ${Math.round(ms)} ms`).toBeLessThan(PRAG_SGAVANE_MS);
  });

  it(`дървото + решетката на Ганта + филтърът за ${BROY_ZADACHI} задачи са под ${PRAG_DARVO_I_GANT_MS} ms`, () => {
    const o = fold(sabitiya(), MODEL, KOGATO);
    const t0 = performance.now();
    const d = darvoto(o);
    const r = reshetka(
      d.redove
        .filter((x) => x.vid === 'zadacha')
        .map((x) => ({ id: x.id, ot: '2026-09-05', do: '2026-09-20' })),
      'mesets',
      '2026-09-05',
    );
    for (const z of d.redove) lentaNa({ id: z.id, ot: '2026-09-05', do: '2026-10-05' }, r.koloni);
    const f = filtrirayDarvoto(
      d.redove.map((x) => ({ nivo: x.vid === 'roditel' ? x.nivo : 2, dumi: [x.id] })),
      ['zadacha:1'],
    );
    const ms = performance.now() - t0;
    expect(d.broyZadachi).toBe(BROY_ZADACHI);
    expect(d.siratsi).toEqual([]);
    expect(f.broyVidimi + f.broySkriti).toBe(d.redove.length);
    expect(ms, `дървото и Гантът отнеха ${Math.round(ms)} ms`).toBeLessThan(PRAG_DARVO_I_GANT_MS);
  });
});
