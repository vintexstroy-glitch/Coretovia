/**
 * ДДС · ред към Приход или Разход по ЗНАКА · с натрупване по месеци (ADR-007).
 *
 * Негово (05.09 т.2): „Върни ДДС като ред Към Приход или разход с натрупване
 * всеки месец и зависимост за внасяне или за плащане към нас е знака на ддс. И
 * Сверка и възможност да декларираш колко си платил и колко остава да се внася
 * или да ти плащат и в зависимост от знака всеки месец се записва в Сметки и в
 * Уравнение."
 *
 * ДЪЛЖИМОТО се СМЯТА: начислен − данъчен кредит. Положително значи за ВНАСЯНЕ
 * (разход, знакът е −); отрицателно значи за ВЪЗСТАНОВЯВАНЕ (приход, знакът е +).
 * Така редът на ДДС влиза в Сметки по същия закон като всяко друго движение
 * (правило 20), но НЕ е движение: истината е една — редът на месеца в `dds`.
 *
 * Остатъкът е дължимо − платено; декларираното е негово число (какво е подадено)
 * и се сверява с дължимото. Всяка сверка се записва и когато е нула (правило 7).
 */

import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { kletkaNa, zhiviteRedove } from '../ogledalo/tablitsa.js';
import { sverka, type Sverka } from '../yadro/sverka.js';
import type { Strana } from './smetki.js';

const TABLITSA = 'dds';

export interface MesetsNaDdsa {
  readonly mesets: string;
  readonly i: number;
  readonly id: string;
  /** ДДС по продажбите · излизащ */
  readonly nachislen: number;
  /** данъчен кредит · входящ ДДС */
  readonly kredit: number;
  /** начислен − кредит · + за внасяне, − за възстановяване */
  readonly dalzhimo: number;
  readonly deklarirano: number;
  readonly plateno: number;
  /** дължимо − платено · колко остава да се внесе (или да ти платят) */
  readonly ostatak: number;
  /** страната в Сметки · за внасяне е РАЗХОД, за възстановяване е ПРИХОД */
  readonly strana: Strana | null;
  /** сумата, с която редът влиза в Сметки · разходът е отрицателен (правило 20) */
  readonly suma: number;
  /** числата от счетоводството · идват с МЕСЕЦ назад (негово, 05.09 т.3) */
  readonly izdadeni: number;
  readonly plateni: number;
  readonly sverki: readonly Sverka[];
}

export interface Ddsat {
  readonly mesetsi: readonly MesetsNaDdsa[];
  /** натрупването: сборът на дължимото · на платеното · и остатъкът */
  readonly dalzhimo: number;
  readonly plateno: number;
  readonly ostatak: number;
  readonly sverka: Sverka;
}

function tsentove(o: Ogledalo, i: number, kolona: string): number {
  const tv = o.tablitsi.get(TABLITSA);
  const k = tv === undefined ? null : kletkaNa(tv, i, kolona);
  return k !== null && 'stoynost_st' in k ? k.stoynost_st : 0;
}

function tekst(o: Ogledalo, i: number, kolona: string): string {
  const tv = o.tablitsi.get(TABLITSA);
  const k = tv === undefined ? null : kletkaNa(tv, i, kolona);
  return k !== null && 'tekst' in k ? k.tekst : '';
}

/** Страната по знака на ДЪЛЖИМОТО · за внасяне е разход, за възстановяване — приход. */
export function stranaNaDdsa(dalzhimo: number): Strana | null {
  if (dalzhimo > 0) return 'razhod';
  if (dalzhimo < 0) return 'prihod';
  return null;
}

/** ДДС по месеци · в реда на месеците · с натрупването и сверките. */
export function ddsat(o: Ogledalo, kogato: string): Ddsat {
  const tv = o.tablitsi.get(TABLITSA);
  const mesetsi: MesetsNaDdsa[] = [];
  if (tv !== undefined) {
    for (const i of zhiviteRedove(tv)) {
      const mesets = tekst(o, i, 'mesets');
      const nachislen = tsentove(o, i, 'nachislen');
      const kredit = tsentove(o, i, 'kredit');
      const deklarirano = tsentove(o, i, 'deklarirano');
      const plateno = tsentove(o, i, 'plateno');
      const dalzhimo = nachislen - kredit;
      const strana = stranaNaDdsa(dalzhimo);
      mesetsi.push({
        mesets,
        i,
        id: tv.id[i] ?? '',
        nachislen,
        kredit,
        dalzhimo,
        deklarirano,
        plateno,
        ostatak: dalzhimo - plateno,
        strana,
        // разходът влиза с минус, приходът с плюс · знакът е законът (правило 20)
        suma: -dalzhimo,
        izdadeni: tsentove(o, i, 'izdadeni'),
        plateni: tsentove(o, i, 'plateni'),
        sverki: [
          sverka(`ДДС ${mesets} · дължимо ↔ декларирано`, dalzhimo, deklarirano, kogato),
          sverka(`ДДС ${mesets} · декларирано ↔ платено`, deklarirano, plateno, kogato),
        ],
      });
    }
  }
  mesetsi.sort((a, b) => (a.mesets < b.mesets ? -1 : a.mesets > b.mesets ? 1 : 0));
  const dalzhimo = mesetsi.reduce((s, m) => s + m.dalzhimo, 0);
  const plateno = mesetsi.reduce((s, m) => s + m.plateno, 0);
  return {
    mesetsi,
    dalzhimo,
    plateno,
    ostatak: dalzhimo - plateno,
    sverka: sverka(
      'ДДС · натрупване · дължимо − платено = остатък',
      dalzhimo - plateno,
      mesetsi.reduce((s, m) => s + m.ostatak, 0),
      kogato,
    ),
  };
}
