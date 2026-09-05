// ГЕНЕРАТОРЪТ на `src/model/dumi-ot-knigata.ts` · неговите инструкции по прозорец,
// извадени от мострата (а тя — от Книгата му). Пуска се с `npm run dumi`.
//
// Правило 17: думите му имат един дом в кода. Файлът НЕ се пише на ръка; при нова
// Книга се пуска генераторът. Редът на прозорците е редът на `PROZORTSI`.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROZORTSI } from '../src/model/osnova.ts';
import { MOSTRA } from '../tests/mostri/mostra-kniga.ts';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '..');

/** листът → ключът на прозореца · от единствения дом на имената (K1) */
const KLYUCH = Object.fromEntries(PROZORTSI.map((p) => [p.list, p.klyuch]));

const esc = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`;

/** инструкция = номер в A · текст над 25 знака в B · нищо друго на реда */
function eInstruktsiya(red) {
  const [a, b, ...ostanali] = red;
  const aNomer = typeof a === 'number' || (typeof a === 'string' && /^\d+(\.\d+)?$/.test(a));
  const drugi = ostanali.some((c) => c !== null && c !== undefined);
  return aNomer && typeof b === 'string' && b.length > 25 && !drugi;
}

const out = [];
out.push('/**');
out.push(' * НЕГОВИТЕ ДУМИ ОТ КНИГАТА · инструкциите по прозорец, дословно (правило 14).');
out.push(' *');
out.push(' * Всеки лист на Книгата му започва с номерирани редове в колони A и B — какво');
out.push(' * прави прозорецът и как. Те са ЗАДАНИЕТО и се пренасят буква по буква, с');
out.push(' * правописа му. Износът ги слага обратно на същите редове, за да се отваря');
out.push(' * свалената Книга КАТО НЕГОВАТА. Единственият дом на тези думи в кода; в');
out.push(' * `zadanie/01–08` стоят същите, с адресите си.');
out.push(' *');
out.push(' * ГЕНЕРИРАН файл (`npm run dumi` · `stroezh/dumi-ot-knigata.mjs`) — не се пише');
out.push(' * на ръка; при нова Книга се генерира наново.');
out.push(' */');
out.push('');
out.push("import type { KlyuchNaProzorets } from './klyuchove.js';");
out.push('');
out.push('export interface DumaOtKnigata {');
out.push('  /** редът в листа му · 1-базиран */');
out.push('  readonly red: number;');
out.push('  /** номерът му в колона A · дословно („1" · „3.1") */');
out.push('  readonly nomer: string;');
out.push('  /** текстът в колона B · дословно */');
out.push('  readonly tekst: string;');
out.push('}');
out.push('');
out.push(
  'export const DUMI_OT_KNIGATA: Readonly<Record<KlyuchNaProzorets, readonly DumaOtKnigata[]>> =',
);
out.push('  Object.freeze({');
let broy = 0;
for (const list of MOSTRA) {
  const k = KLYUCH[list.ime];
  if (k === undefined) throw new Error(`непознат лист в мострата: ${list.ime}`);
  out.push(`    ${k}: [`);
  list.redove.forEach((red, i) => {
    if (!eInstruktsiya(red)) return;
    out.push(`      { red: ${i + 1}, nomer: ${esc(String(red[0]))}, tekst: ${esc(red[1])} },`);
    broy += 1;
  });
  out.push('    ],');
}
out.push('  });');
out.push('');
writeFileSync(join(KOREN, 'src', 'model', 'dumi-ot-knigata.ts'), out.join('\n'));
console.log(`dumi-ot-knigata.ts · ${broy} думи в ${MOSTRA.length} прозореца`);
