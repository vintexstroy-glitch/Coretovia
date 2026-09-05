/**
 * СЛУЖИТЕЛИ · трите му бутона на този лист (ADR-008).
 *
 * „Стопани свързани с Coretovia" (A2) и „Служители свързани с Coretovia" (A6) са
 * две таблици с едни и същи колони и с НЕГОВИТЕ различни глави; „Създаване на
 * Длъжност с достъп" (B14) е трети бутон — ред в „Достъп на Длъжности за
 * Служител" с четирите оси.
 *
 * Редовете се поправят, изключват и връщат с родовите команди на реда
 * (`red.popraviKletka` · `red.izklyuchi` · `red.varni`), както навсякъде.
 */

import { komandaZaNovRed } from './red.js';

export const sluzhiteliDobaviStopan = komandaZaNovRed(
  'stopani',
  'sluzhiteli.dobaviStopan',
  'Добави Стопанин',
  'Добавя ред в „Стопани свързани с Coretovia" · име, телефон, имейл, адрес, длъжност.',
);

export const sluzhiteliDobaviSluzhitel = komandaZaNovRed(
  'sluzhiteli',
  'sluzhiteli.dobaviSluzhitel',
  'Добави Служител',
  'Добавя ред в „Служители свързани с Coretovia" · имейлът му го свързва с Длъжността.',
);

export const sluzhiteliDobaviDlazhnost = komandaZaNovRed(
  'dostap',
  'sluzhiteli.dobaviDlazhnost',
  'Създаване на Длъжност с достъп',
  'Добавя ред в „Достъп на Длъжности за Служител" · четирите оси, с неговите думи.',
);
