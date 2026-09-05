/**
 * СМЕТКИ · движението и кешът (ADR-006).
 *
 * Движението е родов „нов ред" в `dvizheniya` — от бутона и от десния бутон
 * върху Имот, Обект или Бизнес (тогава родителят идва от избора и командата
 * ОТВАРЯ чернова). Върху него важат родовите предусловия на реда (`red.ts`) и
 * ДВЕ негови: точно една секция, и тя е от страната на ЗНАКА (правило 20:
 * приходът е +, разходът е −; нулата не е движение), и месецът е ГГГГ-ММ.
 *
 * Кешът е един ред на МЕСЕЦ (негово, 05.09: „…дадени Кеш пари за Заплати и
 * Фактури Кеш и сверка на края на месеца от извлечението"). Ключът на реда е
 * изведен от месеца (`kesh:2026-09`), затова два раздела пишат в ЕДИН ред и
 * `expectedRev` ги пази — вместо да раждат по един ред на месец всеки.
 */

import type { Kletka } from '../../model/kletka.js';
import { sashtnost, VID } from '../../model/klyuchove.js';
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
const TABLITSA_KESH = 'kesh';

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

export interface TovarKesh {
  readonly mesets: string;
  readonly zaplati: Kletka | null;
  readonly fakturi: Kletka | null;
  readonly izvlechenie: Kletka | null;
}

/** Живият ред на кеша за месеца · `undefined`, ако още го няма. */
function redaNaMeseca(k: Kontekst, mesets: string): number | undefined {
  const tv = k.ogledalo.tablitsi.get(TABLITSA_KESH);
  if (tv === undefined) return undefined;
  for (const i of zhiviteRedove(tv)) {
    const m = kletkaNa(tv, i, 'mesets');
    if (m !== null && 'tekst' in m && m.tekst === mesets) return i;
  }
  return undefined;
}

const shemaNaKesha = strogObekt({
  // дължината я казва ПРЕДУСЛОВИЕТО, с думите на месеца, а не схемата с „7 знака"
  mesets: { type: 'string' },
  ...Object.fromEntries(
    Object.entries(
      shemaNaReda(tablitsata(MODEL, TABLITSA_KESH), 'sazdavane').properties ?? {},
    ).filter(([klyuch]) => klyuch !== 'mesets'),
  ),
});

const zapishiKesh: Komanda<TovarKesh> = {
  klyuch: 'smetki.zapishiKesh',
  ime: 'Запиши кеша за месеца',
  opisanie:
    'Записва дадените кеш пари за Заплати Кеш и Фактури Кеш и изтегленото по извлечение за един месец.',
  prozortsi: ['smetki'],
  stepen: 'pishe',
  myasto: 'sluzhebna',
  proizvezhda: [TIP.redZapisan],
  shema: shemaNaKesha,
  predusloviya: [
    {
      ime: 'месецът е ГГГГ-ММ',
      proveri: (v) =>
        OBRAZETS_NA_MESETSA.test(v.mesets) ? null : `„${v.mesets}" не е месец ГГГГ-ММ.`,
    },
    {
      ime: 'поне едно число',
      proveri: (v) =>
        v.zaplati === null && v.fakturi === null && v.izvlechenie === null
          ? 'Няма какво да се запише — и трите полета са празни.'
          : null,
    },
  ],
  dryRun: (v, k) => {
    const t = tablitsata(k.model, TABLITSA_KESH);
    // ключът на реда идва от МЕСЕЦА · два раздела пишат в един ред, не в два
    const id = idNaRed(VID.kesh, v.mesets);
    const s = sashtnost(t.sashtnost, id);
    const kletki: Record<string, Kletka | null> = {
      mesets: { tekst: v.mesets },
      zaplati: v.zaplati,
      fakturi: v.fakturi,
      izvlechenie: v.izvlechenie,
    };
    const i = redaNaMeseca(k, v.mesets);
    const tv = k.ogledalo.tablitsi.get(TABLITSA_KESH);
    const razliki: Razlika[] = [];
    for (const kol of t.koloni) {
      if (kol.klyuch === 'mesets') continue;
      const staro = i === undefined || tv === undefined ? null : kletkaNa(tv, i, kol.klyuch);
      const novo = kletki[kol.klyuch] ?? null;
      const dumi = (x: Kletka | null): string =>
        x === null ? '' : 'stoynost_st' in x ? pishi(x.stoynost_st) : '';
      if (dumi(staro) !== dumi(novo))
        razliki.push({ kakvo: kol.ime, bilo: dumi(staro), stava: dumi(novo) });
    }
    return predvaritelno(
      k,
      'smetki.zapishiKesh',
      [
        {
          type: TIP.redZapisan,
          sashtnost: s,
          payload: { tablitsa: TABLITSA_KESH, id, kletki },
          expectedRev: revNa(k, s),
        },
      ],
      razliki,
      `Кешът за ${v.mesets}.`,
    );
  },
};

export const smetkiZapishiKesh: Komanda<TovarKesh> = Object.freeze(zapishiKesh);
