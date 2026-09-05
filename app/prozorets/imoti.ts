/**
 * ИМОТИ · ОБЕКТИ · БИЗНЕСИ · прозорецът на листа „ИмотиОбектиБизнеси".
 *
 * Трите му бутона идват от каталога (`porta.butoniZa`), трите таблици — от
 * Модела, редовете — от Огледалото. Редакция в клетката, чернова за нов ред,
 * дясно меню върху ред с предусловията, и „Запази книгата" (общото в
 * `deystviya.ts`).
 */

import { blokoveNaDumite } from '../../src/model/dumite.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { otvoriChernova } from '../reshetka/chernova.js';
import { ekraniraj } from '../reshetka/obshto.js';
import { chetiEkranno, zapomniEkranno } from '../reshetka/pamet-ekran.js';
import { reshetkaHTML, zakachiReshetkata } from '../reshetka/reshetka.js';
import {
  butoniteHTML,
  iznosVestHTML,
  izpalniOtMenyuto,
  zakachiDyasnoMenyu,
  zapaziKnigata,
} from './deystviya.js';
import { dumiteHTML } from './profil.js';

/** Кой бутон коя таблица отваря · трите му бутона, поименно. */
const TABLITSA_NA_BUTONA: Readonly<Record<string, string>> = Object.freeze({
  'imoti.sazdayImot': 'imoti',
  'imoti.dobaviObekt': 'obekti',
  'imoti.dobaviBiznes': 'biznesi',
});

const PAMET_IZKLYUCHENITE = 'imoti.pokazhiIzklyuchenite';

export function narisuvayImoti(k: KonteksNaEkrana): void {
  const o = k.porta.ogledalo();
  const pokazhi = chetiEkranno(PAMET_IZKLYUCHENITE, false);
  const butoni = k.porta.butoniZa('imoti').filter((b) => b.myasto === 'buton');
  const tablitsi = [...o.model.tablitsi.values()].filter((t) => t.prozorets === 'imoti');
  const blokove = blokoveNaDumite('imoti');

  k.tyalo.innerHTML = `
    <div class="deystviya" data-deystviya>
      ${butoniteHTML(butoni)}
      <button type="button" class="vtorichen" data-zapazi-kniga>Запази книгата</button>
      <label class="otmetka"><input type="checkbox" data-pokazhi-izklyuchenite ${pokazhi ? 'checked' : ''}> покажи изключените</label>
    </div>
    <p class="greshka" data-greshka></p>
    ${tablitsi
      .map(
        (t, i) =>
          `<section class="tablitsa-blok" data-blok="${t.klyuch}">
            ${dumiteHTML(blokove[i] ?? [])}
            <h2 class="lenta" translate="no">${ekraniraj(t.ime)}</h2>
            ${reshetkaHTML(o, t.klyuch, pokazhi)}
          </section>`,
      )
      .join('')}
    ${iznosVestHTML()}`;

  zakachiReshetkata(k);

  for (const b of k.tyalo.querySelectorAll<HTMLButtonElement>('[data-buton]')) {
    b.addEventListener('click', () => {
      const klyuch = b.dataset['buton'] ?? '';
      const tablitsa = TABLITSA_NA_BUTONA[klyuch];
      if (tablitsa !== undefined) otvoriChernova(k.tyalo, k, tablitsa, klyuch);
    });
  }
  k.tyalo
    .querySelector<HTMLInputElement>('[data-pokazhi-izklyuchenite]')
    ?.addEventListener('change', (e) => {
      zapomniEkranno(PAMET_IZKLYUCHENITE, (e.target as HTMLInputElement).checked);
      k.prerisuvay();
    });
  k.tyalo.querySelector<HTMLButtonElement>('[data-zapazi-kniga]')?.addEventListener('click', () => {
    void zapaziKnigata(k);
  });
  zakachiDyasnoMenyu(k, 'imoti', (b) => void izpalniOtMenyuto(k, b.klyuch, b.tovar));
}
