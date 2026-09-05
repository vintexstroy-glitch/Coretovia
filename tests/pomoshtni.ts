import { sha256Node } from '../src/nositel/hash-node.js';
import { TIP } from '../src/sabitiya/registar.js';
import {
  DnevnikVPametta,
  type Operatsiya,
  type Rezultat,
  type Sabitie,
  type Sashtnost,
  Vrata,
  VsichkoRazresheno,
} from '../src/yadro/index.js';

/** Носителят за тестовете. Ядрото нарочно няма стойност по подразбиране. */
export const SHA = sha256Node;

/** Детерминистичен генератор — без Math.random, за да са тестовете повторяеми. */
export function seyalka(seme = 1): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

/** Ключът на книгата в тестовете · пренесен дословно с тестовете на ядрото. */
export const KNIGA = 'vintexstroy';
export const STOPANIN = 'vintexstroy@gmail.com';
/** веригата на втория писач · наставката е дума на домейна, тук е само за теста */
export const VERIGA_NA_SLUZHITEL = `${KNIGA}~sluzhitel`;

/**
 * Една операция с разумни стойности по подразбиране.
 *
 * Типът на събитието е нарочно ОБЩ („ЗаписЗаписан"): ядрото не знае домейна и
 * тестовете му не бива да зависят от прозорец, който още не е построен.
 */
export function operatsiya(chast: Partial<Operatsiya> & { opId: string }): Operatsiya {
  return {
    ts: '2026-09-05T09:00:00.000Z',
    naematel: KNIGA,
    actor: STOPANIN,
    type: 'ЗаписЗаписан',
    sashtnost: { vid: 'zapis', id: 'Z-1' },
    payload: {},
    ...chast,
  };
}

export interface KnigaZaTest {
  readonly dnevnik: DnevnikVPametta;
  readonly vrata: Vrata;
  /** записва през Вратата · opId и ts се броят сами, детерминистично */
  zapishi(
    type: string,
    sashtnost: Sashtnost,
    payload: Record<string, unknown>,
    opts?: { veriga?: string; opId?: string; expectedRev?: number; actor?: string },
  ): Promise<Rezultat>;
  /** открива Книгата със Стопанина · първото събитие */
  otkriy(): Promise<Rezultat>;
  sabitiya(veriga?: string): Promise<Sabitie[]>;
}

/**
 * КНИГА ЗА ТЕСТ · истинска Врата върху Журнал в паметта, с откриващото събитие
 * на домейна. Тестовете на Огледалото и командите минават оттук, за да четат
 * събития, които са минали през ЕДИНСТВЕНИЯ вход за запис (правило 2).
 */
export function knigaZaTest(): KnigaZaTest {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({
    dnevnik,
    pravata: new VsichkoRazresheno(),
    sha: SHA,
    parvoto: TIP.stopaninZapisan,
    bezOtkrivane: (n) => n.includes('~'),
  });
  let broyach = 0;
  const nachalo = Date.parse('2026-09-05T09:00:00.000Z');
  const zapishi: KnigaZaTest['zapishi'] = (type, sashtnost, payload, opts = {}) => {
    broyach += 1;
    return vrata.dobavi({
      opId: opts.opId ?? `op-${broyach}`,
      ts: new Date(nachalo + broyach * 1000).toISOString(),
      naematel: opts.veriga ?? KNIGA,
      actor: opts.actor ?? STOPANIN,
      type,
      sashtnost,
      payload,
      ...(opts.expectedRev === undefined ? {} : { expectedRev: opts.expectedRev }),
    });
  };
  return {
    dnevnik,
    vrata,
    zapishi,
    otkriy: () => zapishi(TIP.stopaninZapisan, { vid: 'stopanin', id: KNIGA }, { imeyl: STOPANIN }),
    sabitiya: (veriga = KNIGA) => dnevnik.chetiVsichki(veriga),
  };
}
