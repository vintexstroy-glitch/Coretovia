/**
 * ЗАДАНИЕТО ↔ КОДА · неговите думи имат ДВА дома и никой не ги сверяваше
 * (резен 6ж · ADR-016).
 *
 * По К1 Книгата му Е Заданието: „Всеки шийт от ексела е равен на прозорец от
 * програмата. Само това и нищо повече или по-малко." Изреченията му живеят на
 * три места — `zadanie/*.md` (преписани с адресите), `tests/mostri/mostra-kniga.ts`
 * (мострата) и `src/model/dumi-ot-knigata.ts` (генериран от мострата).
 *
 * Второто и третото вече се сверяват с `npm run dumi:proveri`. Между ПЪРВОТО и
 * останалите нямаше **нито един машинен допир**: нито един файл в `src`, `app`,
 * `tests`, `proba` или `stroezh` не чете `zadanie/`. Тоест авторитетът по К1
 * можеше да се разминава с кода тихо и завинаги.
 *
 * ═══ ЗАЩО СЕ СРАВНЯВА ПОДРАВНЕНО, А НЕ БАЙТ ПО БАЙТ ═══
 *
 * Клетка в таблица на markdown губи водещия и крайния си интервал — а негово
 * B9 в листа Профил ЗАПОЧВА и ЗАВЪРШВА с интервал. Байтовото сравнение би
 * връщало червено вечно и някой би изключил проверката. Затова се сверява
 * подравнено, а НЕ преформулирано: правило 21 („цитат дословно или изобщо")
 * пази точно това — вътрешността на изречението не се пипа.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DUMI_OT_KNIGATA } from '../src/model/dumi-ot-knigata.js';

const KOREN = fileURLToPath(new URL('..', import.meta.url));
const ZADANIE = join(KOREN, 'zadanie');

/** Ред от таблицата на Заданието: `| B7 | текстът му |`. */
const KLETKA = /^\|\s*([AB])(\d+)\s*\|\s*(.*?)\s*\|\s*$/;

/**
 * Инструкциите му, извадени от Заданието · същото правило като в генератора
 * (`stroezh/dumi-ot-knigata.mjs`): номер в A, текст над 25 знака в B.
 */
function instruktsiiteVZadanieto(): string[] {
  const nameren: string[] = [];
  for (const ime of readdirSync(ZADANIE).sort()) {
    if (!ime.endsWith('.md')) continue;
    const poRed = new Map<number, { a: string; b: string }>();
    for (const red of readFileSync(join(ZADANIE, ime), 'utf8').split('\n')) {
      const m = KLETKA.exec(red);
      if (m === null) continue;
      const nomer = Number(m[2]);
      const veche = poRed.get(nomer) ?? { a: '', b: '' };
      poRed.set(nomer, m[1] === 'A' ? { ...veche, a: m[3] ?? '' } : { ...veche, b: m[3] ?? '' });
    }
    for (const { a, b } of poRed.values()) {
      if (!/^\d+(\.\d+)?$/.test(a) || b.length <= 25) continue;
      nameren.push(b);
    }
  }
  return nameren;
}

/** Инструкциите му, както живеят в кода. */
function instruktsiiteVKoda(): string[] {
  return Object.values(DUMI_OT_KNIGATA).flatMap((spisak) => spisak.map((d) => d.tekst.trim()));
}

describe('Заданието и кодът носят ЕДНИ И СЪЩИ негови думи', () => {
  it('Заданието изобщо се ЧЕТЕ · и в него ИМА инструкции', () => {
    // Обход, който не казва колко е видял, е зелен и когато не е гледал
    // (ADR-015 · обход Й). Затова първо се твърди обхватът.
    expect(readdirSync(ZADANIE).filter((f) => f.endsWith('.md'))).toHaveLength(12);
    expect(instruktsiiteVZadanieto().length).toBeGreaterThan(30);
    expect(instruktsiiteVKoda()).toHaveLength(42);
  });

  it('нито едно негово изречение не живее САМО на едното място', () => {
    const vZadanieto = instruktsiiteVZadanieto();
    const vKoda = instruktsiiteVKoda();

    const samoVZadanieto = vZadanieto.filter((t) => !vKoda.includes(t));
    const samoVKoda = vKoda.filter((t) => !vZadanieto.includes(t));

    expect(samoVZadanieto, 'изречения, които ги няма в кода').toEqual([]);
    expect(samoVKoda, 'изречения, които ги няма в Заданието').toEqual([]);
    // и сверка вход↔изход · нулата се записва (правило 7)
    expect(vZadanieto.length - vKoda.length).toBe(0);
  });
});
