/**
 * ИМОТИ · ОБЕКТИ · БИЗНЕСИ · прозорецът на листа „ИмотиОбектиБизнеси".
 *
 * Трите му бутона идват от каталога (`porta.butoniZa`), трите таблици — от
 * Модела, редовете — от Огледалото. Редакция в клетката, чернова за нов ред,
 * дясно меню върху ред с предусловията, и „Запази книгата": Огледало → лист →
 * файл → ЧАК тогава разписката през Портата (решение 11).
 */

import { blokoveNaDumite } from '../../src/model/dumite.js';
import { MODEL } from '../../src/model/osnova.js';
import { otpechatakNaModela } from '../../src/model/otpechatak.js';
import { dumiZaGreshka } from '../../src/yadro/dumi.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { otvoriChernova } from '../reshetka/chernova.js';
import { pokazhiMenyu } from '../reshetka/menyu.js';
import { ekraniraj, svaliFayl } from '../reshetka/obshto.js';
import { chetiEkranno, zapomniEkranno } from '../reshetka/pamet-ekran.js';
import { otvoriProzorets } from '../reshetka/prozorets.js';
import { fokusiraySled, pokazhiGreshka, zakachiRedaktsiya } from '../reshetka/redaktsiya.js';
import { reshetkaHTML } from '../reshetka/reshetka.js';
import { zakachiZebrata } from '../reshetka/zebra.js';
import { dumiteHTML } from './profil.js';

/** Кой бутон коя таблица отваря · трите му бутона, поименно. */
const TABLITSA_NA_BUTONA: Readonly<Record<string, string>> = Object.freeze({
  'imoti.sazdayImot': 'imoti',
  'imoti.dobaviObekt': 'obekti',
  'imoti.dobaviBiznes': 'biznesi',
});

const PAMET_IZKLYUCHENITE = 'imoti.pokazhiIzklyuchenite';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
/** думите за последния износ · живеят извън тялото, защото всеки запис го прерисува */
let iznosVest = '';

export function narisuvayImoti(k: KonteksNaEkrana): void {
  const o = k.porta.ogledalo();
  const pokazhi = chetiEkranno(PAMET_IZKLYUCHENITE, false);
  const butoni = k.porta.butoniZa('imoti').filter((b) => b.myasto === 'buton');
  const tablitsi = [...o.model.tablitsi.values()].filter((t) => t.prozorets === 'imoti');
  const blokove = blokoveNaDumite('imoti');

  k.tyalo.innerHTML = `
    <div class="deystviya" data-deystviya>
      ${butoni
        .map(
          (b) =>
            `<button type="button" data-buton="${b.klyuch}" ${b.razreshena ? '' : 'disabled'} title="${ekraniraj(b.zashto)}">${ekraniraj(b.ime)}</button>`,
        )
        .join('')}
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
    <p class="vest" data-iznos-vest>${ekraniraj(iznosVest)}</p>`;

  zakachiZebrata(k.tyalo);
  zakachiRedaktsiya(k.tyalo, k);
  fokusiraySled(k.tyalo);

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
  k.tyalo.addEventListener('contextmenu', (e) => {
    const red = (e.target as HTMLElement).closest<HTMLElement>('tr.red[data-id]');
    if (!red) return;
    e.preventDefault();
    const izbran = { tablitsa: red.dataset['tablitsa'] ?? '', id: red.dataset['id'] ?? '' };
    const tochki = k.porta
      .butoniZa('imoti', izbran)
      .filter((b) => b.myasto === 'desen-buton')
      .map((b) => ({
        klyuch: b.klyuch,
        ime: b.ime,
        razreshena: b.razreshena,
        zashto: b.zashto,
        deystvie: () => void izpalniOtMenyuto(k, b.klyuch, b.tovar),
      }));
    pokazhiMenyu(e.clientX, e.clientY, tochki);
  });
}

async function izpalniOtMenyuto(k: KonteksNaEkrana, klyuch: string, tovar: unknown): Promise<void> {
  if (klyuch === 'obshto.storno') {
    const zatvori = otvoriProzorets({
      zaglavie: 'Сторно на последната промяна',
      pod: 'Журналът не се пипа: сторното е ново събитие с причина, а Огледалото се пресгъва.',
      tyalo: `<form data-storno-forma class="red-poleta"><input class="pole" data-prichina placeholder="причина" required><button type="submit">Сторнирай</button></form><p class="greshka" data-storno-greshka></p>`,
    });
    const forma = document.querySelector<HTMLFormElement>('[data-storno-forma]');
    forma?.querySelector<HTMLInputElement>('[data-prichina]')?.focus();
    forma?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const prichina = forma.querySelector<HTMLInputElement>('[data-prichina]')?.value.trim() ?? '';
      const r = await k.porta.izpalni(crypto.randomUUID(), klyuch, {
        ...(tovar as Record<string, unknown>),
        prichina,
      });
      if ('otkaz' in r) {
        const g = document.querySelector('[data-storno-greshka]');
        if (g) g.textContent = r.zashto.join(' ');
        return;
      }
      zatvori();
      // Живо Сторно = пълно пресгъване от Дневника (решение 8).
      await k.porta.prezaredi();
    });
    return;
  }
  const r = await k.porta.izpalni(crypto.randomUUID(), klyuch, tovar);
  if ('otkaz' in r) pokazhiGreshka(k.tyalo, r.zashto.join(' '));
}

/** Казва думите за износа · и след прерисуване, защото ги пази и ги рисува наново. */
function kazhiZaIznosa(k: KonteksNaEkrana, dumi: string): void {
  iznosVest = dumi;
  const vest = k.tyalo.querySelector('[data-iznos-vest]');
  if (vest) vest.textContent = dumi;
}

async function zapaziKnigata(k: KonteksNaEkrana): Promise<void> {
  kazhiZaIznosa(k, 'пиша Книгата…');
  try {
    const o = k.porta.ogledalo();
    const kursor = o.kursori.get(k.veriga) ?? { naematel: k.veriga, seq: 0, hash: '' };
    const sega = new Date().toISOString();
    const [{ knigataOtOgledaloto }, { napishiKniga }] = await Promise.all([
      import('../../src/kniga/pisane.js'),
      import('../../src/kniga/ooxml.js'),
    ]);
    const kniga = knigataOtOgledaloto(o, kursor, sega);
    const baytove = await napishiKniga(kniga.listove);
    svaliFayl(new Blob([baytove as unknown as ArrayBuffer], { type: XLSX }), 'Coretovia.xlsx');
    const r = await k.porta.izpalni(crypto.randomUUID(), 'kniga.iznesi', {
      otpechatak: otpechatakNaModela(MODEL),
      kursor,
      redove: kniga.redove,
      iznesenoNa: sega,
    });
    const zhivi = Object.values(kniga.redove).reduce((a, b) => a + b, 0);
    const zatvaryat = kniga.sverki.filter((s) => s.nared).length;
    kazhiZaIznosa(
      k,
      'otkaz' in r
        ? `Книгата е свалена, но разписката е отказана: ${r.zashto.join(' ')}`
        : `Книгата е записана · ${zhivi} живи реда · сверки: ${zatvaryat} от ${kniga.sverki.length} затварят · seq ${kursor.seq}`,
    );
  } catch (g) {
    kazhiZaIznosa(k, `Книгата не се записа: ${dumiZaGreshka(g)}`);
  }
}
