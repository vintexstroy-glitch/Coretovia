/**
 * СМЕТКИ · движението, кешът и ДДС (ADR-006 · ADR-007).
 *
 * Движението е родов „нов ред" в `dvizheniya` — от бутона и от десния бутон
 * върху Имот, Обект или Бизнес (тогава родителят идва от избора и командата
 * ОТВАРЯ чернова). Върху него важат родовите предусловия на реда (`red.ts`) —
 * включително знакът срещу страната на секцията (правило 20) — и месецът ГГГГ-ММ.
 *
 * Кешът и ДДС са ЕДИН РЕД НА МЕСЕЦ (негово, 05.09 т.2). Затова са една и съща
 * команда с различни колони: ключът на реда се извежда от МЕСЕЦА (`kesh:2026-09`
 * · `dds:2026-09`), два раздела пишат в ЕДИН ред и `expectedRev` ги пази, вместо
 * да раждат по един ред на месец всеки.
 */

import type { Kletka } from '../../model/kletka.js';
import { sashtnost, VID, type Vid } from '../../model/klyuchove.js';
import { tablitsata } from '../../model/model.js';
import { MODEL } from '../../model/osnova.js';
import { shemaNaReda, strogObekt } from '../../model/shema.js';
import { kletkaNa, zhiviteRedove } from '../../ogledalo/tablitsa.js';
import { TIP } from '../../sabitiya/registar.js';
import { OBRAZETS_NA_MESETSA } from '../../smetach/smetki.js';
import { pishi } from '../../yadro/pari.js';
import {
  idNaRed,
  type Komanda,
  type Kontekst,
  predvaritelno,
  type Razlika,
  revNa,
} from '../komanda.js';
import { komandaZaNovRed } from './red.js';

const TABLITSA = 'dvizheniya';

/** Родителите, към които може да сочи движение · от Модела, не преписани. */
const RODITELI = new Set(
  tablitsata(MODEL, TABLITSA).koloni.find((k) => k.klyuch === 'kam')?.vrazka ?? [],
);

export const smetkiDobaviDvizhenie = komandaZaNovRed(
  TABLITSA,
  'smetki.dobaviDvizhenie',
  'Добави ред с пари',
  'Добавя приход или разход в секция · знакът решава страната (правило 20).',
  {
    predusloviya: [
      {
        ime: 'месецът е ГГГГ-ММ',
        proveri: (v) => {
          const m = v.kletki['mesets'];
          if (m === undefined || m === null || !('tekst' in m)) return null;
          return OBRAZETS_NA_MESETSA.test(m.tekst) ? null : `„${m.tekst}" не е месец ГГГГ-ММ.`;
        },
      },
    ],
    otIzbora: (izbran) =>
      RODITELI.has(izbran.tablitsa)
        ? {
            kletki: {
              kam: { tekst: izbran.id },
              ime: null,
              sektsiya: null,
              sektsiyaR: null,
              funktsiya: null,
              sastoyanie: null,
              mesets: null,
              suma: null,
            },
          }
        : null,
  },
);

/** Товарът на ред-за-месец · месецът и по едно число на колона. */
interface TovarZaMesets {
  readonly mesets: string;
  readonly [kolona: string]: Kletka | null | string;
}

/** Живият ред за месеца в таблица с колона `mesets` · `undefined`, ако още го няма. */
function redaNaMeseca(k: Kontekst, tablitsa: string, mesets: string): number | undefined {
  const tv = k.ogledalo.tablitsi.get(tablitsa);
  if (tv === undefined) return undefined;
  for (const i of zhiviteRedove(tv)) {
    const m = kletkaNa(tv, i, 'mesets');
    if (m !== null && 'tekst' in m && m.tekst === mesets) return i;
  }
  return undefined;
}

const dumiZaSuma = (x: Kletka | null): string =>
  x === null ? '' : 'stoynost_st' in x ? pishi(x.stoynost_st) : '';

/**
 * ЕДИН РЕД НА МЕСЕЦ · кешът и ДДС са една и съща команда с различни колони.
 *
 * Ключът се извежда от месеца, затова вторият запис за същия месец ПОПРАВЯ реда,
 * а не ражда втори; `expectedRev` пази двата раздела един от друг.
 */
function komandaZaMesets(
  tablitsa: string,
  vid: Vid,
  klyuch: string,
  ime: string,
  opisanie: string,
): Komanda<TovarZaMesets> {
  const t = tablitsata(MODEL, tablitsa);
  const koloni = t.koloni.filter((k) => k.klyuch !== 'mesets').map((k) => k.klyuch);
  const komanda: Komanda<TovarZaMesets> = {
    klyuch,
    ime,
    opisanie,
    prozortsi: [t.prozorets],
    stepen: 'pishe',
    myasto: 'sluzhebna',
    proizvezhda: [TIP.redZapisan],
    shema: strogObekt({
      // дължината я казва ПРЕДУСЛОВИЕТО, с думите на месеца, а не схемата с „7 знака"
      mesets: { type: 'string' },
      ...Object.fromEntries(
        Object.entries(shemaNaReda(t, 'sazdavane').properties ?? {}).filter(
          ([k]) => k !== 'mesets',
        ),
      ),
    }),
    predusloviya: [
      {
        ime: 'месецът е ГГГГ-ММ',
        proveri: (v) =>
          OBRAZETS_NA_MESETSA.test(v.mesets) ? null : `„${v.mesets}" не е месец ГГГГ-ММ.`,
      },
      {
        ime: 'поне едно число',
        proveri: (v) =>
          koloni.every((k) => (v[k] ?? null) === null)
            ? 'Няма какво да се запише — всички полета са празни.'
            : null,
      },
    ],
    dryRun: (v, k) => {
      const opis = tablitsata(k.model, tablitsa);
      const id = idNaRed(vid, v.mesets);
      const s = sashtnost(opis.sashtnost, id);
      const dosega = redaNaMeseca(k, tablitsa, v.mesets);
      const tv = k.ogledalo.tablitsi.get(tablitsa);
      const kletki: Record<string, Kletka | null> = { mesets: { tekst: v.mesets } };
      const razliki: Razlika[] = [];
      for (const kolona of koloni) {
        const novo = (v[kolona] as Kletka | null | undefined) ?? null;
        kletki[kolona] = novo;
        const staro =
          dosega === undefined || tv === undefined ? null : kletkaNa(tv, dosega, kolona);
        if (dumiZaSuma(staro) !== dumiZaSuma(novo))
          razliki.push({
            kakvo: opis.koloni.find((c) => c.klyuch === kolona)?.ime ?? kolona,
            bilo: dumiZaSuma(staro),
            stava: dumiZaSuma(novo),
          });
      }
      return predvaritelno(
        k,
        klyuch,
        [
          {
            type: TIP.redZapisan,
            sashtnost: s,
            payload: { tablitsa, id, kletki },
            expectedRev: revNa(k, s),
          },
        ],
        razliki,
        `${ime} · ${v.mesets}.`,
      );
    },
  };
  return Object.freeze(komanda);
}

export const smetkiZapishiKesh = komandaZaMesets(
  'kesh',
  VID.kesh,
  'smetki.zapishiKesh',
  'Запиши кеша за месеца',
  'Записва дадените кеш пари за Заплати Кеш и Фактури Кеш и изтегленото по извлечение за един месец.',
);

export const smetkiZapishiDds = komandaZaMesets(
  'dds',
  VID.dds,
  'smetki.zapishiDds',
  'Запиши ДДС за месеца',
  'Записва начисления ДДС, данъчния кредит, декларираното и платеното за един месец, и числата от счетоводството.',
);
