/**
 * УПРАВЛЕНИЕ · задачата · негово (B1–B3 · B5 · B10): „/Добави Дело/(Дело към Имот
 * или към Обект)" … „Да може тук да се ползва десния бутон и да се дава опция за
 * Всеки Имот или Обект да се избира и добавят тези 3 функции за добавяне".
 *
 * ЕДНА родова команда „нов ред" в таблицата `zadachi`, достъпна от десния бутон
 * върху Имот, Обект или Бизнес: избраният ред става родителят (`kam`), а видът
 * (Дело · Среща · Преписка · Проект) се избира в черновата от Вид на задача.
 * Голямото дело (B4) стои в менюто сиво, с думи — идва с резен 8.
 */

import { TABLITSI } from '../../model/osnova.js';
import { komandaZaNovRed } from './red.js';

const RODITELI = new Set(
  TABLITSI.find((t) => t.klyuch === 'zadachi')?.koloni.find((k) => k.klyuch === 'kam')?.vrazka ??
    [],
);

export const upravlenieDobaviZadacha = komandaZaNovRed(
  'zadachi',
  'upravlenie.dobaviZadacha',
  'Добави Задача',
  'Добавя задача (Дело · Среща · Преписка · Проект) към избрания Имот, Обект или Бизнес.',
  {
    myasto: 'desen-buton',
    otIzbora: (izbran) =>
      RODITELI.has(izbran.tablitsa)
        ? {
            kletki: {
              kam: { tekst: izbran.id },
              vid: null,
              ime: null,
              ot: null,
              do: null,
              otsenka: null,
              byudzhet: null,
            },
          }
        : null,
  },
);
