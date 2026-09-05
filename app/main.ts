/**
 * Coretovia · композиционният корен · резен 0 (скелетът).
 *
 * Единственото място, което сглобява носител, Врата и екран. Всичко останало
 * получава готовите части. Днес тук има: Журналът в IndexedDB (празен), Вратата
 * над него (никой още не пише), осемте прозореца по име, и четенето на една
 * Книга — за да се докаже, че библиотеката върви в браузъра, преди да стъпи
 * нещо върху нея.
 */

import {
  KotvaVLocalStorage,
  proveriVerigata,
  Vrata,
  VsichkoRazresheno,
} from '../src/yadro/index.js';
import { otvoriDnevnik } from '../src/nositel/dnevnik-indexeddb.js';
import {
  klyuchalkaMezhduRazdeli,
  kolkoMyasto,
  osiguriHranilishte,
} from '../src/nositel/hranilishte.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { PROZORTSI, prozoretsPoList } from '../src/model/osnova.js';

const KNIGA = 'coretovia';

function ekraniraj(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[z] ?? z,
  );
}

async function main(): Promise<void> {
  const ekran = document.getElementById('ekran');
  if (!ekran) return;

  const dnevnik = await otvoriDnevnik(KNIGA);
  // Ключалката между разделите я има само където браузърът дава Web Locks;
  // без нея Вратата пак върви — с опашка в рамките на този раздел.
  const klyuchalka = klyuchalkaMezhduRazdeli();
  const vrata = new Vrata({
    dnevnik,
    pravata: new VsichkoRazresheno(),
    sha: sha256Web,
    kotva: new KotvaVLocalStorage('coretovia:kotva'),
    ...(klyuchalka ? { klyuchalka } : {}),
  });
  const hranilishte = await osiguriHranilishte();
  const sabitiya = await dnevnik.chetiVsichki(KNIGA);

  ekran.innerHTML = `
    <header class="glava">
      <h1>Coretovia</h1>
      <p class="vest" data-vest>${
        sabitiya.length === 0
          ? 'Книгата е празна · 0 събития'
          : `${sabitiya.length} събития в Журнала`
      }</p>
    </header>
    <section class="sektsiya" data-sektsiya="hranilishte">
      <h2>Хранилището</h2>
      <p data-hranilishte>постоянство: ${hranilishte.postoyanstvo} · заето: ${kolkoMyasto(
        hranilishte.zaeto,
      )} от ${kolkoMyasto(hranilishte.pozvoleno)} · Вратата е ${vrata.zatvorena ? 'затворена' : 'отворена'}</p>
      <button type="button" data-proveri>Провери веригата</button>
      <p data-veriga></p>
    </section>
    <section class="sektsiya" data-sektsiya="prozortsi">
      <h2>Осемте прозореца</h2>
      <ol data-prozortsi>
        ${PROZORTSI.map((p) => `<li data-prozorets="${p.klyuch}" translate="no">${ekraniraj(p.list)}</li>`).join('')}
      </ol>
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
    </section>
  `;

  ekran.querySelector<HTMLButtonElement>('[data-proveri]')?.addEventListener('click', async () => {
    const r = await proveriVerigata(await dnevnik.chetiVsichki(KNIGA), sha256Web);
    const p = ekran.querySelector('[data-veriga]');
    if (p) {
      p.textContent = r.tsyala
        ? `Веригата е цяла · ${r.proverni} от ${r.proverni} звена.`
        : `Веригата се къса на seq ${r.parvoSchupeno} (${r.prichina}).`;
    }
  });

  ekran.querySelector<HTMLInputElement>('[data-kniga]')?.addEventListener('change', async (e) => {
    const fayl = (e.target as HTMLInputElement).files?.[0];
    const vest = ekran.querySelector('[data-kniga-vest]');
    const tablitsa = ekran.querySelector<HTMLTableElement>('[data-listove]');
    if (!fayl || !vest || !tablitsa) return;
    vest.textContent = 'чета…';
    try {
      // Библиотеката за Книгата се тегли ПРИ НАТИСКАНЕ, не при тръгване: тя е
      // най-тежкото парче в пакета, а страницата трябва да се отвори веднага.
      // Джобът я пази (черупката я носи), тъй че офлайн пак работи.
      const { prochetiKniga } = await import('../src/kniga/ooxml.js');
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
      // Сверка вход↔изход: листове във файла ↔ познати + непознати · и нулата се казва.
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

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* без джоб · приложението пак работи, само не офлайн */
    });
  }
}

await main();
