/**
 * СТРОЕЖЪТ НА ОГЛЕДАЛОТО · изменяемото състояние, върху което четците пишат.
 *
 * Отделен файл, за да няма кръг: четците (`chettsi.ts`) го внасят, `fold`
 * (`ogledalo.ts`) внася и двете. Живее само докато трае сгъването; навън
 * излиза замразеното `Ogledalo`.
 */

import type { Model } from '../model/model.js';
import { otBazovite, type ZhivaNomenklatura } from '../model/nomenklatura.js';
import type { PayloadKnigaIznesena, PayloadKnigaVnesena } from '../sabitiya/tovari.js';
import { StroitelNaTablitsa } from './tablitsa.js';

export class StroezhNaOgledaloto {
  readonly model: Model;
  /** ПЪРВИЯТ печели · Вратата не пуска втори, но четенето не разчита на това */
  stopanin = '';
  readonly tablitsi = new Map<string, StroitelNaTablitsa>();
  readonly nomenklaturi = new Map<string, ZhivaNomenklatura>();
  readonly knigi: PayloadKnigaIznesena[] = [];
  readonly vnasyaniya: PayloadKnigaVnesena[] = [];

  constructor(model: Model) {
    this.model = model;
    for (const t of model.tablitsi.values()) this.tablitsi.set(t.klyuch, new StroitelNaTablitsa(t));
    for (const n of model.nomenklaturi.values()) this.nomenklaturi.set(n.klyuch, otBazovite(n));
  }

  tablitsa(klyuch: string): StroitelNaTablitsa {
    const t = this.tablitsi.get(klyuch);
    if (t === undefined)
      throw new Error(`Няма таблица „${klyuch}" — проверката преди Огледалото е пропусната.`);
    return t;
  }

  nomenklatura(klyuch: string): ZhivaNomenklatura {
    const n = this.nomenklaturi.get(klyuch);
    if (n === undefined)
      throw new Error(`Няма номенклатура „${klyuch}" — проверката преди Огледалото е пропусната.`);
    return n;
  }
}
