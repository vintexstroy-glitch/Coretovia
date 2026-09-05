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
 *
 * ОБЛИКЪТ на черновата е по подразбиране една клетка на колона от Модела; дървото
 * на Управление има негови глави (ADR-005), затова подава свой облик: в коя
 * клетка стои полето на всяка колона, след кой ред се вмъква и кои клетки са
 * ДАДЕНИ отвън (родителят от десния бутон) — те влизат в товара, не в полетата.
 */

import { izpalniOtMenyuto, zakachiDyasnoMenyu, zapaziKnigata } from '../prozorets/deystviya.js';
import type { Kletka, Kletki } from '../../src/model/kletka.js';
import { type Kolona, slotNaKolonata } from '../../src/model/kolona.js';
import { tablitsata } from '../../src/model/model.js';
import { MODEL } from '../../src/model/osnova.js';
import { dumiZaGreshka } from '../../src/yadro/dumi.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { otgovoratNaPortata } from '../prozorets/deystviya.js';
import { kletkaOtPoleto, pokazhiGreshka, poleZaKolona } from './redaktsiya.js';

export interface OblikNaChernovata {
  /** брой клетки в реда · при дървото те са главите на облика, не колоните на Модела */
  readonly broyKletki: number;
  /** в коя клетка (0-базирано) стои полето на колоната · `undefined` = няма поле */
  readonly kletkaNaKolonata: (kol: Kolona) => number | undefined;
  /** след кой ред се вмъква · иначе най-отгоре */
  readonly sled?: HTMLElement;
  /** клетки, дадени отвън · не са полета, влизат в товара */
  readonly dadeni?: Readonly<Record<string, Kletka | null>>;
  readonly klas?: string;
}

export function otvoriChernova(
  koren: HTMLElement,
  k: KonteksNaEkrana,
  tablitsa: string,
  komanda: string,
  oblik?: OblikNaChernovata,
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
  tr.className = `chernova${oblik?.klas === undefined ? '' : ` ${oblik.klas}`}`;
  tr.dataset['chernova'] = tablitsa;
  tr.dataset['komandaId'] = komandaId;
  const poleta = new Map<string, HTMLInputElement | HTMLSelectElement>();
  const tekushti: Record<string, Kletka> = {};
  const dadeni = oblik?.dadeni ?? {};

  if (oblik === undefined) {
    const vChuzhdaKletka = new Map(
      (t.grupirane ?? [])
        .filter((g) => g.vKletkataNa !== undefined)
        .map((g) => [g.vKletkataNa!, g.kolona]),
    );
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
          const belegPole = poleZaKolona(o, belegKol, null, {});
          poleta.set(belegKlyuch, belegPole);
          td.append(belegPole);
          belegPole.addEventListener('change', () => {
            const nomer = Number(belegPole.value);
            if (belegPole.value !== '') tekushti[belegKlyuch] = { nomer };
            else delete tekushti[belegKlyuch];
            const novo = poleZaKolona(o, kol, null, tekushti);
            poleta.get(kol.klyuch)?.replaceWith(novo);
            poleta.set(kol.klyuch, novo);
          });
        }
      }
      const pole = poleZaKolona(o, kol, null, tekushti);
      poleta.set(kol.klyuch, pole);
      td.append(pole);
      tr.append(td);
    }
  } else {
    const tds: HTMLTableCellElement[] = [];
    for (let j = 0; j < oblik.broyKletki; j += 1) {
      const td = document.createElement('td');
      td.className = 'kletka';
      tds.push(td);
      tr.append(td);
    }
    for (const kol of t.koloni) {
      if (slotNaKolonata(kol) === undefined || kol.klyuch in dadeni) continue;
      const j = oblik.kletkaNaKolonata(kol);
      const td = j === undefined ? undefined : tds[j];
      if (td === undefined) continue;
      const pole = poleZaKolona(o, kol, null, tekushti);
      pole.title = kol.kratko ?? kol.ime;
      poleta.set(kol.klyuch, pole);
      td.append(pole);
    }
  }

  let vDvizhenie = false;
  const zapishi = async (): Promise<void> => {
    if (vDvizhenie) return;
    const kletki: Record<string, Kletka | null> = { ...dadeni };
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
    otgovoratNaPortata(k, r);
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
  if (oblik?.sled !== undefined) oblik.sled.after(tr);
  else tbody.prepend(tr);
  poleta.values().next().value?.focus();
}

/**
 * БУТОНИТЕ на прозорец с таблици · отваряне на чернова · „Запази книгата" ·
 * дясното меню. Три прозореца ги закачаха еднакво; домът им е един (правило 17).
 */
export function zakachiButonite(
  k: KonteksNaEkrana,
  prozorets: string,
  tablitsaNaButona: Readonly<Record<string, string>>,
): void {
  for (const b of k.tyalo.querySelectorAll<HTMLButtonElement>('[data-buton]')) {
    b.addEventListener('click', () => {
      const klyuch = b.dataset['buton'] ?? '';
      const tablitsa = tablitsaNaButona[klyuch];
      if (tablitsa !== undefined) otvoriChernova(k.tyalo, k, tablitsa, klyuch);
    });
  }
  k.tyalo.querySelector<HTMLButtonElement>('[data-zapazi-kniga]')?.addEventListener('click', () => {
    void zapaziKnigata(k);
  });
  zakachiDyasnoMenyu(k, prozorets, (b) => void izpalniOtMenyuto(k, b.klyuch, b.tovar));
}
