/**
 * ПРЕДЛОЖЕНИЕТО · данни на домейна, не команда (ADR-004 · K3).
 *
 * Сверчикът (`src/kniga/sverchik.ts`) ги ражда; човекът отмята; командата от
 * каталога, която знае да го изпълни, го КАЗВА сама (`Komanda.otPredlozhenie`),
 * така че нито екранът, нито агентът знаят ключ на команда. Типът е в Модела,
 * защото го четат и Книгата, и командите, и (резен 7) агентът — а Моделът е
 * под всички тях.
 *
 * Всяко предложение носи адрес в Книгата, думи „защо", отметка по подразбиране
 * (изключването не е) и от кои други предложения зависи (нова стойност → ред,
 * нов Имот → Обект под него).
 */

import type { Kletki } from './kletka.js';
import type { Belezi } from './nomenklatura.js';

/** Клетка, която сочи ред, роден от предложение в СЪЩАТА Книга · командата я замества с id-то. */
export const PREDLOZHENIE = '@predlozhenie:';

/** Разликата с думи · какво било, какво става · за екрана и за агента. */
export interface Razlika {
  readonly kakvo: string;
  readonly bilo: string;
  readonly stava: string;
}

interface Obshto {
  /** адресът в Книгата · клетка или ред */
  readonly adres: string;
  readonly list: string;
  readonly zashto: string;
  /** отметнато по подразбиране · изключването не е */
  readonly poPodrazbirane: boolean;
  /** индекси на предложения, които трябва да минат ПРЕДИ това */
  readonly zavisiOt: readonly number[];
}

export type Predlozhenie =
  | (Obshto & {
      readonly vid: 'nova-stoynost';
      readonly nomenklatura: string;
      readonly tekst: string;
      readonly belezi: Belezi;
      /** номерът, който ще получи · следващият в обхвата към момента на сверката */
      readonly nomer: number;
    })
  | (Obshto & {
      readonly vid: 'preimenuvana';
      readonly nomenklatura: string;
      readonly nomer: number;
      readonly belezi: Belezi;
      readonly tekst: string;
      readonly bilo: string;
    })
  | (Obshto & {
      readonly vid: 'spryana' | 'varnata';
      readonly nomenklatura: string;
      readonly nomer: number;
      readonly belezi: Belezi;
      readonly tekst: string;
    })
  | (Obshto & {
      readonly vid: 'nov-red';
      readonly tablitsa: string;
      readonly kletki: Kletki;
      /** номерът на реда в Книгата (Имоти · колона A) · за връзките от Обектите */
      readonly nomerVKnigata: number | null;
    })
  | (Obshto & {
      readonly vid: 'popravka';
      readonly tablitsa: string;
      readonly id: string;
      readonly kletki: Kletki;
      readonly razliki: readonly Razlika[];
    })
  | (Obshto & {
      readonly vid: 'izklyuchi';
      readonly tablitsa: string;
      readonly id: string;
    });

/** Видовете · пин за тестовете: всеки има команда. */
export const VIDOVE_PREDLOZHENIYA: readonly Predlozhenie['vid'][] = Object.freeze([
  'nova-stoynost',
  'preimenuvana',
  'spryana',
  'varnata',
  'nov-red',
  'popravka',
  'izklyuchi',
]);

/** Думите на вида · за екрана. */
export const DUMI_NA_VIDA: Readonly<Record<Predlozhenie['vid'], string>> = Object.freeze({
  'nova-stoynost': 'нова стойност',
  preimenuvana: 'преименувана',
  spryana: 'спряна',
  varnata: 'върната',
  'nov-red': 'нов ред',
  popravka: 'поправка',
  izklyuchi: 'изключване',
});

/** Ключът на действието за предложение № i · ражда се при „Приеми" и се преизползва до успех. */
export type IdNaPredlozhenie = (indeks: number) => string;
