/**
 * КОНТЕКСТЪТ НА ЕКРАНА · какво получава всеки прозорец от композиционния корен.
 *
 * Портата (и само тя — K2), тялото, в което рисува, кой пише, и три неща, които
 * само коренът може да даде, защото само той държи носителя: думите за
 * хранилището, проверката на веригата, и препотвърждаването на екрана.
 */

import type { Porta } from '../src/porta/porta.js';

export interface KonteksNaEkrana {
  readonly porta: Porta;
  readonly tyalo: HTMLElement;
  /** веригата, в която се пише · ключът на Книгата */
  readonly veriga: string;
  aktor(): string;
  /** научава се при откриването · запомня се на устройството */
  zadayAktor(imeyl: string): void;
  /** думите за хранилището и крана · четат се при всяко рисуване, кранът се мени */
  hranilishte(): string;
  proveriVerigata(): Promise<string>;
  /** SHA-256 на качен файл · за отпечатъка на внесената Книга · само коренът държи хеша */
  otpechatakNaBaytove(baytove: ArrayBuffer): Promise<string>;
  /** рисува текущия прозорец наново от живото Огледало */
  prerisuvay(): void;
}
