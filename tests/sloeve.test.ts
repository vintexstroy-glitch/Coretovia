/**
 * СЛОЕВЕТЕ · dependency-cruiser с праг НУЛА (ADR-001 §3).
 *
 * Правилата живеят в `.dependency-cruiser.cjs`; тук се проверява, че
 * командата върви и връща нула нарушения. Обход, който само стои в config,
 * а никой не го пуска, е дума.
 */

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

describe('слоевете', () => {
  it('dependency-cruiser не намира нито едно нарушение', () => {
    const bin = existsSync('node_modules/dependency-cruiser/bin/dependency-cruise.mjs')
      ? 'node_modules/dependency-cruiser/bin/dependency-cruise.mjs'
      : 'node_modules/dependency-cruiser/bin/dependency-cruise.js';
    let izhod = '';
    let kod = 0;
    try {
      izhod = execFileSync(
        process.execPath,
        [bin, '--config', '.dependency-cruiser.cjs', 'src', 'app'],
        {
          encoding: 'utf8',
        },
      );
    } catch (g) {
      kod = (g as { status: number }).status;
      izhod = String((g as { stdout: string }).stdout) + String((g as { stderr: string }).stderr);
    }
    expect(kod, izhod).toBe(0);
    expect(izhod).toMatch(/no dependency violations found/);
  }, 120_000);
});
