/**
 * ОБЕЩАНИЯТА · „идва с резен N" за резен, който ВЕЧЕ е готов (резен 6к · ADR-018).
 *
 * Правило 12 казва: липсващото се КАЗВА. Кодът го спазва — сивият бутон носи
 * думи, а не мълчание. Но обещанието остарява по-тихо от всичко друго: резенът
 * минава, надписът остава, и програмата почва да казва НЕВЯРНОТО за самата себе
 * си. Това е обратното на правило 12 и е по-скъпо от мълчанието: мълчанието се
 * забелязва, а надписът се чете и му се вярва.
 *
 * Намерено с ръка на 06.09, на ЧЕТИРИ места наведнъж — и едното се пише в
 * КНИГАТА, която той сваля (`kniga/dumi.ts`), тоест излиза извън програмата.
 *
 * ═══ ДВЕ ФОРМИ, защото обещанието живее на два етажа ═══
 *
 * · ТИПИЗИРАНАТА · `deystvie: { vid: 'idva', rezen: N }` в модела на бутона.
 *   Тя е машинно четима и точна;
 * · ТЕКСТОВАТА · „идва/идват с резен N" в низ или коментар. Тя е онази, която
 *   стига до екрана и до Книгата.
 *
 * Историческите споменавания („резен 2 го чете", „решение 18 на резен 1") НЕ са
 * обещания и не се броят: те казват КОГА е станало, не че предстои.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = fileURLToPath(new URL('..', import.meta.url));

/** Резен → готов ли е · четено от ЕДИНСТВЕНИЯ му дом (правило 17). */
function gotovite(): Map<string, boolean> {
  const po = new Map<string, boolean>();
  for (const red of readFileSync(join(KOREN, 'docs', '03-plan.md'), 'utf8').split('\n')) {
    const m = /^\|\s*\*{0,2}([0-9]+[а-я]?)\*{0,2}\s*\|/.exec(red);
    if (m === null) continue;
    po.set(m[1]!, red.includes('**готов**'));
  }
  return po;
}

function vsichkiteTS(papka: string, sabrani: string[] = []): string[] {
  for (const ime of readdirSync(join(KOREN, papka), { withFileTypes: true })) {
    if (ime.isDirectory()) vsichkiteTS(join(papka, ime.name), sabrani);
    else if (ime.name.endsWith('.ts') && !ime.name.endsWith('.d.ts')) {
      sabrani.push(join(papka, ime.name));
    }
  }
  return sabrani;
}

/** Обещание = ред, който казва „това ИДВА с резен N". */
const TIPIZIRANO = /vid:\s*'idva'[^}]*rezen:\s*(\d+)/g;
const TEKSTOVO = /ид(?:ва|ват)\s+(?:с|със)\s+[^.\n]{0,60}?резен\s+(\d+)/g;

function obeshtaniyata(): { kade: string; rezen: string; red: number }[] {
  const nam: { kade: string; rezen: string; red: number }[] = [];
  // ЕДИН РЕД, ЕДНА НАХОДКА · типизираната и текстовата форма стоят на един и същ
  // ред в модела на бутона и иначе го броят два пъти
  const vidyani = new Set<string>();
  for (const f of [...vsichkiteTS('src'), ...vsichkiteTS('app')]) {
    readFileSync(join(KOREN, f), 'utf8')
      .split('\n')
      .forEach((red, i) => {
        for (const izraz of [TIPIZIRANO, TEKSTOVO]) {
          izraz.lastIndex = 0;
          for (const m of red.matchAll(izraz)) {
            const klyuch = f + ':' + String(i + 1);
            if (vidyani.has(klyuch)) continue;
            vidyani.add(klyuch);
            nam.push({ kade: f.split('\\').join('/'), rezen: m[1]!, red: i + 1 });
          }
        }
      });
  }
  return nam;
}

describe('обещанията в кода', () => {
  it('планът се ЧЕТЕ · и в него има завършени резени', () => {
    // Обход, който не казва колко е видял, е зелен и когато не е гледал
    // (ADR-015 · обход Й). Затова първо се твърди обхватът.
    const po = gotovite();
    expect(po.size).toBeGreaterThan(10);
    expect([...po.values()].filter(Boolean).length).toBeGreaterThan(10);
    expect(po.get('7')).toBe(false);
    expect(po.get('8')).toBe(false);
  });

  it('и НИТО ЕДНО не сочи резен, който вече е ГОТОВ', () => {
    const po = gotovite();
    const vsichki = obeshtaniyata();
    // и тук обхватът се твърди · нула обещания би направило проверката празна
    expect(vsichki.length).toBeGreaterThan(0);

    const stari = vsichki
      .filter((o) => po.get(o.rezen) === true)
      .map((o) => `${o.kade}:${o.red} — обещава резен ${o.rezen}, а той е ГОТОВ`);
    expect(stari).toEqual([]);
  });
});
