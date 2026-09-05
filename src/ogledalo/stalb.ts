/**
 * СТЪЛБЪТ · една колона на таблица в Огледалото, като типизиран масив.
 *
 * Колонен склад (struct-of-arrays): сборът на „цена" е един цикъл по
 * `Float64Array`, без обект на ред. Празното е `NaN` при числата и `0` при
 * номерата и текста (кодът 0 на Речника е празният низ) — така „няма стойност"
 * не иска втори масив.
 *
 * Парите са ЦЕЛИ центове в `Float64Array`: до 2^53 всяко цяло е точно, а
 * сборът остава цял (правило 3). Строителят отказва нецяло при слагане.
 */

import type { Slot } from '../model/kolona.js';
import { type Kletka, slotNaKletka, stoynostNaKletka } from '../model/kletka.js';
import { Rechnik } from './rechnik.js';

export type Stalb =
  | { readonly slot: 'chislo' | 'stoynost_st'; readonly danni: Float64Array }
  | { readonly slot: 'nomer'; readonly danni: Int32Array }
  | { readonly slot: 'tekst'; readonly danni: Int32Array; readonly rechnik: Rechnik };

const NACHALO = 16;

export class StroitelNaStalb {
  readonly #slot: Slot;
  readonly #rechnik: Rechnik | undefined;
  #danni: Float64Array | Int32Array;

  constructor(slot: Slot) {
    this.#slot = slot;
    this.#rechnik = slot === 'tekst' ? new Rechnik() : undefined;
    this.#danni = this.#nov(NACHALO);
  }

  #nov(dalzhina: number): Float64Array | Int32Array {
    if (this.#slot === 'chislo' || this.#slot === 'stoynost_st') {
      return new Float64Array(dalzhina).fill(Number.NaN);
    }
    return new Int32Array(dalzhina);
  }

  #osiguri(i: number): void {
    if (i < this.#danni.length) return;
    let dalzhina = this.#danni.length;
    while (dalzhina <= i) dalzhina *= 2;
    const nov = this.#nov(dalzhina);
    nov.set(this.#danni);
    this.#danni = nov;
  }

  /** Слага клетка на ред `i` · `null` изпразва · грешен слот е грешка в кода, не в данните. */
  slozhi(i: number, k: Kletka | null): void {
    this.#osiguri(i);
    if (k === null) {
      this.#danni[i] = this.#slot === 'tekst' || this.#slot === 'nomer' ? 0 : Number.NaN;
      return;
    }
    const slot = slotNaKletka(k);
    if (slot !== this.#slot) {
      throw new Error(
        `Стълбът е „${this.#slot}", а клетката е „${slot}" — проверката преди Огледалото е пропусната.`,
      );
    }
    const v = stoynostNaKletka(k);
    if (typeof v === 'string') {
      this.#danni[i] = this.#rechnik?.kod(v) ?? 0;
      return;
    }
    if (!Number.isSafeInteger(v)) throw new Error(`Нецяло число в стълб „${this.#slot}": ${v}`);
    this.#danni[i] = v;
  }

  zavarshi(broy: number): Stalb {
    this.#osiguri(Math.max(broy - 1, 0));
    const danni = this.#danni.subarray(0, broy);
    if (this.#slot === 'tekst') {
      return { slot: 'tekst', danni: danni as Int32Array, rechnik: this.#rechnik ?? new Rechnik() };
    }
    if (this.#slot === 'nomer') return { slot: 'nomer', danni: danni as Int32Array };
    return { slot: this.#slot, danni: danni as Float64Array };
  }
}

/** Клетката от стълб · `null` за празно. */
export function kletkaOtStalb(s: Stalb, i: number): Kletka | null {
  const v = s.danni[i];
  if (v === undefined) return null;
  switch (s.slot) {
    case 'tekst':
      return v === 0 ? null : { tekst: s.rechnik.tekst(v) };
    case 'nomer':
      return v === 0 ? null : { nomer: v };
    case 'chislo':
      return Number.isNaN(v) ? null : { chislo: v };
    case 'stoynost_st':
      return Number.isNaN(v) ? null : { stoynost_st: v };
  }
}
