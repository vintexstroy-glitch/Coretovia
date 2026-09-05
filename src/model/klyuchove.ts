/**
 * КЛЮЧОВЕТЕ · прозорците, видовете същности и адресът им в Журнала.
 *
 * Идиомът е пренесен от MasterBook: константен обект → съюз от стойностите му →
 * `sashtnost(vid, id)`. Нов вид същност = нов ред ТУК, не низ някъде в командата.
 * Ключовете на прозорците също са тук (без имената на листовете — те имат един
 * дом, `osnova.ts`), за да може всичко под основата да ги ползва без кръг.
 */

import type { Sashtnost } from '../yadro/sabitie.js';

export type KlyuchNaProzorets =
  | 'profil'
  | 'imoti'
  | 'upravlenie'
  | 'smetki'
  | 'sluzhiteli'
  | 'prodazhbi'
  | 'ii'
  | 'nastroyki';

export interface ProzoretsVOsnovata {
  readonly klyuch: KlyuchNaProzorets;
  /** името на ЛИСТА в Книгата · дословно */
  readonly list: string;
  /** лентите (заглавията на таблици) в листа · в реда от файла · наши думи, къси */
  readonly lenti: readonly string[];
}

export const VID = Object.freeze({
  /** редовете на вградените таблици · видът е ключът на таблицата */
  imot: 'imot',
  obekt: 'obekt',
  biznes: 'biznes',
  /** ред от таблицата Задачи на Управление · Дело · Среща · Преписка · Проект */
  zadacha: 'zadacha',
  /** ред с пари от листа Сметки · приход или разход, по знака (правило 20) */
  dvizhenie: 'dvizhenie',
  /** кешът, даден за месец · един ред на месец (негово, 05.09) */
  kesh: 'kesh',
  /** една номенклатура · id = ключът ѝ · всички стойности живеят на този адрес */
  nomenklatura: 'nomenklatura',
  stopanin: 'stopanin',
  /** разписката за изнесена Книга */
  kniga: 'kniga',
} as const);

export type Vid = (typeof VID)[keyof typeof VID];

/**
 * Адресът на същност в Журнала. Идентичността на реда е id (`vid:‹ключ на
 * действието›`, виж `komandi/komanda.ts`), не номер и не текст: номерацията
 * `3.1.1.27` е човешкият адрес и се СМЯТА; преименуване не сменя реда.
 */
export function sashtnost(vid: Vid, id: string): Sashtnost {
  return { vid, id };
}
