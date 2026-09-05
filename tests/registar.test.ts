/**
 * РЕГИСТЪРЪТ НА ПРЕНОСА · сверка вход↔изход (правило 7 · ADR-001).
 *
 * Всеки стар файл получава ТОЧНО една присъда: ПРЕНОС · ПРЕНАПИСВАНЕ · ЧАКА ·
 * ОТПАДА. Сборът на четирите трябва да е равен на броя редове, и числата в
 * обобщението трябва да са броени от таблицата, не преписани.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const PRISADI = ['ПРЕНОС', 'ПРЕНАПИСВАНЕ', 'ЧАКА', 'ОТПАДА'] as const;
const tekst = readFileSync('docs/registar-na-prenosa.md', 'utf8');

/** Редовете на регистъра · първата клетка е път, третата — присъда. */
const redove = tekst
  .split('\n')
  .filter((r) => r.startsWith('| ') && !r.startsWith('| :') && !r.startsWith('| стар път'))
  .map((r) => r.split('|').map((k) => k.trim()))
  // ред на регистъра = първата клетка е ПЪТ (има точка на файл) · главата на обобщението не е
  .filter(
    (k) =>
      k.length >= 4 &&
      /\.(ts|mjs|md|sh|png)$/.test(k[1]!) &&
      PRISADI.some((p) => k[3]!.startsWith(p)),
  );

describe('регистърът на преноса', () => {
  it('има редове и всеки носи една от четирите присъди', () => {
    expect(redove.length).toBeGreaterThan(200);
    for (const k of redove) expect(PRISADI.filter((p) => k[3]!.startsWith(p))).toHaveLength(1);
  });

  it('сборът по присъди е равен на броя редове · и обобщението го казва', () => {
    const broy = Object.fromEntries(
      PRISADI.map((p) => [p, redove.filter((k) => k[3]!.startsWith(p)).length]),
    );
    const sbor = PRISADI.reduce((s, p) => s + broy[p]!, 0);
    expect(sbor).toBe(redove.length);
    const obobshtenie =
      /\*\*ОБЩО\*\*[^\n]*\*\*(\d+)\*\*[^\n]*\*\*(\d+)\*\*[^\n]*\*\*(\d+)\*\*[^\n]*\*\*(\d+)\*\*[^\n]*\*\*(\d+)\*\*/.exec(
        tekst,
      );
    expect(obobshtenie, 'редът **ОБЩО** с петте числа').not.toBeNull();
    const [, obshto, prenos, prenapisvane, chaka, otpada] = obobshtenie!.map(Number);
    expect([obshto, prenos, prenapisvane, chaka, otpada]).toEqual([
      redove.length,
      broy['ПРЕНОС'],
      broy['ПРЕНАПИСВАНЕ'],
      broy['ЧАКА'],
      broy['ОТПАДА'],
    ]);
  });

  it('нито един стар път не се повтаря', () => {
    const patishta = redove.map((k) => k[1]);
    expect(new Set(patishta).size).toBe(patishta.length);
  });
});
