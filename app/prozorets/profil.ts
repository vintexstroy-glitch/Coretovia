/**
 * ПРОФИЛ · откриването на Книгата, Стопанинът, хранилището и четенето на Книга.
 *
 * Празен Журнал → екранът иска имейл и пише `stopanin.otkriy` (Вратата
 * отказва всичко преди това). Тук остават и трите неща от резен 0: думите за
 * хранилището, „Провери веригата" и четенето на една Книга без запис.
 */

import { DUMI_OT_KNIGATA } from '../../src/model/dumi-ot-knigata.js';
import { prozoretsPoList } from '../../src/model/osnova.js';
import { dumiZaGreshka } from '../../src/yadro/dumi.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { ekraniraj } from '../reshetka/obshto.js';

export function dumiteHTML(dumi: readonly { nomer: string; tekst: string }[]): string {
  if (dumi.length === 0) return '';
  return `<ol class="dumite" translate="no">${dumi
    .map((d) => `<li><span class="nomer">${ekraniraj(d.nomer)}</span> ${ekraniraj(d.tekst)}</li>`)
    .join('')}</ol>`;
}

export function narisuvayProfil(k: KonteksNaEkrana): void {
  const o = k.porta.ogledalo();
  const otkrita = o.stopanin !== '';
  k.tyalo.innerHTML = `
    ${
      otkrita
        ? `<section class="sektsiya" data-sektsiya="stopanin"><h2>Стопанин</h2><p data-stopanin translate="no">${ekraniraj(o.stopanin)}</p></section>`
        : `<section class="sektsiya" data-sektsiya="otkrivane">
            <h2>Открий Книгата</h2>
            <p>Книгата е празна. Първото събитие е Стопанинът — имейлът на този, който я открива. Записва се веднъж.</p>
            <form data-otkriy class="red-poleta">
              <input type="email" class="pole" data-imeyl placeholder="имейл" required value="${ekraniraj(k.aktor())}">
              <button type="submit" data-otkriy-buton>Открий Книгата</button>
            </form>
            <p class="greshka" data-greshka></p>
          </section>`
    }
    ${dumiteHTML(DUMI_OT_KNIGATA.profil)}
    <section class="sektsiya" data-sektsiya="hranilishte">
      <h2>Хранилището</h2>
      <p data-hranilishte>${ekraniraj(k.hranilishte())}</p>
      <button type="button" class="vtorichen" data-proveri>Провери веригата</button>
      <p data-veriga></p>
    </section>
    <section class="sektsiya" data-sektsiya="kniga">
      <h2>Книгата</h2>
      <p>Прочети една Книга (.xlsx). Нищо не се записва — само се показва какво има в нея.</p>
      <input type="file" accept=".xlsx" data-kniga>
      <p data-kniga-vest></p>
      <table class="tablitsa" data-listove hidden>
        <thead><tr><th>лист</th><th>прозорец</th><th>редове</th><th>колони</th><th>слети</th></tr></thead>
        <tbody></tbody>
      </table>
    </section>`;

  k.tyalo.querySelector<HTMLFormElement>('[data-otkriy]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const imeyl = k.tyalo.querySelector<HTMLInputElement>('[data-imeyl]')?.value.trim() ?? '';
    k.zadayAktor(imeyl);
    const r = await k.porta.izpalni(crypto.randomUUID(), 'stopanin.otkriy', { imeyl });
    const greshka = k.tyalo.querySelector('[data-greshka]');
    if ('otkaz' in r) {
      if (greshka) greshka.textContent = r.zashto.join(' ');
      return;
    }
    location.hash = '#/imoti';
  });

  k.tyalo
    .querySelector<HTMLButtonElement>('[data-proveri]')
    ?.addEventListener('click', async () => {
      const p = k.tyalo.querySelector('[data-veriga]');
      if (p) p.textContent = await k.proveriVerigata();
    });

  k.tyalo.querySelector<HTMLInputElement>('[data-kniga]')?.addEventListener('change', async (e) => {
    const fayl = (e.target as HTMLInputElement).files?.[0];
    const vest = k.tyalo.querySelector('[data-kniga-vest]');
    const tablitsa = k.tyalo.querySelector<HTMLTableElement>('[data-listove]');
    if (!fayl || !vest || !tablitsa) return;
    vest.textContent = 'чета…';
    try {
      // Библиотеката за Книгата се тегли ПРИ НАТИСКАНЕ, не при тръгване: тя е
      // най-тежкото парче в пакета, а страницата трябва да се отвори веднага.
      const { prochetiKniga } = await import('../../src/kniga/ooxml.js');
      const kniga = await prochetiKniga(await fayl.arrayBuffer());
      const poznati = kniga.listove.filter((l) => prozoretsPoList(l.ime) !== undefined).length;
      const tbody = tablitsa.querySelector('tbody');
      if (tbody) {
        tbody.innerHTML = kniga.listove
          .map((l) => {
            const p = prozoretsPoList(l.ime);
            return `<tr data-list="${ekraniraj(l.ime)}"><td translate="no">${ekraniraj(l.ime)}</td><td>${
              p ? p.klyuch : '— непознат'
            }</td><td>${l.broyRedove}</td><td>${l.broyKoloni}</td><td>${l.slivaniya.length}</td></tr>`;
          })
          .join('');
      }
      tablitsa.hidden = false;
      const nepoznati = kniga.listove.length - poznati;
      vest.textContent =
        `${kniga.listove.length} листа · ${poznati} познати · ${nepoznati} непознати · ` +
        `сверка: ${kniga.listove.length} = ${poznati} + ${nepoznati} · разлика ${
          kniga.listove.length - poznati - nepoznati
        }`;
    } catch (g) {
      vest.textContent = `Книгата не се чете: ${dumiZaGreshka(g)}`;
    }
  });
}
