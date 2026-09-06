/**
 * КОРЕНЪТ НА ХРАНИЛИЩЕТО · какво има право да стои там (резен 6ж · ADR-016).
 *
 * Платено с находка: празен файл на име `0` влезе в коммит `6b1f4ba` — почти
 * сигурно от пренасочване (`>0` вместо `2>&1`) в терминала. Стоя проследен от
 * git цял резен и **нито един обход не можеше да го види**: деветте на чистотата
 * четат само `.ts` в `src` и `app`, единайсетте на честността — само `tests` и
 * `proba`, а `.gitignore` пази от нежелано, не от неочаквано.
 *
 * Коренът е и мястото, където се появяват най-скъпите изненади: чужд `.xlsx`
 * (правило 29), забравен ключ, лог от падане. Затова тук стои СПИСЪК, и всичко
 * извън него е ЧЕРВЕНО, докато някой не го впише — тоест решение, не случайност.
 */

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Какво има право да стои в корена · всяко ново име влиза ТУК, съзнателно. */
const POZVOLENI = Object.freeze([
  '.dependency-cruiser.cjs',
  '.gitattributes',
  '.gitignore',
  'CLAUDE.md',
  'README.md',
  'biome.json',
  'knip.json',
  'package-lock.json',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'vitest.config.ts',
]);

describe('коренът на хранилището', () => {
  // подпроцес · времето е ОБЯВЕНО, за да не пада тестът под товар (обход Д)
  it('няма НИТО ЕДИН проследен файл извън списъка', () => {
    const izhod = execFileSync('git', ['ls-files', '--full-name'], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8',
      timeout: 55_000,
    });
    const vsichki = izhod.split('\n').filter((r) => r !== '');
    // ПЪРВО броят: празен изход би направил всяко следващо твърдение празно и
    // тестът щеше да е зелен, без да е погледнал нищо (обход Г · обход Й)
    expect(vsichki.length).toBeGreaterThan(200);

    const vKorena = vsichki.filter((r) => !r.includes('/')).sort();
    expect(vKorena).toEqual([...POZVOLENI].sort());
  }, 60_000);

  it('и списъкът е точно ДВАНАЙСЕТ имена · пин с ръка', () => {
    // Пинът е за да не расте списъкът мълчаливо: ново име в корена се вижда
    // тук в диф, заедно с причината си (обход В на честността).
    expect(POZVOLENI).toHaveLength(12);
    expect(new Set(POZVOLENI).size).toBe(POZVOLENI.length);
  });
});
