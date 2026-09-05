/**
 * СЛУЖИТЕЛИ · прозорецът на листа „Служители" (ADR-008).
 *
 * Неговите четири блока, в неговия ред: Стопани свързани с Coretovia (A2) ·
 * Служители свързани с Coretovia (A6) · „Създаване на Длъжност с достъп" (B14) и
 * Достъп на Длъжности за Служител (A15) · Програма за Задачи на Служители (A23).
 *
 * ДОСТЪПЪТ показва и петте му БАЗОВИ реда — онези, за които още няма запис. Те
 * са картина, не данни: пише ли се ред за същата Длъжност, той бие (правило 23:
 * правото само стеснява, и стеснението е решение на човек, не подразбиране).
 */

import { GLAVI_NA_PROGRAMATA } from '../../src/kniga/dumi.js';
import { tablitsata } from '../../src/model/model.js';
import { MODEL, PROZORTSI } from '../../src/model/osnova.js';
import { koloniNaReda } from '../../src/model/tablitsa.js';
import { redKato, zhiviteRedove } from '../../src/ogledalo/tablitsa.js';
import { programata } from '../../src/smetach/programa.js';
import {
  dlazhnosttaNaImeyla,
  dostapaNaDlazhnostta,
  mozheDaRazdavaDlazhnosti,
} from '../../src/smetach/pravo.js';
import { DOSTAP_PO_PODRAZBIRANE } from '../../src/model/osnova.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { otvoriChernova } from '../reshetka/chernova.js';
import { ekraniraj } from '../reshetka/obshto.js';
import { reshetkaHTML, zakachiReshetkata } from '../reshetka/reshetka.js';
import {
  butoniteHTML,
  iznosVestHTML,
  izpalniOtMenyuto,
  zakachiDyasnoMenyu,
  zapaziKnigata,
} from './deystviya.js';

/** Кой бутон коя таблица отваря · трите му места за нов ред. */
const TABLITSA_NA_BUTONA: Readonly<Record<string, string>> = Object.freeze({
  'sluzhiteli.dobaviStopan': 'stopani',
  'sluzhiteli.dobaviSluzhitel': 'sluzhiteli',
  'sluzhiteli.dobaviDlazhnost': 'dostap',
});

export function narisuvaySluzhiteli(k: KonteksNaEkrana): void {
  const o = k.porta.ogledalo();
  const p = PROZORTSI.find((x) => x.klyuch === 'sluzhiteli')!;
  const butoni = k.porta.butoniZa('sluzhiteli').filter((b) => b.myasto === 'buton');
  const tablitsi = ['stopani', 'sluzhiteli', 'dostap'].map((x) => tablitsata(MODEL, x));
  const dlazhnosttaMi = dlazhnosttaNaImeyla(o, k.aktor());
  const dnes = new Date().toISOString().slice(0, 10);

  /** Базовите редове на Достъпа, които още не са записани · картина, не данни. */
  const bazoviHTML = (): string => {
    const t = tablitsata(MODEL, 'dostap');
    const koloni = koloniNaReda(t);
    const redove = DOSTAP_PO_PODRAZBIRANE.filter(
      (d) => !dostapaNaDlazhnostta(o, d.dlazhnost).zapisan,
    );
    if (redove.length === 0) return '';
    return redove
      .map(
        (d) =>
          `<tr class="red bazov" data-bazov="${ekraniraj(d.dlazhnost)}">${koloni
            .map((kol) => {
              const stoynost = kol.vid === 'nomeratsiya' ? '' : (d[kol.klyuch] ?? '');
              return `<td class="kletka ${kol.vid}" data-kolona="${kol.klyuch}" translate="no">${ekraniraj(stoynost)}</td>`;
            })
            .join('')}</tr>`,
      )
      .join('');
  };

  /**
   * Програмата за Задачи · неговите A24:D24, вече СМЯТАНИ.
   *
   * До резен 4б двете числа стояха с тире, защото Книгата нямаше кой да носи
   * задачата. Негово, 05.09: „Да се добави отговорник за всяка задача" — оттам
   * колоната „Отговорник" на Управление сочи човек оттук, и числата се броят.
   */
  const programaHTML = (): string => {
    const pr = programata(o, dnes);
    const redove = pr.redove
      .map(
        (r, i) =>
          `<tr class="red" data-id="${ekraniraj(r.id)}" data-tablitsa="${ekraniraj(r.tablitsa)}"><td class="kletka nomer">${i + 1}</td><td class="kletka tekst" translate="no">${ekraniraj(r.ime)}</td><td class="kletka chislo" data-dneshni="${ekraniraj(r.id)}">${r.dneshni}</td><td class="kletka chislo" data-sedmichni="${ekraniraj(r.id)}">${r.sedmichni}</td></tr>`,
      )
      .join('');
    const vest =
      pr.bezOtgovornik === 0
        ? `Всяка от ${pr.broyZadachi} задачи в Управление има отговорник.`
        : `${pr.bezOtgovornik} от ${pr.broyZadachi} задачи в Управление са БЕЗ отговорник — не се броят на никого (колоната „Отговорник" е там).`;
    const kamNezhivi =
      pr.kamNezhivi === 0
        ? ''
        : ` ${pr.kamNezhivi} сочат човек, който вече не е жив ред — поправи ги.`;
    return `<table class="reshetka" data-reshetka="programa">
        <thead><tr>${GLAVI_NA_PROGRAMATA.map((g) => `<th>${ekraniraj(g)}</th>`).join('')}</tr></thead>
        <tbody class="tablitsa">${redove}</tbody>
      </table>
      <p class="pod-tablitsata" data-programa-vest>${ekraniraj(vest)}${ekraniraj(kamNezhivi)} Днес е ${ekraniraj(dnes)}; седмицата почва в понеделник.</p>`;
  };

  k.tyalo.innerHTML = `
    <div class="deystviya" data-deystviya>
      ${butoniteHTML(butoni)}
      <button type="button" class="vtorichen" data-zapazi-kniga>Запази книгата</button>
      <span class="vest" data-dlazhnostta-mi>${
        dlazhnosttaMi === ''
          ? 'Ти още нямаш ред в тези таблици · виждаш всичко, но не пишеш никъде освен ако не си Стопанинът.'
          : `Ти си ${ekraniraj(dlazhnosttaMi)}.`
      }</span>
      <span class="vest" data-koy-razdava>${
        mozheDaRazdavaDlazhnosti(o, k.aktor())
          ? 'Ти раздаваш Длъжности.'
          : 'Ти НЕ раздаваш Длъжности · те се раздават от Управител и Помощник Управител (негово, 05.09).'
      }</span>
    </div>
    <p class="greshka" data-greshka></p>
    ${tablitsi
      .map(
        (t) => `<section class="tablitsa-blok" data-blok="${t.klyuch}">
          ${t.klyuch === 'dostap' ? `<p class="dumite">${ekraniraj('Създаване на Длъжност с достъп')}</p>` : ''}
          <h2 class="lenta" translate="no">${ekraniraj(t.ime)}</h2>
          ${reshetkaHTML(o, t.klyuch, false)}
          ${t.klyuch === 'dostap' ? `<p class="pod-tablitsata" data-bazovi-vest>Петте реда по подразбиране са неговите от Книгата; запише ли се ред за същата Длъжност, той бие.</p>` : ''}
        </section>`,
      )
      .join('')}
    <section class="tablitsa-blok" data-blok="programa">
      <h2 class="lenta" translate="no">${ekraniraj(p.lenti[3] ?? '')}</h2>
      ${programaHTML()}
    </section>
    ${iznosVestHTML()}`;

  // базовите редове влизат в таблицата на Достъпа, след записаните
  const tyaloNaDostapa = k.tyalo.querySelector('[data-reshetka="dostap"] tbody');
  if (tyaloNaDostapa !== null) tyaloNaDostapa.insertAdjacentHTML('beforeend', bazoviHTML());

  zakachiReshetkata(k);

  for (const b of k.tyalo.querySelectorAll<HTMLButtonElement>('[data-buton]')) {
    b.addEventListener('click', () => {
      const tablitsa = TABLITSA_NA_BUTONA[b.dataset['buton'] ?? ''];
      if (tablitsa !== undefined) otvoriChernova(k.tyalo, k, tablitsa, b.dataset['buton'] ?? '');
    });
  }
  k.tyalo.querySelector<HTMLButtonElement>('[data-zapazi-kniga]')?.addEventListener('click', () => {
    void zapaziKnigata(k);
  });
  zakachiDyasnoMenyu(k, 'sluzhiteli', (b) => void izpalniOtMenyuto(k, b.klyuch, b.tovar));
}
