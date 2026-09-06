/**
 * ПРОФИЛ · откриването на Книгата, Стопанинът, хранилището и четенето на Книга.
 *
 * Празен Журнал → екранът иска имейл и пише `stopanin.otkriy` (Вратата
 * отказва всичко преди това). Тук остават и трите неща от резен 0: думите за
 * хранилището, „Провери веригата" и четенето на една Книга без запис.
 */

import { DUMI_OT_KNIGATA } from '../../src/model/dumi-ot-knigata.js';
import { prozoretsPoList, SLUZHEBEN_LIST } from '../../src/model/osnova.js';
import { dostapaMi } from '../../src/smetach/pravo.js';
import { dumiZaGreshka } from '../../src/yadro/dumi.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { h, sloji, type Zapechatan } from '../reshetka/shablon.js';

export function dumiteHTML(dumi: readonly { nomer: string; tekst: string }[]): Zapechatan {
  if (dumi.length === 0) return h``;
  return h`<ol class="dumite" translate="no">${dumi.map(
    (d) => h`<li><span class="nomer">${d.nomer}</span> ${d.tekst}</li>`,
  )}</ol>`;
}

/**
 * ЛИЧНИ ДАННИ (Кой съм) · неговото B2 · и достъпът, който Длъжността дава.
 *
 * Данните НЕ се дублират: идват от реда му в „Стопани" или „Служители" (лист
 * Служители), намерен по имейла, с който пише. Личният изглед само СТЕСНЯВА
 * (правило 23) — затова тук се чете, не се редактира.
 */
function lichniteMiDanni(k: KonteksNaEkrana): Zapechatan {
  const o = k.porta.ogledalo();
  const d = dostapaMi(o, k.aktor());
  const redovete = d.osi.map(
    (x) =>
      h`<tr class="red" data-os="${x.os}"><td>${x.os}</td><td>${x.pravo}</td><td translate="no">${x.dumi === '' ? '—' : x.dumi}</td></tr>`,
  );
  return h`<section class="sektsiya" data-sektsiya="lichni">
      <h2>Лични Данни (Кой съм) и Достъп</h2>
      <p data-imeylat-mi translate="no">${k.aktor()}</p>
      <p data-dlazhnostta-mi>${
        d.dlazhnost === ''
          ? 'Нямаш ред в „Служители" · добави се там, за да ти важи Длъжност (лист Служители).'
          : `Длъжност: ${d.dlazhnost}`
      }</p>
      <table class="tablitsa" data-dostapa-mi>
        <thead><tr><th>ос</th><th>право</th><th>какво пише в Книгата</th></tr></thead>
        <tbody>${redovete}</tbody>
      </table>
      <p class="pod-tablitsata">Личният изглед само СТЕСНЯВА (правило 23): каквото Длъжността не дава, не се отваря от тук.</p>
    </section>`;
}

export function narisuvayProfil(k: KonteksNaEkrana): void {
  const o = k.porta.ogledalo();
  const otkrita = o.stopanin !== '';
  sloji(
    k.tyalo,
    h`
    ${
      otkrita
        ? h`<section class="sektsiya" data-sektsiya="stopanin"><h2>Стопанин</h2><p data-stopanin translate="no">${o.stopanin}</p></section>`
        : h`<section class="sektsiya" data-sektsiya="otkrivane">
            <h2>Открий Книгата</h2>
            <p>Книгата е празна. Първото събитие е Стопанинът — имейлът на този, който я открива. Записва се веднъж.</p>
            <form data-otkriy class="red-poleta">
              <input type="email" class="pole" name="imeyl" autocomplete="email" data-imeyl placeholder="имейл" required value="${k.aktor()}">
              <button type="submit" data-otkriy-buton>Открий Книгата</button>
            </form>
            <p class="greshka" data-greshka></p>
          </section>`
    }
    ${otkrita ? lichniteMiDanni(k) : ''}
    ${dumiteHTML(DUMI_OT_KNIGATA.profil)}
    <section class="sektsiya" data-sektsiya="hranilishte">
      <h2>Хранилището</h2>
      <p data-hranilishte>${k.hranilishte()}</p>
      <p class="${k.kotvata().nared ? 'vest' : 'greshka'}" data-kotva>${k.kotvata().dumi}</p>
      <button type="button" class="vtorichen" data-proveri>Провери веригата</button>
      <p data-veriga></p>
    </section>
    <section class="sektsiya" data-sektsiya="kniga">
      <h2>Погледни Книгата</h2>
      <p>Показва какво има в една Книга (.xlsx) — листове, редове, колони. Нищо не се сверява и нищо не се записва; вносът е в <a href="#/ii">ИИ · Сверчикът</a>.</p>
      <input type="file" accept=".xlsx" data-kniga>
      <p data-kniga-vest></p>
      <table class="tablitsa" data-listove hidden>
        <thead><tr><th>лист</th><th>прозорец</th><th>редове</th><th>колони</th><th>слети</th></tr></thead>
        <tbody></tbody>
      </table>
    </section>`,
  );

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
      const sluzhebni = kniga.listove.filter((l) => l.ime === SLUZHEBEN_LIST).length;
      const tbody = tablitsa.querySelector('tbody');
      if (tbody) {
        sloji(
          tbody,
          h`${kniga.listove.map((l) => {
            const p = prozoretsPoList(l.ime);
            return h`<tr data-list="${l.ime}"><td translate="no">${l.ime}</td><td>${
              p ? p.klyuch : l.ime === SLUZHEBEN_LIST ? 'служебен' : '— непознат'
            }</td><td>${l.broyRedove}</td><td>${l.broyKoloni}</td><td>${l.slivaniya.length}</td></tr>`;
          })}`,
        );
      }
      tablitsa.hidden = false;
      const nepoznati = kniga.listove.length - poznati - sluzhebni;
      vest.textContent =
        `${kniga.listove.length} листа · ${poznati} познати · ${sluzhebni} служебни · ${nepoznati} непознати · ` +
        `сверка: ${kniga.listove.length} = ${poznati} + ${sluzhebni} + ${nepoznati} · разлика ${
          kniga.listove.length - poznati - sluzhebni - nepoznati
        }`;
    } catch (g) {
      vest.textContent = `Книгата не се чете: ${dumiZaGreshka(g)}`;
    }
  });
}
