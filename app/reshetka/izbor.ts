/**
 * ПОЛЕТО С ИЗБОР · `<select>` от жива номенклатура (решения 19 · 20).
 *
 * Живите стойности, в реда на номерата; при номенклатура по белег — само тези
 * от обхвата (видовете на избраната категория). Спряната стойност се показва
 * САМО ако редът вече я държи — избрана и недостъпна, с думата „спряна":
 * старите редове я пазят, нови не я избират.
 */

import {
  type Belezi,
  poNomer,
  type ZhivaNomenklatura,
  zhivite,
} from '../../src/model/nomenklatura.js';

const PRAZNO = '—';

export function poleSIzbor(
  n: ZhivaNomenklatura,
  tekusht: number | null,
  belezi: Belezi = {},
): HTMLSelectElement {
  const s = document.createElement('select');
  s.className = 'pole';
  s.append(new Option(PRAZNO, ''));
  const po = n.podredbaPo;
  for (const v of zhivite(n)) {
    if (po !== undefined && v.belezi[po] !== belezi[po]) continue;
    s.append(new Option(v.tekst, String(v.nomer)));
  }
  if (tekusht !== null) {
    const t = poNomer(n, tekusht, belezi);
    if (t?.spryana) {
      const o = new Option(`${t.tekst} · спряна`, String(t.nomer));
      o.disabled = true;
      s.append(o);
    }
  }
  s.value = tekusht === null ? '' : String(tekusht);
  return s;
}
