/**
 * ПОДТАБОВЕТЕ на един прозорец · екранни, с памет, нула събития.
 *
 * Негово (05.09 т.2): „В таба НАП се намира ДДС…" — „таб" при него е и ПОДТАБ,
 * както Главни Настройки има подтаб Номенклатури. Осемте прозореца си остават
 * осем (K1): подтабът е изглед на един и същи лист, не девети прозорец.
 */

import { ekraniraj } from './obshto.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';

export interface Podtab {
  readonly klyuch: string;
  readonly ime: string;
}

/** Кой подтаб е отворен · помни се на устройството, не в Журнала. */
export function tekushtPodtab(pamet: string, tabove: readonly Podtab[]): string {
  const zapomnen = chetiEkranno<string>(pamet, tabove[0]?.klyuch ?? '');
  return tabove.some((t) => t.klyuch === zapomnen) ? zapomnen : (tabove[0]?.klyuch ?? '');
}

export function podtaboveHTML(tabove: readonly Podtab[], tekusht: string): string {
  return `<nav class="podtabove" data-podtabove>${tabove
    .map(
      (t) =>
        `<button type="button" class="podtab${t.klyuch === tekusht ? ' tekusht' : ''}" data-podtab="${t.klyuch}">${ekraniraj(t.ime)}</button>`,
    )
    .join('')}</nav>`;
}

/** Закача превключването · след всяко рисуване, както всичко останало на екрана. */
export function zakachiPodtabove(koren: HTMLElement, pamet: string, prerisuvay: () => void): void {
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-podtab]')) {
    b.addEventListener('click', () => {
      zapomniEkranno(pamet, b.dataset['podtab'] ?? '');
      prerisuvay();
    });
  }
}
