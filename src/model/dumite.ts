/**
 * ДУМИТЕ МУ ПО БЛОКОВЕ · един дом за „кой ред на кой блок принадлежи".
 *
 * В листа ИмотиОбектиБизнеси инструкциите му стоят в три блока (редове 1–2 ·
 * 12–14 · 50–52), по един над всяка таблица. Блокът се познава по прекъсване
 * в номера на реда, не по заковани прагове — така екранът и износът четат
 * едно и също и при нова Книга (правило 14).
 */

import { DUMI_OT_KNIGATA, type DumaOtKnigata } from './dumi-ot-knigata.js';
import type { KlyuchNaProzorets } from './klyuchove.js';

export function blokoveNaDumite(klyuch: KlyuchNaProzorets): DumaOtKnigata[][] {
  const blokove: DumaOtKnigata[][] = [];
  let posleden = -2;
  for (const d of DUMI_OT_KNIGATA[klyuch]) {
    if (d.red !== posleden + 1) blokove.push([]);
    blokove[blokove.length - 1]!.push(d);
    posleden = d.red;
  }
  return blokove;
}
