/**
 * КЛЕТКАТА · ТОЧНО един слот, по вида на колоната (`slotNaKolonata`).
 *
 *   · `tekst`       — текст · дата (ISO) · връзка (id на ред от друга таблица)
 *   · `chislo`      — цяло · площта е в цели кв. см
 *   · `stoynost_st` — цели центове (правило 3)
 *   · `nomer`       — замразеният номер на стойност от номенклатура
 *
 * Формата е на МОДЕЛА, не на събитието: колоната казва кой слот, клетката го
 * носи, а събитието `РедЗаписан` и Огледалото само я пренасят.
 */

import type { Slot } from './kolona.js';

export type Kletka =
  | { readonly tekst: string }
  | { readonly chislo: number }
  | { readonly stoynost_st: number }
  | { readonly nomer: number };

/** Клетките на един ред · `null` значи „изпразни" — и то е решение на човек. */
export type Kletki = Readonly<Record<string, Kletka | null>>;

const SLOTOVE: readonly Slot[] = ['tekst', 'chislo', 'stoynost_st', 'nomer'];

/** Слотът на клетката · единственият ѝ ключ. */
export function slotNaKletka(k: Kletka): Slot {
  if ('tekst' in k) return 'tekst';
  if ('chislo' in k) return 'chislo';
  if ('stoynost_st' in k) return 'stoynost_st';
  return 'nomer';
}

export function stoynostNaKletka(k: Kletka): string | number {
  if ('tekst' in k) return k.tekst;
  if ('chislo' in k) return k.chislo;
  if ('stoynost_st' in k) return k.stoynost_st;
  return k.nomer;
}

/** Клетка ли е · точно един от четирите ключа, с правилния вид стойност. */
export function eKletka(x: unknown): x is Kletka {
  if (typeof x !== 'object' || x === null) return false;
  const klyuchove = Object.keys(x);
  if (klyuchove.length !== 1) return false;
  const [klyuch] = klyuchove;
  if (klyuch === undefined || !(SLOTOVE as readonly string[]).includes(klyuch)) return false;
  const v = (x as Record<string, unknown>)[klyuch];
  // празният текст НЕ е клетка · изпразването е `null`, и то е едно (складът и оракулът го четат еднакво)
  if (klyuch === 'tekst') return typeof v === 'string' && v !== '';
  if (typeof v !== 'number' || !Number.isSafeInteger(v)) return false;
  return klyuch !== 'nomer' || v >= 1;
}
