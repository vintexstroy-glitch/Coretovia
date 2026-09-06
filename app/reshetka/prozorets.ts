/**
 * ИЗСКАЧАЩИЯТ ПРОЗОРЕЦ · един дом за механиката (правило 14) · пренесен от MasterBook.
 *
 * Фон, карта, `Escape`, натискане отстрани, бутон „Затвори" — и фокусът СЕ
 * ВРЪЩА на онова, което го е отворило: прозорец, който изхвърля фокуса в
 * началото на документа, кара човека с клавиатура да извърви целия екран наново.
 */

import { h, sloji, type Zapechatan } from './shablon.js';

interface Prozorets {
  /** заглавието вътре · и достъпното име на прозореца */
  readonly zaglavie: string;
  /** ред под заглавието · празен, ако няма какво да се каже */
  readonly pod?: string;
  /** ЗАПЕЧАТАНА разметка · строи се с `h`, тъй че екранирането не се забравя */
  readonly tyalo: Zapechatan;
}

/**
 * Отваря прозорец и връща затварящата го функция.
 *
 * Връща я, вместо да я крие: викащ, който отваря прозорец в отговор на
 * действие, понякога трябва да го затвори сам (записът мина, темата се смени).
 * Без това той нямаше друг път освен да търси възела в документа.
 */
export function otvoriProzorets(p: Prozorets): () => void {
  // ФОКУСЪТ СЕ ЗАПОМНЯ ПРЕДИ да се вземе — иначе няма къде да се върне.
  const otkade = document.activeElement as HTMLElement | null;

  const fon = document.createElement('div');
  fon.className = 'istoriya-fon';
  sloji(
    fon,
    h`
    <div class="istoriya-karta" role="dialog" aria-modal="true" aria-label="${p.zaglavie}">
      <h3>${p.zaglavie}</h3>
      ${p.pod ? h`<p class="pod">${p.pod}</p>` : ''}
      ${p.tyalo}
      <button type="button" class="vtorichen istoriya-zatvori">Затвори</button>
    </div>`,
  );

  const zatvori = (): void => {
    fon.remove();
    document.removeEventListener('keydown', priKlavish);
    otkade?.focus?.();
  };
  const priKlavish = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') zatvori();
  };

  // Натискане ВЪРХУ ФОНА затваря; натискане в картата — не. Затова се сверява
  // самата цел, а не се разчита на изкачването на събитието.
  fon.addEventListener('click', (e) => {
    if (e.target === fon) zatvori();
  });
  fon.querySelector('.istoriya-zatvori')!.addEventListener('click', zatvori);
  document.addEventListener('keydown', priKlavish);
  document.body.append(fon);

  // Фокусът влиза В прозореца, за да е следващият Tab вътре в него.
  fon.querySelector<HTMLButtonElement>('.istoriya-zatvori')!.focus();
  return zatvori;
}
