/**
 * КНИГАТА · разписката за износ (решение 11).
 *
 * Пътят на износа е в екрана: Огледало → `kniga/pisane.ts` → файл → и ЧАК
 * тогава тази команда, която записва само РАЗПИСКАТА: с кой Модел, от кое
 * състояние, колко реда. Предусловието е, че отпечатъкът и курсорът са на
 * ТЕКУЩОТО състояние — иначе разписката би описвала файл, който не съществува.
 */

import { sashtnost } from '../../model/klyuchove.js';
import { otpechatakNaModela } from '../../model/otpechatak.js';
import { strogObekt } from '../../model/shema.js';
import { zhiviteRedove } from '../../ogledalo/tablitsa.js';
import { TIP } from '../../sabitiya/registar.js';
import type { Kursor } from '../../sabitiya/tovari.js';
import { type Komanda, type Kontekst, kursorNa, predvaritelno, razlika } from '../komanda.js';

interface TovarIznesi {
  readonly otpechatak: string;
  readonly kursor: Kursor;
  readonly redove: Readonly<Record<string, number>>;
  /** кога е написан файлът · от екрана, за да е `dryRun` чиста функция на товара */
  readonly iznesenoNa: string;
}

/** Живите редове по таблица · същото число, което износът брои. */
function zhiviRedovePoTablitsa(k: Kontekst): Record<string, number> {
  const r: Record<string, number> = {};
  for (const [klyuch, t] of k.ogledalo.tablitsi) r[klyuch] = zhiviteRedove(t).length;
  return r;
}

const iznesi: Komanda<TovarIznesi> = {
  klyuch: 'kniga.iznesi',
  ime: 'Запази книгата',
  opisanie:
    'Записва разписката за изнесена Книга: отпечатък на Модела, курсор и живи редове по таблица.',
  prozortsi: ['imoti', 'nastroyki'],
  stepen: 'pishe',
  myasto: 'sluzhebna',
  proizvezhda: [TIP.knigaIznesena],
  shema: strogObekt({
    otpechatak: { type: 'string', minLength: 1 },
    kursor: strogObekt({
      naematel: { type: 'string', minLength: 1 },
      seq: { type: 'integer', minimum: 0 },
      hash: { type: 'string' },
    }),
    redove: { type: 'object', description: 'живи редове по ключ на таблица' },
    iznesenoNa: { type: 'string', minLength: 10 },
  }),
  predusloviya: [
    {
      ime: 'отпечатъкът е на текущия Модел',
      proveri: (v, k) =>
        v.otpechatak === otpechatakNaModela(k.model)
          ? null
          : 'Книгата е правена с друг Модел — свали я отново.',
    },
    {
      ime: 'курсорът е текущият',
      proveri: (v, k) => {
        const sega = kursorNa(k);
        return v.kursor.naematel === sega.naematel &&
          v.kursor.seq === sega.seq &&
          v.kursor.hash === sega.hash
          ? null
          : `Книгата е изнесена от друго състояние (seq ${v.kursor.seq}, сега ${sega.seq}) — свали я отново.`;
      },
    },
    {
      ime: 'редовете са колкото живите',
      proveri: (v, k) => {
        const zhivi = zhiviRedovePoTablitsa(k);
        const razminati = Object.entries(zhivi).filter(([t, broy]) => v.redove[t] !== broy);
        return razminati.length === 0
          ? null
          : `Редовете не съвпадат с живите: ${razminati.map(([t, broy]) => `${t} ${v.redove[t] ?? '—'} ≠ ${broy}`).join(', ')}.`;
      },
    },
  ],
  dryRun: (v, k) => {
    const obshto = Object.values(v.redove).reduce((a, b) => a + b, 0);
    return predvaritelno(
      k,
      'kniga.iznesi',
      [
        {
          type: TIP.knigaIznesena,
          sashtnost: sashtnost('kniga', k.komandaId),
          payload: {
            otpechatak: v.otpechatak,
            kursor: v.kursor,
            redove: v.redove,
            iznesenoNa: v.iznesenoNa,
          },
          expectedRev: 0,
        },
      ],
      [razlika('Книга', '', `изнесена · ${obshto} реда · seq ${v.kursor.seq}`)],
      `Книгата е изнесена с ${obshto} живи реда при seq ${v.kursor.seq}.`,
    );
  },
};

export const knigaIznesi = Object.freeze(iznesi);
