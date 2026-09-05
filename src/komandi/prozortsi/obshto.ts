/**
 * СТОРНОТО · поправка = ново събитие, никога триене (правило 1).
 *
 * Сочи звено (верига · seq) и носи причина. Погасява го като маска в
 * Огледалото; живото Огледало се пресгъва. Не се сторнира откриването, не се
 * сторнира сторно (не възкресява нищо), не се сторнира вече погасено.
 */

import { TIP } from '../../sabitiya/registar.js';
import { poIzbor, strogObekt } from '../../model/shema.js';
import { redKato } from '../../ogledalo/tablitsa.js';
import {
  type Izbran,
  type Komanda,
  type Kontekst,
  predvaritelno,
  razlika,
  revNa,
} from '../komanda.js';

interface TovarStorno {
  /** пропусната (null) = веригата, в която се пише */
  readonly veriga: string | null;
  readonly seq: number;
  readonly prichina: string;
}

function verigata(v: TovarStorno, k: Kontekst): string {
  return v.veriga ?? k.veriga;
}

const storno: Komanda<TovarStorno> = {
  klyuch: 'obshto.storno',
  ime: 'Сторно на последната промяна',
  opisanie:
    'Погасява едно записано събитие с причина. Журналът не се пипа; Огледалото се пресгъва.',
  prozortsi: ['imoti', 'nastroyki'],
  stepen: 'pishe',
  myasto: 'desen-buton',
  proizvezhda: [TIP.storno],
  shema: strogObekt({
    veriga: poIzbor({ type: 'string', minLength: 1 }),
    seq: { type: 'integer', minimum: 1 },
    prichina: { type: 'string', minLength: 1, maxLength: 500 },
  }),
  otIzbora: (izbran: Izbran, k: Kontekst) => {
    const t = k.ogledalo.tablitsi.get(izbran.tablitsa);
    const i = t?.indeks.get(izbran.id);
    if (t === undefined || i === undefined) return null;
    const r = redKato(t, i);
    return { veriga: r.veriga, seq: r.seq, prichina: 'сторно от таблицата' };
  },
  predusloviya: [
    {
      ime: 'звеното съществува',
      proveri: (v, k) =>
        k.zveno(verigata(v, k), v.seq) === undefined
          ? `Няма събитие ${verigata(v, k)}#${v.seq}.`
          : null,
    },
    {
      ime: 'не е откриването · не е сторно · не е погасено',
      proveri: (v, k) => {
        const z = k.zveno(verigata(v, k), v.seq);
        if (z === undefined) return null;
        if (z.type === TIP.stopaninZapisan) return 'Откриването на Книгата не се сторнира.';
        if (z.type === TIP.storno)
          return 'Сторно на сторно не връща нищо — запиши наново каквото трябва.';
        const veche = k.ogledalo.pogaseni.find(
          (p) => p.veriga === verigata(v, k) && p.seq === v.seq,
        );
        return veche === undefined
          ? null
          : `Събитие ${v.seq} вече е сторнирано (${veche.storniranOt}).`;
      },
    },
  ],
  dryRun: (v, k) => {
    const veriga = verigata(v, k);
    const z = k.zveno(veriga, v.seq)!;
    const payload = {
      pogasyavaSeq: v.seq,
      ...(veriga === k.veriga ? {} : { pogasyavaVeriga: veriga }),
      prichina: v.prichina.trim(),
    };
    return predvaritelno(
      k,
      'obshto.storno',
      [{ type: TIP.storno, sashtnost: z.sashtnost, payload, expectedRev: revNa(k, z.sashtnost) }],
      [razlika(`${z.type} · ${veriga}#${v.seq}`, 'записано', `сторнирано: ${v.prichina.trim()}`)],
      `Сторно на ${z.type} (${veriga}#${v.seq}): ${v.prichina.trim()}.`,
    );
  },
};

export const obshtoStorno = Object.freeze(storno);
