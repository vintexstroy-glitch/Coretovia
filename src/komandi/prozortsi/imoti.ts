/**
 * ИМОТИ · ОБЕКТИ · БИЗНЕСИ · трите му бутона („/Създай имот/", „/Добави Обект/",
 * „/Добави Бизнес/") — ЕДНА родова команда с три имена (`red.ts`): колоните са
 * данни и създаването е родово. Поправката, изключването и връщането на ред са
 * родови за всички таблици и живеят в `red.ts`.
 */

import { komandaZaNovRed } from './red.js';

export const imotiSazdayImot = komandaZaNovRed(
  'imoti',
  'imoti.sazdayImot',
  'Създай имот',
  'Вкарва имот в списъка с данните за имота.',
);
export const imotiDobaviObekt = komandaZaNovRed(
  'obekti',
  'imoti.dobaviObekt',
  'Добави Обект',
  'Избираш от падащо меню добавените Имоти и допълваш данни за обекта.',
);
export const imotiDobaviBiznes = komandaZaNovRed(
  'biznesi',
  'imoti.dobaviBiznes',
  'Добави Бизнес',
  'Избираш от падащо меню добавените Имоти и допълваш данни за Бизнеса.',
);
