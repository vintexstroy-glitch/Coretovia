/**
 * ОСЕМТЕ ПРОЗОРЕЦА · „Само това и нищо повече или по малко" (05.09.2026).
 *
 * Броят е пин с ръка, а имената на листовете са дословно неговите. Нов
 * прозорец НЯМА команда и няма път — появи ли се девети, този тест пада преди
 * някой да го е нарисувал. И обратното: имената живеят САМО в `osnova.ts`.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PROZORTSI, prozoretsPoList } from '../src/model/osnova.js';

describe('осемте прозореца', () => {
  it('са ТОЧНО осем · и имената на листовете са неговите, дословно', () => {
    expect(PROZORTSI).toHaveLength(8);
    expect(PROZORTSI.map((p) => p.list)).toEqual([
      'Профил',
      'ИмотиОбектиБизнеси',
      'УправлениеДелаПреписки',
      'Сметки',
      'Служители',
      'Продажби',
      'ИИ',
      'Настройки(Стопанин)',
    ]);
  });

  it('ключовете са уникални и на латиница', () => {
    const klyuchove = PROZORTSI.map((p) => p.klyuch);
    expect(new Set(klyuchove).size).toBe(8);
    for (const k of klyuchove) expect(k).toMatch(/^[a-z]+$/);
  });

  it('листът се познава по име · с NFC и без крайни интервали', () => {
    expect(prozoretsPoList('Сметки ')?.klyuch).toBe('smetki');
    expect(prozoretsPoList('Настройки(Стопанин)')?.klyuch).toBe('nastroyki');
    expect(prozoretsPoList('Лист9')).toBeUndefined();
  });

  it('никъде другаде в src/ не стои име на лист като низ · един дом (правило 17)', () => {
    const nahodki: string[] = [];
    const obhod = (papka: string): void => {
      for (const ime of readdirSync(papka)) {
        const pat = join(papka, ime);
        if (statSync(pat).isDirectory()) obhod(pat);
        else if (ime.endsWith('.ts') && !pat.replace(/\\/g, '/').endsWith('src/model/osnova.ts')) {
          const tekst = readFileSync(pat, 'utf8');
          for (const p of PROZORTSI) {
            if (tekst.includes(`'${p.list}'`) || tekst.includes(`"${p.list}"`))
              nahodki.push(`${pat} · ${p.list}`);
          }
        }
      }
    };
    obhod('src');
    expect(nahodki).toEqual([]);
  });
});
