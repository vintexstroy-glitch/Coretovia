import type { Operatsiya } from '../src/yadro/index.js';
import { sha256Node } from '../src/nositel/hash-node.js';

/** Носителят за тестовете. Ядрото нарочно няма стойност по подразбиране. */
export const SHA = sha256Node;

/** Детерминистичен генератор — без Math.random, за да са тестовете повторяеми. */
export function seyalka(seme = 1): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

/**
 * Една операция с разумни стойности по подразбиране.
 *
 * Типът на събитието е нарочно ОБЩ („ЗаписЗаписан"): ядрото не знае домейна и
 * тестовете му не бива да зависят от прозорец, който още не е построен.
 */
export function operatsiya(chast: Partial<Operatsiya> & { opId: string }): Operatsiya {
  return {
    ts: '2026-09-05T09:00:00.000Z',
    // Ключът на книгата в тестовете на ядрото е пренесен дословно с тях.
    naematel: 'vintexstroy',
    actor: 'vintexstroy@gmail.com',
    type: 'ЗаписЗаписан',
    sashtnost: { vid: 'zapis', id: 'Z-1' },
    payload: {},
    ...chast,
  };
}
