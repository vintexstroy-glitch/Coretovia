/**
 * ПОВЕРИТЕЛНОСТТА · обход на хранилището, праг НУЛА (правило 29).
 *
 * Негови думи: „Поверителните данни не ги съхраняваме ние, а на сървъра на
 * клиента… Ние пазим само нашия код и необходимото за работата на системата."
 *
 * Хранилището е публично. Неговата Книга носи телефони и имейли на служители и
 * купувачи. Затова тук се брои: няма `.xlsx` освен мострата; няма телефон;
 * няма имейл извън изброените. Обход, който само стои в правило, разчита на
 * дисциплина — а точно тази грешка е необратима.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// `package-lock.json` носи имейлите на авторите на чужди пакети · машинен файл, не наш.
const PROPUSKANI = new Set(['node_modules', '.git', 'dist', 'kniga-lichna', 'package-lock.json']);
const TEKSTOVI = ['.ts', '.mjs', '.js', '.md', '.json', '.html', '.css', '.yml', '.cjs', '.txt'];

/** Имейлите, които МОГАТ да стоят в хранилището · неговият, примерните (`example.*`, `x.bg` в тестовете), машинните. */
const POZVOLENI_IMEYLI =
  /@(gmail\.com|example\.(bg|com)|x\.bg|anthropic\.com|users\.noreply\.github\.com)$/;
const POZVOLENI_TOCHNO = new Set(['vintexstroy@gmail.com']);

function faylove(papka: string, sabrani: string[] = []): string[] {
  for (const ime of readdirSync(papka)) {
    if (PROPUSKANI.has(ime)) continue;
    const pat = join(papka, ime);
    if (statSync(pat).isDirectory()) faylove(pat, sabrani);
    else sabrani.push(pat.replace(/\\/g, '/'));
  }
  return sabrani;
}

const VSICHKI = faylove('.');

describe('поверителността на хранилището', () => {
  /**
   * ОБХОДЪТ НАИСТИНА ЛИ Е МИНАЛ · преди да се твърди какво НЕ е намерил.
   *
   * Трите проверки долу обхождат `VSICHKI` и мълчат, ако той е празен: тогава
   * зеленото значи „не съм гледал", а не „чисто е". Списъкът се строи от
   * ОТНОСИТЕЛЕН път — друга работна директория го изпразва, без нищо да гръмне.
   * Затова първо се брои, че обходът е видял хранилището (обход Г · 06.09).
   */
  it('обходът е видял хранилището · иначе зеленото долу не значи нищо', () => {
    expect(VSICHKI.length).toBeGreaterThan(100);
    expect(VSICHKI).toContain('CLAUDE.md');
    expect(VSICHKI.some((f) => f.endsWith('src/model/osnova.ts'))).toBe(true);
  });

  it('единствените .xlsx са мострите в tests/mostri/', () => {
    expect(VSICHKI.length).toBeGreaterThan(100);
    const xlsx = VSICHKI.filter((f) => /\.(xlsx|xlsb|xlsm)$/i.test(f));
    for (const f of xlsx) expect(f).toMatch(/^tests\/mostri\/Coretovia-mostra[^/]*\.xlsx$/);
  });

  it('няма телефонен номер в нито един текстов файл', () => {
    const nahodki: string[] = [];
    for (const f of VSICHKI.filter((f) => TEKSTOVI.some((k) => f.endsWith(k)))) {
      if (f.endsWith('poveritelnost.test.ts')) continue;
      for (const [i, red] of readFileSync(f, 'utf8').split('\n').entries()) {
        // български мобилен: +359 8x… или 08x… с 9 цифри след водещата нула; с или без интервали
        if (
          /(\+?359|\b0)\s?8[7-9]\s?\d{3}\s?\d{2}\s?\d{2}\s?\d\b/.test(red) &&
          !/example|0888 ?000 ?00\d/.test(red)
        ) {
          nahodki.push(`${f}:${i + 1}`);
        }
      }
    }
    expect(nahodki).toEqual([]);
  });

  it('няма имейл извън позволените', () => {
    const nahodki: string[] = [];
    for (const f of VSICHKI.filter((f) => TEKSTOVI.some((k) => f.endsWith(k)))) {
      const tekst = readFileSync(f, 'utf8');
      for (const m of tekst.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
        const imeyl = m[0].toLowerCase();
        if (POZVOLENI_TOCHNO.has(imeyl) || POZVOLENI_IMEYLI.test(imeyl)) continue;
        nahodki.push(`${f} · ${imeyl}`);
      }
    }
    expect(nahodki).toEqual([]);
  });
});
