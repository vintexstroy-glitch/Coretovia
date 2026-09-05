/**
 * МОСТРАТА · синтетичната Книга, със СЪЩАТА направа като неговата (правило 29).
 *
 * Неговият файл носи истински хора — телефони и имейли на служители и на
 * купувачи. Той не влиза в хранилището (публично, заради Pages). Влиза тази
 * мостра: осемте листа, лентите, главите, редът „филтър", номерацията,
 * секциите, редът със SUM — и измислени хора и числа.
 *
 * Описанието на съдържанието е ДАННИ в `tests/mostri/mostra-kniga.ts`, за да го
 * ползва и тестът на кръга (в паметта), и този скрипт (на диска). Не се вика от
 * строежа: сменя се с ревю, като всяка мостра.
 *
 *     node stroezh/mostra-kniga.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { napishiKniga } from '../src/kniga/ooxml.ts';
import { MOSTRA } from '../tests/mostri/mostra-kniga.ts';

const PAT = fileURLToPath(new URL('../tests/mostri/Coretovia-mostra.xlsx', import.meta.url));
const baytove = await napishiKniga(MOSTRA);
writeFileSync(PAT, baytove);
console.log(`мострата: ${MOSTRA.length} листа · ${(baytove.length / 1024).toFixed(1)} KB → ${PAT}`);
