/**
 * ЧИСТОТАТА · и КОЙ пази самата нея (резен 6г · ADR-016).
 *
 * `npm run chestnost` има свой пазач от резен 43. `npm run chistota` нямаше
 * НИТО ЕДИН — нула файла в `tests/` или `proba/` го споменаваха. И си пролича:
 *
 *   stroezh/chistota.mjs:612   if (!f.includes('/src/')) continue;
 *
 * Пътят идва от `join(KOREN, 'src')`, а на Windows `join` дава обратни черти.
 * Условието е вярно за ВСЕКИ файл, `continue` се изпълнява винаги, и обход 7
 * („без тест") рапортуваше НУЛА, без да е погледнал нито един файл. Зелено на
 * Ubuntu и зелено на Windows значеха две различни неща.
 *
 * Класът е точно онзи, срещу който резен 6в въведе обход Й: „обход по файлове
 * без твърдение колко е видял". Затова тук се иска ОБХВАТ, не само находки —
 * нула находки при нула обхват значи „не съм гледал", не „чисто е".
 */

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = fileURLToPath(new URL('..', import.meta.url));
const OBHODAT = join(KOREN, 'stroezh', 'chistota.mjs');
const IZVOR = readFileSync(OBHODAT, 'utf8');

/** Пуска обхода · връща кода на изхода и казаното. Времето е ОБЯВЕНО (обход Д). */
function pusni(koren?: string): { kod: number; izhod: string } {
  try {
    const izhod = execFileSync('node', [OBHODAT], {
      encoding: 'utf8',
      timeout: 55_000,
      env: koren === undefined ? process.env : { ...process.env, CHISTOTA_KOREN: koren },
    });
    return { kod: 0, izhod };
  } catch (g) {
    return {
      kod: (g as { status: number }).status,
      izhod: String((g as { stdout: string }).stdout ?? ''),
    };
  }
}

/** Обход → обхват · разчетено от реда „· видени N ‹мярка›". */
function obhvatite(izhod: string): Map<string, number> {
  const po = new Map<string, number>();
  for (const m of izhod.matchAll(/^\s+[·✗]\s+(.+):\s+\d+.*?· видени (\d+) /gm)) {
    po.set(m[1]!.trim(), Number(m[2]));
  }
  return po;
}

/** Броим файловете сами · за да не вярваме на обхода за собствения му обхват. */
function preboroy(papka: string, sabrani: string[] = []): string[] {
  for (const ime of readdirSync(join(KOREN, papka), { withFileTypes: true })) {
    if (ime.isDirectory()) {
      if (ime.name === 'node_modules' || ime.name === 'dist' || ime.name.startsWith('.')) continue;
      preboroy(join(papka, ime.name), sabrani);
    } else if (ime.name.endsWith('.ts') && !ime.name.endsWith('.d.ts')) {
      sabrani.push(join(papka, ime.name));
    }
  }
  return sabrani;
}

describe('чистотата на кода', () => {
  it('НИТО ЕДИН обход не се самоизключва по разделителя на пътя', () => {
    /**
     * ПИНЪТ Е ЗА ФОРМАТА, не за резултата. Литерал с наклонена черта, сравняван
     * срещу път от `join`, е точно дефектът, който този резен плати. Появи ли се
     * пак — тук пада, преди числото да е излъгало някого.
     */
    // РЕДЪТ-КОМЕНТАР НЕ Е КОД. Обяснението горе цитира счупената форма дословно
    // (правило 21) — обход, който чете цитата като код, обявява находка в
    // собственото си доказателство (ADR-015 §6). Затова редовете, които почват
    // с `*` или `//`, се пропускат.
    expect(IZVOR).not.toMatch(/^(?!\s*(?:\*|\/\/)).*\.includes\('\/(?:src|app|tests|proba)\/'\)/m);
    // и изравняването живее на ЕДНО място, а не по средата на всеки обход
    expect(IZVOR).toContain('function izravni(pat)');
  });

  it('деветте обхода ОБЯВЯВАТ обхвата си · и нито един не е нула', () => {
    const { kod, izhod } = pusni();
    expect(kod).toBe(0);
    const po = obhvatite(izhod);
    // първо БРОЯТ, после цикълът: празна карта би направила всяко очакване
    // безсмислено и тестът щеше да е зелен, без да е проверил нищо (обход Г)
    expect([...po.keys()]).toEqual([
      '1 · мъртво',
      '2 · излишен export',
      '3 · само тест',
      '3б · изнесено за теста',
      '4 · празно поле',
      '5 · излишен ред',
      '6 · несвързан',
      '7 · без тест',
      '8 · дублирано',
    ]);
    for (const [ime, broy] of po) expect(broy, `обхватът на „${ime}"`).toBeGreaterThan(0);
  }, 60_000);

  it('обход 7 вижда ЦЕЛИЯ код · броено независимо от самия обход', () => {
    const { izhod } = pusni();
    const kod = [...preboroy('src'), ...preboroy('app')];
    expect(kod.length).toBeGreaterThan(100);
    // ВХОДНИТЕ файлове не се броят · те нямат кой да ги внася по определение
    const vhodni = kod.filter((f) => /(?:^|[\\/])(?:main|index|izdanie)\.ts$/.test(f)).length;
    expect(obhvatite(izhod).get('7 · без тест')).toBe(kod.length - vhodni);
  }, 60_000);

  it('и ВСИЧКИТЕ ДЕВЕТ ловят · доказано с нарочно счупено ДЪРВО', () => {
    /**
     * ДЪРВОТО ЖИВЕЕ ВЪВ ВРЕМЕННАТА ПАПКА. Тест, който пише в хранилището, се
     * състезава с всеки друг, който обхожда същата папка — точно дефектът, който
     * обход И лови, и той веднъж влезе през вратата на собственото си
     * доказателство (ADR-015 §6).
     *
     * И ДЕВЕТТЕ, не някои: обход, който още не е ловил нищо, е надпис — не се
     * знае дали мълчи, защото е чисто, или защото не работи (ADR-015 §7). Дотук
     * `chistota` нямаше НИТО ЕДНО доказателство; едно от деветте му мълчания се
     * оказа счупен обход, който рапортуваше нула, без да е погледнал.
     */
    const koren = mkdtempSync(join(tmpdir(), 'chistota-'));
    try {
      for (const p of ['src', 'app', 'tests', 'proba']) mkdirSync(join(koren, p));
      const pishi = (papka: string, ime: string, redove: readonly string[]): void =>
        writeFileSync(join(koren, papka, ime), `${redove.join('\n')}\n`);

      // 1 · мъртво · 6 · несвързан · 7 · без тест — три обхода върху един файл
      pishi('src', 'samotno.ts', ['export const nikoyNeGoVika = 1;']);

      // 2 · излишен export (вика се само вътре) · 3 · само тест · 3б · изнесено
      // за теста (вика се вътре И в теста) · 4 · празно поле
      pishi('src', 'zhivo.ts', [
        'export function yadroto() {',
        '  return 4;',
        '}',
        'export const chetiri = yadroto();',
        'export function samoZaTesta() {',
        '  return 3;',
        '}',
        'export function vatreshen() {',
        '  return 5;',
        '}',
        'export const pet = vatreshen();',
        'export function prazno(x) {',
        "  return Number(x ?? '') + parseFloat('1');",
        '}',
      ]);

      // 5 · излишни редове · условие, което винаги е вярно, и глътнат отказ
      pishi('src', 'izlishno.ts', [
        'export function izlishno() {',
        '  if (true) {',
        '    return 1;',
        '  }',
        '  try {',
        '    return 2;',
        '  } catch {}',
        '}',
      ]);

      // 8 · дублирано · ПЕТ дословно еднакви реда на две места
      const blok = [
        '  const rezultat = a + b + c + a * b * c - a / (b + 1) + Math.max(a, b, c);',
        '  const vtoro = rezultat * 2 + a - b + c * 3 - Math.min(a, b, c) + 7;',
        '  const treto = vtoro + rezultat - a + b - c + Math.abs(a - b) + 11;',
        '  const chetvarto = treto * rezultat - vtoro + Math.round(a / (c + 1)) + 13;',
        '  return chetvarto + treto + vtoro + rezultat;',
      ];
      pishi('src', 'dubel-a.ts', ['export function edno(a, b, c) {', ...blok, '}']);
      pishi('src', 'dubel-b.ts', ['export function dve(a, b, c) {', ...blok, '}']);

      pishi('app', 'main.ts', [
        "import { chetiri, prazno } from '../src/zhivo.js';",
        "import { izlishno } from '../src/izlishno.js';",
        "import { edno } from '../src/dubel-a.js';",
        "import { dve } from '../src/dubel-b.js';",
        'console.log(chetiri, prazno(1), izlishno(), edno(1, 2, 3), dve(1, 2, 3));',
      ]);
      pishi('tests', 'zhivo.test.ts', [
        "import { samoZaTesta, yadroto } from '../src/zhivo.js';",
        'console.log(samoZaTesta(), yadroto());',
      ]);

      const { kod, izhod } = pusni(koren);
      expect(kod).toBe(1);
      expect(izhod).toContain('НАХОДКИ');

      // всеки обход ПО ИМЕ, с брой над нула · инак „ловят" би значело „някои"
      const po = new Map<string, number>();
      for (const m of izhod.matchAll(/^\s+[·✗]\s+(.+):\s+(\d+)(?:\s|$)/gm)) {
        po.set(m[1]!.trim(), Number(m[2]));
      }
      expect([...po.keys()]).toEqual([
        '1 · мъртво',
        '2 · излишен export',
        '3 · само тест',
        '3б · изнесено за теста',
        '4 · празно поле',
        '5 · излишен ред',
        '6 · несвързан',
        '7 · без тест',
        '8 · дублирано',
      ]);
      for (const [ime, broy] of po) expect(broy, `обход „${ime}" не лови`).toBeGreaterThan(0);

      // и НЕ обвинява невинното · инак „лови" би значело „лови всичко"
      expect(izhod).toContain('nikoyNeGoVika');
      expect(izhod).not.toContain('„chetiri"');
    } finally {
      rmSync(koren, { recursive: true, force: true });
    }
  }, 60_000);

  it('и ПАДА, когато някой обход остане с НУЛЕВ обхват', () => {
    // Празно дърво: няма код, значи обходите по файлове не са видели нищо.
    // Дотук това би минало за „чисто". Оттук нататък е ЧЕРВЕНО.
    const koren = mkdtempSync(join(tmpdir(), 'chistota-prazno-'));
    try {
      for (const p of ['src', 'app', 'tests', 'proba']) mkdirSync(join(koren, p));
      const { kod, izhod } = pusni(koren);
      expect(kod).toBe(1);
      expect(izhod).toContain('НУЛЕВ обхват');
    } finally {
      rmSync(koren, { recursive: true, force: true });
    }
  }, 60_000);
});
