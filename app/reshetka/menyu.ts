/**
 * ДЯСНОТО МЕНЮ · пунктовете идват от каталога (`porta.butoniZa`), с
 * предусловията, сметнати върху избрания ред: неразрешеният пункт стои,
 * но е недостъпен и КАЗВА защо (правило 12).
 *
 * Двата слушателя на `document` (Escape · клик отвън) се пазят поименно и се
 * свалят при затваряне — новият възел на тялото не ги носи, а `once` би паднал
 * на първия произволен клавиш.
 */

import { ekraniraj } from './obshto.js';

export interface Tochka {
  readonly klyuch: string;
  readonly ime: string;
  readonly razreshena: boolean;
  readonly zashto: string;
  readonly deystvie: () => void;
}

let priKlavish: ((e: KeyboardEvent) => void) | null = null;
let priKlik: (() => void) | null = null;

export function zatvoriMenyuto(): void {
  document.querySelector('[data-menyu]')?.remove();
  if (priKlavish) document.removeEventListener('keydown', priKlavish);
  if (priKlik) document.removeEventListener('click', priKlik);
  priKlavish = null;
  priKlik = null;
}

export function pokazhiMenyu(x: number, y: number, tochki: readonly Tochka[]): void {
  zatvoriMenyuto();
  const ul = document.createElement('ul');
  ul.className = 'kontekstno-menyu';
  ul.dataset['menyu'] = '';
  ul.style.left = `${x}px`;
  ul.style.top = `${y}px`;
  ul.innerHTML = tochki
    .map(
      (t) =>
        `<li><button type="button" data-tochka="${t.klyuch}" ${t.razreshena ? '' : 'disabled'} title="${ekraniraj(t.zashto)}">${ekraniraj(t.ime)}${
          t.razreshena ? '' : ` <span class="zashto">${ekraniraj(t.zashto)}</span>`
        }</button></li>`,
    )
    .join('');
  for (const t of tochki) {
    ul.querySelector<HTMLButtonElement>(`[data-tochka="${t.klyuch}"]`)?.addEventListener(
      'click',
      () => {
        zatvoriMenyuto();
        t.deystvie();
      },
    );
  }
  priKlavish = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') zatvoriMenyuto();
  };
  priKlik = (): void => zatvoriMenyuto();
  document.addEventListener('keydown', priKlavish);
  // клик отвън затваря · закача се след текущото събитие, за да не затвори от собствения си клик
  const klik = priKlik;
  setTimeout(() => {
    if (priKlik === klik) document.addEventListener('click', klik);
  }, 0);
  document.body.append(ul);
  ul.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
}
