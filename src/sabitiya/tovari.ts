/**
 * ТОВАРИТЕ · какво носи всяко събитие на резен 1 (ADR-003).
 *
 * Товарът е ЗАМРАЗЕНИЯТ вид на записа в Журнала — ще се чете и след години
 * точно както е записан (правило 1). Огледалото е живата проекция и се мени;
 * затова двете не делят тип, колкото и да си приличат.
 *
 * Едно родово събитие за редовете (`РедЗаписан`), не по едно на таблица:
 * колоните са ДАННИ, и всяка нова колона щеше иначе да ражда код.
 */

import type { Kletki } from '../model/kletka.js';
import type { Belezi } from '../model/nomenklatura.js';

export interface PayloadStopaninZapisan {
  readonly imeyl: string;
}

/** Добавя (нов номер) или преименува (същият номер) стойност в номенклатура. */
export interface PayloadStoynostZapisana {
  readonly nomenklatura: string;
  readonly nomer: number;
  readonly tekst: string;
  readonly belezi: Belezi;
}

export interface PayloadStoynostSpryana {
  readonly nomenklatura: string;
  readonly nomer: number;
  readonly spryana: boolean;
  /** белезите · нужни за номенклатура по белег (Видът е № 1 и под Сграда, и под Паркинг) */
  readonly belezi: Belezi;
}

/** Създава (първият за id-то) или поправя (частичен `kletki`) · последната дума бие ПО ПОЛЕ. */
export interface PayloadRedZapisan {
  readonly tablitsa: string;
  readonly id: string;
  readonly kletki: Kletki;
}

export interface PayloadRedIzklyuchen {
  readonly tablitsa: string;
  readonly id: string;
  readonly izklyuchen: boolean;
}

/** Къде е стигнала една верига · подписаните полета, по които dryRun ↔ izpalni се сравняват. */
export interface Kursor {
  readonly naematel: string;
  readonly seq: number;
  readonly hash: string;
}

/** Разписката за изнесена Книга · какво е било Огледалото, когато файлът е тръгнал. */
export interface PayloadKnigaIznesena {
  /** отпечатъкът на МОДЕЛА (структурата), не на данните */
  readonly otpechatak: string;
  readonly kursor: Kursor;
  /** живи редове по таблица · сверката на износа */
  readonly redove: Readonly<Record<string, number>>;
  readonly iznesenoNa: string;
}

export interface PayloadStorno {
  readonly pogasyavaSeq: number;
  /** пропусната = своята верига */
  readonly pogasyavaVeriga?: string;
  readonly prichina: string;
}
