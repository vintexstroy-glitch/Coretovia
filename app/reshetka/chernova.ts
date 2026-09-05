/**
 * ЧЕРНОВАТА · новият ред, преди да е записан (решение 21).
 *
 * „+ ред" отваря ред с полета в самата таблица; нищо не се пише, докато човекът
 * не натисне Enter. `komandaId` се РАЖДА при отварянето и се преизползва до
 * успех: двоен Enter е един ред (Вратата дедуплицира по `opId`), а отказ с думи
 * оставя черновата на място, за да се поправи, не да се пише наново.
 *
 * При Обектите Категорията няма своя колона в реда — тя е в клетката на Вида
 * (Модел · `grupirane.vKletkataNa`), и смяната ѝ пресява Видовете.
 */

import type { Kletka, Kletki } from '../../src/model/kletka.js';
import { tablitsata } from '../../src/model/model.js';
import { MODEL } from '../../src/model/osnova.js';
import { slotNaKolonata } from '../../src/model/kolona.js';
import { dumiZaGreshka } from '../../src/yadro/dumi.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { kletkaOtPoleto, pokazhiGreshka, poleZaKolona } from './redaktsiya.js';

export function otvoriChernova(
  koren: HTMLElement,
  k: KonteksNaEkrana,
  tablitsa: string,
  komanda: string,
): void {
  const tbody = koren.querySelector<HTMLElement>(`[data-reshetka="${tablitsa}"] tbody`);
  if (!tbody) return;
  const veche = tbody.querySelector<HTMLElement>('.chernova .pole');
  if (veche) {
    veche.focus();
    return;
  }
  const o = k.porta.ogledalo();
  const t = tablitsata(MODEL, tablitsa);
  const komandaId = crypto.randomUUID();
  const tr = document.createElement('tr');
  tr.className = 'chernova';
  tr.dataset['chernova'] = tablitsa;
  tr.dataset['komandaId'] = komandaId;
  const poleta = new Map<string, HTMLInputElement | HTMLSelectElement>();
  const vChuzhdaKletka = new Map(
    (t.grupirane ?? [])
      .filter((g) => g.vKletkataNa !== undefined)
      .map((g) => [g.vKletkataNa!, g.kolona]),
  );
  const tekushti: Record<string, Kletka> = {};

  for (const kol of t.koloni) {
    if (
      vChuzhdaKletka.has(kol.klyuch) === false &&
      [...vChuzhdaKletka.values()].includes(kol.klyuch)
    )
      continue;
    const td = document.createElement('td');
    td.className = 'kletka';
    td.dataset['kolona'] = kol.klyuch;
    if (slotNaKolonata(kol) === undefined) {
      td.textContent = '…';
      tr.append(td);
      continue;
    }
    // Категорията стои в клетката на Вида · преди него · и пресява Видовете при смяна.
    const belegKlyuch = vChuzhdaKletka.get(kol.klyuch);
    if (belegKlyuch !== undefined) {
      const belegKol = t.koloni.find((c) => c.klyuch === belegKlyuch);
      if (belegKol !== undefined) {
        const belegPole = poleZaKolona(o, tablitsa, belegKol, null, {});
        poleta.set(belegKlyuch, belegPole);
        td.append(belegPole);
        belegPole.addEventListener('change', () => {
          const nomer = Number(belegPole.value);
          if (belegPole.value !== '') tekushti[belegKlyuch] = { nomer };
          else delete tekushti[belegKlyuch];
          const novo = poleZaKolona(o, tablitsa, kol, null, tekushti);
          poleta.get(kol.klyuch)?.replaceWith(novo);
          poleta.set(kol.klyuch, novo);
        });
      }
    }
    const pole = poleZaKolona(o, tablitsa, kol, null, tekushti);
    poleta.set(kol.klyuch, pole);
    td.append(pole);
    tr.append(td);
  }

  let vDvizhenie = false;
  const zapishi = async (): Promise<void> => {
    if (vDvizhenie) return;
    const kletki: Record<string, Kletka | null> = {};
    try {
      for (const [klyuch, pole] of poleta) {
        const kol = t.koloni.find((c) => c.klyuch === klyuch)!;
        kletki[klyuch] = kletkaOtPoleto(kol, pole);
      }
    } catch (g) {
      pokazhiGreshka(k.tyalo, dumiZaGreshka(g));
      return;
    }
    vDvizhenie = true;
    const r = await k.porta.izpalni(komandaId, komanda, { kletki: kletki as Kletki });
    vDvizhenie = false;
    if ('otkaz' in r) {
      pokazhiGreshka(k.tyalo, r.zashto.join(' '));
      return;
    }
    pokazhiGreshka(k.tyalo, '');
    if (r.povtoreno) k.prerisuvay();
  };

  tr.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void zapishi();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      tr.remove();
    }
  });
  tbody.prepend(tr);
  poleta.values().next().value?.focus();
}
