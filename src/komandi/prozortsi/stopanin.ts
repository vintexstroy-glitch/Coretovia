/**
 * ОТКРИВАНЕТО · Стопанинът е първото събитие в Журнала (ADR-043, пренесен).
 *
 * Единствената команда, която минава без Стопанин — и минава веднъж.
 * Вратата отказва всичко преди нея и втора такава след нея; командата го
 * казва с думи, преди Вратата да е питана.
 */

import { sashtnost } from '../../model/klyuchove.js';
import { strogObekt } from '../../model/shema.js';
import { TIP } from '../../sabitiya/registar.js';
import { type Komanda, predvaritelno, razlika } from '../komanda.js';

interface TovarOtkriy {
  readonly imeyl: string;
}

const otkriy: Komanda<TovarOtkriy> = {
  klyuch: 'stopanin.otkriy',
  ime: 'Открий Книгата',
  opisanie: 'Записва имейла на Стопанина като първото събитие на Книгата. Веднъж.',
  prozortsi: ['profil'],
  stepen: 'pishe',
  myasto: 'buton',
  bezStopanin: true,
  proizvezhda: [TIP.stopaninZapisan],
  shema: strogObekt({
    imeyl: {
      type: 'string',
      minLength: 5,
      maxLength: 200,
      pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
    },
  }),
  predusloviya: [
    {
      ime: 'Книгата още не е открита',
      proveri: (_v, k) =>
        k.ogledalo.stopanin === '' ? null : `Книгата вече е открита от ${k.ogledalo.stopanin}.`,
    },
    {
      ime: 'открива я този, който я отваря',
      proveri: (v, k) =>
        v.imeyl.trim().toLowerCase() === k.aktor.trim().toLowerCase()
          ? null
          : `Книгата се открива с имейла на този, който я отваря (${k.aktor}), не с ${v.imeyl}.`,
    },
  ],
  dryRun: (v, k) =>
    predvaritelno(
      k,
      'stopanin.otkriy',
      [
        {
          type: TIP.stopaninZapisan,
          sashtnost: sashtnost('stopanin', k.veriga),
          payload: { imeyl: v.imeyl.trim() },
          expectedRev: 0,
        },
      ],
      [razlika('Стопанин', '', v.imeyl.trim())],
      `Книгата се открива от ${v.imeyl.trim()}.`,
    ),
};

export const stopaninOtkriy = Object.freeze(otkriy);
