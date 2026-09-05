/**
 * ВНАСЯНЕТО · предложенията на Сверчика през Портата · без DOM (ADR-004 · K2).
 *
 * Двете стъпки, които екранът вика: ПРОБВАНЕ на независимите предложения преди
 * отчета (отказът се казва, преди човекът да отметне — правило 12) и ИЗПЪЛНЕНИЕ
 * на отметнатите, едно по едно, по ред, със спиране при първия отказ. Преводът
 * предложение → команда е на каталога (`komandaZaPredlozhenie`): тук няма нито
 * един ключ на команда.
 *
 * Ключът на действието на всяко предложение го дава ВИКАЩИЯТ (`idNa`): ражда се
 * при „Приеми" и се преизползва до успех (правило 5: ключът носи ДЕЙСТВИЕТО, не
 * съдържанието — ключ от файла би отказал остатъка след частично приемане и би
 * върнал стар резултат при „върни и зареди пак"). Второ натискане със същите
 * ключове дава „повторено", нула нови звена.
 *
 * Сверката (правило 7): избрани = приети + повторени + отказани + пропуснати +
 * неопитани; и нулата се записва.
 */

import { eOtkaz, komandaZaPredlozhenie } from '../komandi/izpalnenie.js';
import { poTekst } from '../model/nomenklatura.js';
import type { IdNaPredlozhenie, Predlozhenie } from '../model/predlozhenie.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { MERKA, type Sverka, sverka } from '../yadro/sverka.js';
import type { Porta, PortaZaChetene } from './porta.js';

export interface ProbaNaPredlozhenie {
  /** пробвано е · зависимите от друго предложение не се пробват (редът им още го няма) */
  readonly probvano: boolean;
  /** думите на отказа · `null` = минава или не е пробвано */
  readonly otkaz: readonly string[] | null;
}

/** Пробва независимите предложения върху живото Огледало · нищо не пише. */
export function probvayPredlozheniyata(
  porta: PortaZaChetene,
  predlozheniya: readonly Predlozhenie[],
  idNa: IdNaPredlozhenie,
): readonly ProbaNaPredlozhenie[] {
  return predlozheniya.map((p, i) => {
    if (p.zavisiOt.length > 0) return { probvano: false, otkaz: null };
    const k = komandaZaPredlozhenie(p, idNa);
    if (k === null) return { probvano: true, otkaz: [`Няма команда за предложение „${p.vid}".`] };
    const r = porta.probvay(idNa(i), k.klyuch, k.tovar);
    return { probvano: true, otkaz: eOtkaz(r) ? r.zashto : null };
  });
}

export type SastoyanieNaPredlozhenie = 'priet' | 'povtoren' | 'otkazan' | 'propusnat' | 'neopitan';

export interface RezultatOtVnasyane {
  readonly izbrani: number;
  readonly prieti: number;
  readonly povtoreni: number;
  /** индексът и думите на първия отказ · `null`, ако всичко е минало */
  readonly otkaz: { readonly indeks: number; readonly zashto: readonly string[] } | null;
  /** отметнати, но пропуснати, защото зависят от неотметнато или неминало */
  readonly propusnati: readonly number[];
  /** отметнати след спирането · не са опитвани */
  readonly neopitani: readonly number[];
  readonly sastoyaniya: ReadonlyMap<number, SastoyanieNaPredlozhenie>;
  readonly sverka: Sverka;
}

/**
 * Новата стойност, от която зависи ред, стои ли на предвидения номер? Номерът се
 * ПРЕДВИЖДА при сверката, а се раздава при записа; разминаване значи, че редът би
 * сочел ДРУГА дума — отказ с думи, не тиха подмяна.
 */
function razminalNomer(o: Ogledalo, q: Predlozhenie): string | null {
  if (q.vid !== 'nova-stoynost') return null;
  const n = o.nomenklaturi.get(q.nomenklatura);
  const s = n === undefined ? undefined : poTekst(n, q.tekst);
  const naMyasto =
    n !== undefined &&
    s !== undefined &&
    s.nomer === q.nomer &&
    (n.podredbaPo === undefined || s.belezi[n.podredbaPo] === q.belezi[n.podredbaPo]);
  return naMyasto
    ? null
    : `„${q.tekst}" не е № ${q.nomer} в „${n?.ime ?? q.nomenklatura}" — номерът се е разминал; прочети Книгата пак.`;
}

/** Изпълнява отметнатите предложения по ред · спира при първия отказ · и нулата е резултат. */
export async function izpalniPredlozheniyata(
  porta: Porta,
  predlozheniya: readonly Predlozhenie[],
  otmetnati: ReadonlySet<number>,
  idNa: IdNaPredlozhenie,
  kogato: string,
): Promise<RezultatOtVnasyane> {
  let prieti = 0;
  let povtoreni = 0;
  const propusnati: number[] = [];
  const neopitani: number[] = [];
  const sastoyaniya = new Map<number, SastoyanieNaPredlozhenie>();
  const minali = new Set<number>();
  let otkaz: RezultatOtVnasyane['otkaz'] = null;
  const chakashti = [...otmetnati]
    .filter((i) => predlozheniya[i] !== undefined)
    .sort((a, b) => a - b);
  // по ред, но зависимото чака зависимостта си, дори тя да е по-надолу в списъка
  // (изключването на родител чака децата) · обиколки, докато има напредък
  let napredva = true;
  while (napredva && otkaz === null) {
    napredva = false;
    for (const i of chakashti) {
      if (sastoyaniya.has(i)) continue;
      const p = predlozheniya[i]!;
      if (p.zavisiOt.some((z) => !minali.has(z))) continue;
      napredva = true;
      const razminal = p.zavisiOt
        .map((z) =>
          predlozheniya[z] === undefined
            ? null
            : razminalNomer(porta.ogledalo(), predlozheniya[z]!),
        )
        .find((d) => d !== null);
      const k = razminal === undefined || razminal === null ? komandaZaPredlozhenie(p, idNa) : null;
      const r =
        razminal !== undefined && razminal !== null
          ? { otkaz: true as const, zashto: [razminal] }
          : k === null
            ? { otkaz: true as const, zashto: [`Няма команда за предложение „${p.vid}".`] }
            : await porta.izpalni(idNa(i), k.klyuch, k.tovar);
      if ('otkaz' in r) {
        otkaz = { indeks: i, zashto: r.zashto };
        sastoyaniya.set(i, 'otkazan');
        break;
      }
      minali.add(i);
      if (r.povtoreno) {
        povtoreni += 1;
        sastoyaniya.set(i, 'povtoren');
      } else {
        prieti += 1;
        sastoyaniya.set(i, 'priet');
      }
    }
  }
  for (const i of chakashti) {
    if (sastoyaniya.has(i)) continue;
    if (otkaz === null) {
      propusnati.push(i);
      sastoyaniya.set(i, 'propusnat');
    } else {
      neopitani.push(i);
      sastoyaniya.set(i, 'neopitan');
    }
  }
  const izbrani = chakashti.length;
  return {
    izbrani,
    prieti,
    povtoreni,
    otkaz,
    propusnati,
    neopitani,
    sastoyaniya,
    sverka: sverka(
      'внасяне · избрани = приети + повторени + отказани + пропуснати + неопитани',
      izbrani,
      prieti + povtoreni + (otkaz === null ? 0 : 1) + propusnati.length + neopitani.length,
      kogato,
      MERKA.broy,
    ),
  };
}
