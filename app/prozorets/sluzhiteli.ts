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

import { tablitsata } from '../../src/model/model.js';
import { MODEL, PROZORTSI } from '../../src/model/osnova.js';
import { koloniNaReda } from '../../src/model/tablitsa.js';
import { redKato, zhiviteRedove } from '../../src/ogledalo/tablitsa.js';
import { darvoto } from '../../src/smetach/darvo.js';
import { dostapaNaDlazhnostta, dlazhnosttaNaImeyla } from '../../src/smetach/pravo.js';
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

  /** Програмата за Задачи · по един ред на служител (негови A24:D24). */
  const programaHTML = (): string => {
    const tv = o.tablitsi.get('sluzhiteli');
    const darvo = darvoto(o);
    const redove =
      tv === undefined
        ? []
        : zhiviteRedove(tv).map((i) => {
            const r = redKato(tv, i);
            const ime = r.kletki['ime'];
            return `<tr class="red" data-id="${ekraniraj(r.id)}" data-tablitsa="sluzhiteli"><td class="kletka nomer">${i + 1}</td><td class="kletka tekst" translate="no">${ekraniraj(ime !== undefined && 'tekst' in ime ? ime.tekst : '')}</td><td class="kletka" data-dneshni>—</td><td class="kletka" data-sedmichni>—</td></tr>`;
          });
    return `<table class="reshetka" data-reshetka="programa">
        <thead><tr><th>№</th><th>Име Служител</th><th>днешни задачи</th><th>седмични задачи в таблица</th></tr></thead>
        <tbody class="tablitsa">${redove.join('')}</tbody>
      </table>
      <p class="pod-tablitsata" data-programa-vest>Задачите са ${darvo.broyZadachi} в Управление. Кой служител носи коя задача чака негова дума: Книгата няма колона за изпълнител (ADR-008).</p>`;
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
