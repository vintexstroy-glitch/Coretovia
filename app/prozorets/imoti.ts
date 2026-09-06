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
import { otvoriChernova, zakachiButonite } from '../reshetka/chernova.js';
import { chetiEkranno, zapomniEkranno } from '../reshetka/pamet-ekran.js';
import { reshetkaHTML, zakachiReshetkata } from '../reshetka/reshetka.js';
import { h, sloji } from '../reshetka/shablon.js';
import { butoniteHTML, iznosVestHTML } from './deystviya.js';
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

  sloji(
    k.tyalo,
    h`
    <div class="deystviya" data-deystviya>
      ${butoniteHTML(butoni)}
      <button type="button" class="vtorichen" data-zapazi-kniga>Запази книгата</button>
      <label class="otmetka"><input type="checkbox" data-pokazhi-izklyuchenite ${pokazhi ? 'checked' : ''}> покажи изключените</label>
    </div>
    <p class="greshka" data-greshka></p>
    ${tablitsi.map(
      (t, i) =>
        h`<section class="tablitsa-blok" data-blok="${t.klyuch}">
            ${dumiteHTML(blokove[i] ?? [])}
            <h2 class="lenta" translate="no">${t.ime}</h2>
            ${reshetkaHTML(o, t.klyuch, pokazhi)}
          </section>`,
    )}
    ${iznosVestHTML()}`,
  );

  zakachiReshetkata(k);

  zakachiButonite(k, 'imoti', TABLITSA_NA_BUTONA);
  k.tyalo
    .querySelector<HTMLInputElement>('[data-pokazhi-izklyuchenite]')
    ?.addEventListener('change', (e) => {
      zapomniEkranno(PAMET_IZKLYUCHENITE, (e.target as HTMLInputElement).checked);
      k.prerisuvay();
    });
}
