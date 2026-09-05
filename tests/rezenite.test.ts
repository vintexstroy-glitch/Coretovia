/**
 * РЕЗЕНИТЕ ПО ПРОЗОРЕЦ · екранът казва „идва с резен N" (правило 12), а N има
 * един дом — `docs/03-plan.md`. Тестът чете плана и сверява картата на екрана.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REZEN_NA_PROZORETSA } from '../app/prozorets/ostanalite.js';
import { REZEN_NA_AGENTITE } from '../src/model/agenti.js';
import { PROZORTSI } from '../src/model/osnova.js';

describe('резените по прозорец', () => {
  const plan = readFileSync('docs/03-plan.md', 'utf8');
  /** редовете на таблицата · `| N | заглавие | …` → N → заглавие */
  const redove = new Map<string, string>();
  for (const m of plan.matchAll(/^\| \*{0,2}(\d+[аб]?)\*{0,2} \| ([^|]+) \|/gm)) {
    redove.set(m[1]!, m[2]!);
  }

  it('всеки прозорец без екран сочи ред от плана, в който стои листът му', () => {
    expect(Object.keys(REZEN_NA_PROZORETSA).length).toBeGreaterThan(0);
    for (const [klyuch, rezen] of Object.entries(REZEN_NA_PROZORETSA)) {
      const list = PROZORTSI.find((p) => p.klyuch === klyuch)?.list ?? '';
      const zaglavie = redove.get(String(rezen)) ?? '';
      expect(zaglavie, `${klyuch} → резен ${rezen}`).toContain(list);
    }
  });

  it('четирите построени прозореца нямат „идва с резен"', () => {
    for (const k of ['profil', 'imoti', 'ii', 'nastroyki']) {
      expect(REZEN_NA_PROZORETSA).not.toHaveProperty(k);
    }
    expect(Object.keys(REZEN_NA_PROZORETSA)).toHaveLength(4);
  });

  it('четиримата агенти без модел сочат реда „ИИ" на плана', () => {
    expect(redove.get(String(REZEN_NA_AGENTITE))).toContain('ИИ');
  });
});
