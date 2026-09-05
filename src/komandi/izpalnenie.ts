/**
 * ПРОБВАНЕТО · чисто, без Врата: схема → предусловия → dryRun → защита.
 *
 * Отказът събира ВСИЧКИ думи наведнъж, не първата: човекът поправя един път.
 * Портата вика оттук и за `probvay`, и преди `izpalni` — изпълнението е
 * повторен `probvay` плюс записът.
 */

import type { IdNaPredlozhenie, Predlozhenie } from '../model/predlozhenie.js';
import { proveriTovar } from '../sabitiya/registar.js';
import { KATALOG, komandaPoKlyuch } from './katalog.js';
import type { Izbran, Kontekst, Myasto, Predvaritelno } from './komanda.js';
import { proveriPoShema } from './shema.js';

export interface Otkaz {
  readonly otkaz: true;
  readonly zashto: readonly string[];
}

export function otkaz(...zashto: readonly string[]): Otkaz {
  return Object.freeze({ otkaz: true, zashto: Object.freeze([...zashto]) });
}

export function eOtkaz(x: unknown): x is Otkaz {
  return typeof x === 'object' && x !== null && (x as Otkaz).otkaz === true;
}

const NE_E_OTKRITA = 'Книгата не е открита — първо Стопанинът.';

export function probvay(klyuch: string, tovar: unknown, k: Kontekst): Predvaritelno | Otkaz {
  const komanda = komandaPoKlyuch(klyuch);
  if (komanda === undefined) return otkaz(`Няма команда „${klyuch}".`);
  if (!komanda.bezStopanin && k.ogledalo.stopanin === '') return otkaz(NE_E_OTKRITA);
  const poShema = proveriPoShema(komanda.shema, tovar);
  if (poShema.length > 0) return otkaz(...poShema);
  const dumi = komanda.predusloviya
    .map((p) => p.proveri(tovar, k))
    .filter((x): x is string => x !== null);
  if (dumi.length > 0) return otkaz(...dumi);
  const pred = komanda.dryRun(tovar, k);
  for (const op of pred.operatsii) {
    const n = proveriTovar(op.type, op.payload, k.model);
    if (n.length > 0) return otkaz(`Командата „${klyuch}" роди невалидна операция: ${n.join(' ')}`);
  }
  return pred;
}

/** Бутон или пункт от дясното меню · с предусловията, сметнати върху избрания ред. */
export interface Buton {
  readonly klyuch: string;
  readonly ime: string;
  readonly myasto: Myasto;
  /** отваря чернова с товара, вместо да изпълни */
  readonly otvaryaChernova: boolean;
  readonly razreshena: boolean;
  /** думите, когато не е разрешена · празно иначе (правило 12: отказът се казва) */
  readonly zashto: string;
  /** товарът от избора · за десните бутони · `null` за бутоните, които отварят чернова */
  readonly tovar: unknown;
}

export function butoniZa(
  prozorets: string,
  izbran: Izbran | undefined,
  k: Kontekst,
): readonly Buton[] {
  const butoni: Buton[] = [];
  for (const komanda of KATALOG) {
    if (!komanda.prozortsi.includes(prozorets as never)) continue;
    if (komanda.myasto !== 'buton' && komanda.myasto !== 'desen-buton') continue;
    const otkrita = k.ogledalo.stopanin !== '';
    if (komanda.otIzbora !== undefined) {
      if (izbran === undefined) continue;
      const tovar = komanda.otIzbora(izbran, k);
      if (tovar === null) continue;
      // черновата се проверява при записа, не при отварянето: празните ѝ клетки не са отказ
      const dumi = otkrita
        ? komanda.otvaryaChernova === true
          ? []
          : komanda.predusloviya
              .map((p) => p.proveri(tovar, k))
              .filter((x): x is string => x !== null)
        : [NE_E_OTKRITA];
      butoni.push({
        klyuch: komanda.klyuch,
        ime: komanda.ime,
        myasto: komanda.myasto,
        otvaryaChernova: komanda.otvaryaChernova === true,
        razreshena: dumi.length === 0,
        zashto: dumi.join(' '),
        tovar,
      });
      continue;
    }
    const razreshena = komanda.bezStopanin === true ? !otkrita : otkrita;
    const zashto = razreshena
      ? ''
      : komanda.bezStopanin === true
        ? `Книгата вече е открита от ${k.ogledalo.stopanin}.`
        : NE_E_OTKRITA;
    butoni.push({
      klyuch: komanda.klyuch,
      ime: komanda.ime,
      myasto: komanda.myasto,
      otvaryaChernova: false,
      razreshena,
      zashto,
      tovar: null,
    });
  }
  return butoni;
}

/**
 * Командата за предложение на Сверчика · пита каталога, не знае ключове.
 * Точно една команда казва „мое е"; нито една → `null` (тестът пази, че за
 * всеки вид има една).
 */
export function komandaZaPredlozhenie(
  p: Predlozhenie,
  idNa: IdNaPredlozhenie,
): { readonly klyuch: string; readonly tovar: unknown } | null {
  for (const komanda of KATALOG) {
    if (komanda.otPredlozhenie === undefined) continue;
    const tovar = komanda.otPredlozhenie(p, idNa);
    if (tovar !== null) return { klyuch: komanda.klyuch, tovar };
  }
  return null;
}
