/**
 * ТАБЛИЦАТА В ОГЛЕДАЛОТО · редовете на една таблица от Модела, колонно.
 *
 * Редът е ПОЗИЦИЯ (в реда на създаване — тя е и броячът на номерацията при
 * Имотите), id-то е идентичност, `indeks` ги свързва. Изключеният ред остава
 * на мястото си с флаг: правило 1 и замразената номерация не позволяват дупка.
 *
 * Екранът и износът виждат само `TablitsaVOgledaloto` и трите четящи функции
 * долу — складът може да се смени, без да ги пипа.
 */

import { slotNaKolonata } from '../model/kolona.js';
import type { Tablitsa } from '../model/tablitsa.js';
import type { Kletka, Kletki } from '../model/kletka.js';
import { kletkaOtStalb, type Stalb, StroitelNaStalb } from './stalb.js';

export interface TablitsaVOgledaloto {
  readonly klyuch: string;
  /** редове, вкл. изключените */
  readonly broy: number;
  readonly id: readonly string[];
  /** веригата и seq на ПОСЛЕДНОТО приложено събитие за реда · за rev-предпазителя */
  readonly veriga: readonly string[];
  readonly seq: readonly number[];
  readonly izklyuchen: Uint8Array;
  readonly koloni: ReadonlyMap<string, Stalb>;
  readonly indeks: ReadonlyMap<string, number>;
}

export interface Red {
  readonly i: number;
  readonly id: string;
  readonly veriga: string;
  readonly seq: number;
  readonly izklyuchen: boolean;
  readonly kletki: Readonly<Record<string, Kletka>>;
}

export function kletkaNa(t: TablitsaVOgledaloto, i: number, kolona: string): Kletka | null {
  const s = t.koloni.get(kolona);
  return s === undefined ? null : kletkaOtStalb(s, i);
}

export function redKato(t: TablitsaVOgledaloto, i: number): Red {
  const kletki: Record<string, Kletka> = {};
  for (const [klyuch, s] of t.koloni) {
    const k = kletkaOtStalb(s, i);
    if (k !== null) kletki[klyuch] = k;
  }
  return {
    i,
    id: t.id[i] ?? '',
    veriga: t.veriga[i] ?? '',
    seq: t.seq[i] ?? 0,
    izklyuchen: t.izklyuchen[i] === 1,
    kletki,
  };
}

/** Позициите на живите (неизключени) редове · в реда на създаване. */
export function zhiviteRedove(t: TablitsaVOgledaloto): number[] {
  const zhivi: number[] = [];
  for (let i = 0; i < t.broy; i += 1) if (t.izklyuchen[i] !== 1) zhivi.push(i);
  return zhivi;
}

export class StroitelNaTablitsa {
  readonly #t: Tablitsa;
  readonly #koloni = new Map<string, StroitelNaStalb>();
  readonly #id: string[] = [];
  readonly #veriga: string[] = [];
  readonly #seq: number[] = [];
  readonly #izklyuchen: number[] = [];
  readonly #indeks = new Map<string, number>();

  constructor(t: Tablitsa) {
    this.#t = t;
    for (const k of t.koloni) {
      const slot = slotNaKolonata(k);
      if (slot !== undefined) this.#koloni.set(k.klyuch, new StroitelNaStalb(slot));
    }
  }

  /** Позицията на реда · ражда го при първа среща. */
  red(id: string, veriga: string, seq: number): number {
    let i = this.#indeks.get(id);
    if (i === undefined) {
      i = this.#id.length;
      this.#id.push(id);
      this.#veriga.push(veriga);
      this.#seq.push(seq);
      this.#izklyuchen.push(0);
      this.#indeks.set(id, i);
    } else {
      this.#veriga[i] = veriga;
      this.#seq[i] = seq;
    }
    return i;
  }

  ima(id: string): boolean {
    return this.#indeks.has(id);
  }

  zapishi(id: string, veriga: string, seq: number, kletki: Kletki): void {
    const i = this.red(id, veriga, seq);
    for (const [klyuch, k] of Object.entries(kletki)) {
      const stalb = this.#koloni.get(klyuch);
      if (stalb === undefined) {
        throw new Error(
          `Таблица „${this.#t.klyuch}" няма стълб „${klyuch}" — проверката преди Огледалото е пропусната.`,
        );
      }
      stalb.slozhi(i, k);
    }
  }

  izklyuchi(id: string, veriga: string, seq: number, da: boolean): void {
    const i = this.red(id, veriga, seq);
    this.#izklyuchen[i] = da ? 1 : 0;
  }

  zavarshi(): TablitsaVOgledaloto {
    const broy = this.#id.length;
    const koloni = new Map<string, Stalb>();
    for (const [klyuch, s] of this.#koloni) koloni.set(klyuch, s.zavarshi(broy));
    return Object.freeze({
      klyuch: this.#t.klyuch,
      broy,
      id: Object.freeze([...this.#id]),
      veriga: Object.freeze([...this.#veriga]),
      seq: Object.freeze([...this.#seq]),
      izklyuchen: Uint8Array.from(this.#izklyuchen),
      koloni,
      indeks: new Map(this.#indeks),
    });
  }
}
