/**
 * БИБЛИОТЕКИТЕ · пин с ръка (правило 10 · ADR-002).
 *
 * Библиотека влиза САМО когато решава проблем, който не сме решили, и влиза
 * през ADR с име · версия · лиценз · размер · кой проблем. Списъкът на
 * позволените е ТУК, с ръка; `package.json` трябва да съвпада с него, не
 * обратното. Нова зависимост без ред тук е червен тест.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const POZVOLENI = [
  {
    ime: 'exceljs',
    versiya: '4.4.0',
    litsenz: 'MIT',
    problem:
      'стилове · слети клетки · валидации · формули с кеш · автофилтър, на четене И на писане',
  },
] as const;

const pj = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dependencies: Record<string, string>;
};

describe('библиотеките в готовия пакет', () => {
  it('са точно изброените, с точна версия', () => {
    expect(Object.entries(pj.dependencies).sort()).toEqual(
      POZVOLENI.map((p) => [p.ime, p.versiya] as [string, string]).sort(),
    );
  });

  it('всяка има лиценз от позволените и казва какъв проблем решава', () => {
    for (const p of POZVOLENI) {
      expect(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC']).toContain(p.litsenz);
      expect(p.problem.length).toBeGreaterThan(10);
    }
  });

  it('чуждият пакет се внася от ЕДИН файл · src/kniga/ooxml.ts', () => {
    const vnasyashti: string[] = [];
    const obhod = (papka: string): void => {
      for (const ime of readdirSync(papka)) {
        const pat = join(papka, ime);
        if (statSync(pat).isDirectory()) obhod(pat);
        else if (ime.endsWith('.ts') && /from ['"]exceljs['"]/.test(readFileSync(pat, 'utf8')))
          vnasyashti.push(pat.replace(/\\/g, '/'));
      }
    };
    obhod('src');
    obhod('app');
    expect(vnasyashti).toEqual(['src/kniga/ooxml.ts']);
  });

  it('никой в src/ не телефонира · без fetch, без XMLHttpRequest, без WebSocket', () => {
    const nahodki: string[] = [];
    let pregledani = 0;
    const obhod = (papka: string): void => {
      for (const ime of readdirSync(papka)) {
        const pat = join(papka, ime);
        if (statSync(pat).isDirectory()) obhod(pat);
        else if (ime.endsWith('.ts')) {
          pregledani += 1;
          for (const [i, red] of readFileSync(pat, 'utf8').split('\n').entries()) {
            if (
              /\b(fetch|XMLHttpRequest|WebSocket)\s*\(/.test(red) &&
              !red.trim().startsWith('//') &&
              !red.trim().startsWith('*')
            ) {
              nahodki.push(`${pat.replace(/\\/g, '/')}:${i + 1}`);
            }
          }
        }
      }
    };
    obhod('src');
    // колко е ПРЕГЛЕДАЛ · празен обход дава зелено, без да е гледал (обход Й)
    expect(pregledani).toBeGreaterThan(50);
    expect(nahodki).toEqual([]);
  });
});
