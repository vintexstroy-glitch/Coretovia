/**
 * ОСТАНАЛИЯТ ПРОЗОРЕЦ · името, „идва с резен N" и думите му (правило 12:
 * липсващото се казва, не се крие). Редът на резените има един дом —
 * `docs/03-plan.md`; числата тук са преписани оттам и `tests/rezenite.test.ts` ги сверява.
 */

import { DUMI_OT_KNIGATA } from '../../src/model/dumi-ot-knigata.js';
import type { KlyuchNaProzorets } from '../../src/model/klyuchove.js';
import { PROZORTSI } from '../../src/model/osnova.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { ekraniraj } from '../reshetka/obshto.js';
import { dumiteHTML } from './profil.js';

/** С кой резен идва прозорецът · по `docs/03-plan.md`. */
export const REZEN_NA_PROZORETSA: Readonly<Partial<Record<KlyuchNaProzorets, number>>> =
  Object.freeze({});

export function narisuvayOstanalite(k: KonteksNaEkrana, klyuch: KlyuchNaProzorets): void {
  const p = PROZORTSI.find((x) => x.klyuch === klyuch);
  if (!p) return;
  const rezen = REZEN_NA_PROZORETSA[klyuch];
  k.tyalo.innerHTML = `
    <section class="sektsiya" data-sektsiya="${klyuch}">
      <h2 translate="no">${ekraniraj(p.list)}</h2>
      <p class="vest" data-idva>${rezen === undefined ? 'още не е построен' : `идва с резен ${rezen}`}</p>
      ${p.lenti.length > 0 ? `<p class="vest">ленти: ${p.lenti.map(ekraniraj).join(' · ')}</p>` : ''}
      ${dumiteHTML(DUMI_OT_KNIGATA[klyuch])}
    </section>`;
}
