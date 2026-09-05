/**
 * КОМАНДАТА · данни + чиста функция `dryRun`, без изпълнение (ADR-003 · K2).
 *
 * Каталогът от команди е ЕДИНСТВЕНИЯТ вход към Вратата — за екрана, за Книгата
 * и за агента. Командата не пише: тя връща ПРЕДВАРИТЕЛНО (какви операции,
 * какви разлики, с какви думи), а пише единствено `porta/izpalnitel.ts`.
 * Затова тук няма `izpalni`, и типът е това, което го гарантира (K3).
 *
 * ═══ ДЕТЕРМИНИЗЪМ ═══
 *
 * `dryRun` е чиста функция на (Огледало · komandaId · товар): изпълнителят я
 * повтаря преди записа и сравнява отпечатъка — променило ли се е нещо
 * междувременно, отказва с думи. Затова и id-то на нов ред се ИЗВЕЖДА от
 * `komandaId`, не се тегли на случаен принцип: същата команда ражда същия ред.
 */

import type { KlyuchNaProzorets, Vid } from '../model/klyuchove.js';
import type { Model } from '../model/model.js';
import type { IdNaPredlozhenie, Predlozhenie, Razlika } from '../model/predlozhenie.js';
import type { ShemaJSON } from '../model/shema.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import type { TipSabitie } from '../sabitiya/registar.js';
import type { Kursor } from '../sabitiya/tovari.js';
import { klyuchNaSashtnost, type Sashtnost } from '../yadro/sabitie.js';
import type { Sverka } from '../yadro/sverka.js';

/** Какво вижда командата · подава го изпълнителят · нищо от това не пише. */
export interface Kontekst {
  readonly model: Model;
  readonly ogledalo: Ogledalo;
  /** ключът на действието · ражда се в черновата и се преизползва до успех */
  readonly komandaId: string;
  readonly aktor: string;
  /** веригата, в която се пише */
  readonly veriga: string;
  readonly sega: string;
  /** какво стои на едно звено · за сторното · изпълнителят го знае от паметта си */
  zveno(veriga: string, seq: number): ZvenoVKratse | undefined;
}

export interface ZvenoVKratse {
  readonly type: string;
  readonly sashtnost: Sashtnost;
  readonly actor: string;
}

/** Една операция към Вратата · без opId, ts, naematel, actor — тях слага изпълнителят. */
export interface Operatsiya {
  readonly type: TipSabitie;
  readonly sashtnost: Sashtnost;
  readonly payload: Readonly<Record<string, unknown>>;
  /** rev-предпазителят · винаги подаден · 0 за нова същност */
  readonly expectedRev: number;
}

export type { Razlika } from '../model/predlozhenie.js';

export interface Predvaritelno {
  readonly komanda: string;
  readonly komandaId: string;
  readonly operatsii: readonly Operatsiya[];
  readonly razliki: readonly Razlika[];
  readonly sverki: readonly Sverka[];
  readonly otchet: string;
  /** докъде е веригата при dryRun · сравнява се при izpalni */
  readonly kursor: Kursor;
  /** отпечатък на операциите · същият товар върху същото Огледало дава същия */
  readonly otpechatak: string;
}

/** Къде се появява командата на екрана. */
export type Myasto = 'buton' | 'desen-buton' | 'kletka' | 'sluzhebna';

export interface Izbran {
  readonly tablitsa: string;
  readonly id: string;
}

export interface Preduslovie<V> {
  readonly ime: string;
  /** `null` = минава · иначе думите на отказа */
  readonly proveri: (v: V, k: Kontekst) => string | null;
}

export interface Komanda<V> {
  /** `prozorets.glagol` */
  readonly klyuch: string;
  readonly ime: string;
  readonly opisanie: string;
  readonly prozortsi: readonly KlyuchNaProzorets[];
  readonly stepen: 'chete' | 'pishe';
  readonly myasto: Myasto;
  /** СТРОГА · `additionalProperties: false`, всичко в `required` */
  readonly shema: ShemaJSON;
  /** кои събития ражда · тестът сверява, че всеки тип има писач */
  readonly proizvezhda: readonly TipSabitie[];
  /** единствено откриването минава без Стопанин */
  readonly bezStopanin?: true;
  /** товарът от избрания ред · за десните бутони · `null` = не важи за този ред */
  readonly otIzbora?: (izbran: Izbran, k: Kontekst) => V | null;
  /**
   * Товарът от предложение на Сверчика · `null` = не е за тази команда. Командата КАЗВА
   * кое предложение изпълнява; екранът и агентът не знаят ключ (ADR-004). `idNa` дава
   * ключа на действието на предложение № i — за заместителя `@predlozhenie:N`.
   */
  readonly otPredlozhenie?: (p: Predlozhenie, idNa: IdNaPredlozhenie) => V | null;
  readonly predusloviya: readonly Preduslovie<V>[];
  dryRun(v: V, k: Kontekst): Predvaritelno;
}

/** id на нов ред · ИЗВЕДЕН от действието · същата команда, същият ред. */
export function idNaRed(vid: Vid, komandaId: string): string {
  return `${vid}:${komandaId}`;
}

/** rev-ът на същността във веригата за писане · 0, ако още няма събитие. */
export function revNa(k: Kontekst, s: Sashtnost): number {
  return k.ogledalo.revove.get(k.veriga)?.get(klyuchNaSashtnost(s)) ?? 0;
}

export function kursorNa(k: Kontekst): Kursor {
  return k.ogledalo.kursori.get(k.veriga) ?? { naematel: k.veriga, seq: 0, hash: '' };
}

export function razlika(kakvo: string, bilo: string, stava: string): Razlika {
  return { kakvo, bilo, stava };
}

/**
 * ОТПЕЧАТЪК НА ОПЕРАЦИИТЕ · FNV-1a върху каноничен JSON (ключове подредени).
 *
 * Не е криптографски и не трябва да е: сравнява две сметки на една и съща
 * машина в една и съща минута. Синхронен, за да остане `dryRun` чист.
 */
export function otpechatakNaOperatsiite(operatsii: readonly Operatsiya[]): string {
  const kanonichno = JSON.stringify(operatsii, (_k, v: unknown) =>
    typeof v === 'object' && v !== null && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : v,
  );
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x9e3779b9;
  for (let i = 0; i < kanonichno.length; i += 1) {
    const c = kanonichno.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x01000193) >>> 0;
  }
  return `${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
}

export function predvaritelno(
  k: Kontekst,
  komanda: string,
  operatsii: readonly Operatsiya[],
  razliki: readonly Razlika[],
  otchet: string,
  sverki: readonly Sverka[] = [],
): Predvaritelno {
  return Object.freeze({
    komanda,
    komandaId: k.komandaId,
    operatsii: Object.freeze([...operatsii]),
    razliki: Object.freeze([...razliki]),
    sverki: Object.freeze([...sverki]),
    otchet,
    kursor: kursorNa(k),
    otpechatak: otpechatakNaOperatsiite(operatsii),
  });
}
