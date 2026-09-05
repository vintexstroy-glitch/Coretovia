/**
 * КОЛОНАТА · какво е една колона на таблица, като ДАННИ (ADR-003).
 *
 * Видът живее в КОЛОНАТА, не в цифрата (ADR-014 на MasterBook, пренесен).
 * Оттук се извежда всичко останало: кой СЛОТ носи клетката в събитието, как
 * се показва, влиза ли в сбор, как се пише в Книгата.
 */

import type { VidStoynost } from './vid-stoynost.js';

/**
 * Видът на колоната · петте вида стойност плюс три, които са ВРЪЗКИ, не стойности:
 *
 *   · `izbor`       — падащо меню от номенклатура · клетката пази НОМЕРА на стойността;
 *   · `vrazka`      — ред от друга таблица (Обект → Имот) · клетката пази id-то му;
 *   · `nomeratsiya` — сметнатата номерация (`3.1.1.27`) · ЗАТВОРЕНА, никой не я пише.
 */
export type VidKolona = VidStoynost | 'izbor' | 'vrazka' | 'nomeratsiya';

/** Слотът в събитието · ТОЧНО един на клетка · по вида на колоната. */
export type Slot = 'tekst' | 'chislo' | 'stoynost_st' | 'nomer';

export interface Kolona {
  readonly klyuch: string;
  /** главата · дословно както е в Книгата, или НАША дума, ако Книгата я няма */
  readonly ime: string;
  readonly vid: VidKolona;
  /** ключът на номенклатурата · само при `izbor` */
  readonly nomenklatura?: string;
  /** ключът на таблицата, към която сочи · само при `vrazka` */
  readonly vrazka?: string;
  /** за `izbor` с номерация по белег · кой белег се взима от коя колона на същия ред */
  readonly belegOt?: string;
  readonly zadalzhitelna: boolean;
  /** затворена = сметка или пренесено · не се редактира от никого (правило 18) */
  readonly zatvorena: boolean;
  /** мярката на числото · кв. см за площ; иначе цяло число */
  readonly merka?: 'kvsm';
  /** думата ни е, не негова · за износа и за Заданието (правило 17) */
  readonly nashaDuma?: boolean;
}

/** Кой слот носи клетката на тази колона · `undefined` за затворените. */
export function slotNaKolonata(k: Kolona): Slot | undefined {
  if (k.zatvorena) return undefined;
  switch (k.vid) {
    case 'evro':
      return 'stoynost_st';
    case 'chislo':
    case 'protsent':
      return 'chislo';
    case 'izbor':
      return 'nomer';
    case 'tekst':
    case 'data':
    case 'vrazka':
      return 'tekst';
    case 'nomeratsiya':
      return undefined;
  }
}

/** Колоната влиза ли в сбор · само еврото (правило 3 · ADR-014). */
export function vlizaVSbor(k: Kolona): boolean {
  return k.vid === 'evro' && !k.zatvorena;
}
