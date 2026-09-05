/**
 * РЕДАКЦИЯТА В КЛЕТКАТА · патернът на MasterBook (`app/redaktsiya.ts`), с тяло
 * върху Портата.
 *
 * Двоен клик или F2/Enter отваря поле НА МЯСТОТО на клетката; Enter записва и
 * слиза един ред; Escape отказва; клик другаде (blur) е отказ. ЗАПИСВА ЧОВЕКЪТ,
 * ЯВНО: единствено Enter пише. Записът минава през `red.popraviKletka` на
 * Портата — сторно + ново, със следа, никакъв презапис (правило 1).
 *
 * КОЯ клетка се отваря, се ОБЯВЯВА (правило 16): `data-redakt` носят само
 * отворените колони. Отказът е с думи (правило 12) — в `[data-greshka]`, не в
 * конзолата.
 */

import type { Kletka } from '../../src/model/kletka.js';
import { tablitsata } from '../../src/model/model.js';
import { MODEL } from '../../src/model/osnova.js';
import type { Kolona } from '../../src/model/kolona.js';
import { kolonaNa } from '../../src/model/tablitsa.js';
import type { Ogledalo } from '../../src/ogledalo/ogledalo.js';
import { redKato, zhiviteRedove } from '../../src/ogledalo/tablitsa.js';
import { imeNaReda } from '../../src/smetach/kletki.js';
import { nomerNaRed, tekstNaNomera } from '../../src/smetach/nomeratsiya.js';
import { dumiZaGreshka } from '../../src/yadro/dumi.js';
import { otSuma, pishiVPole } from '../../src/yadro/pari.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { poleSIzbor } from './izbor.js';

/** Клетката, която трябва да получи фокуса СЛЕД прерисуване · един белег за целия екран. */
let fokusSled: string | null = null;

export function fokusiraySled(koren: HTMLElement): void {
  if (fokusSled === null) return;
  const el = koren.querySelector<HTMLElement>(`[data-redakt="${CSS.escape(fokusSled)}"]`);
  fokusSled = null;
  el?.focus();
}

/** Enter записва · Escape отказва · общото на всяко поле на място (един дом). */
export function naEnterIEscape(pole: HTMLElement, zapishi: () => void, otkaz: () => void): void {
  pole.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      otkaz();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      zapishi();
    }
  });
}

export function pokazhiGreshka(koren: HTMLElement, dumi: string): void {
  const p = koren.querySelector('[data-greshka]');
  if (p) p.textContent = dumi;
}

/** кв. см → текст за полето · `85,12` */
function kvsmZaPole(kvsm: number): string {
  return (kvsm / 10000).toFixed(2).replace('.', ',');
}

/** Полето за една колона · по вида ѝ · с текущата стойност. */
export function poleZaKolona(
  o: Ogledalo,
  kol: Kolona,
  tekusht: Kletka | null,
  red: Readonly<Record<string, Kletka>>,
): HTMLInputElement | HTMLSelectElement {
  if (kol.vid === 'izbor') {
    const n = o.nomenklaturi.get(kol.nomenklatura ?? '');
    const beleg = kol.belegOt === undefined ? undefined : red[kol.belegOt];
    const belezi =
      n?.podredbaPo !== undefined && beleg !== undefined && 'nomer' in beleg
        ? { [n.podredbaPo]: beleg.nomer }
        : {};
    const s =
      n === undefined
        ? document.createElement('select')
        : poleSIzbor(n, tekusht !== null && 'nomer' in tekusht ? tekusht.nomer : null, belezi);
    s.dataset['kolona'] = kol.klyuch;
    return s;
  }
  if (kol.vid === 'vrazka') {
    const s = document.createElement('select');
    s.className = 'pole';
    s.dataset['kolona'] = kol.klyuch;
    s.append(new Option('—', ''));
    // всички позволени таблици · с номера, за да се различават Имот, Обект и Бизнес
    for (const tab of kol.vrazka ?? []) {
      const roditel = o.tablitsi.get(tab);
      if (roditel === undefined) continue;
      for (const i of zhiviteRedove(roditel)) {
        const id = roditel.id[i] ?? '';
        const nomer = tekstNaNomera(nomerNaRed(o, tab, i));
        s.append(new Option(`${nomer === '' ? '' : `${nomer} · `}${imeNaReda(o, tab, id)}`, id));
      }
    }
    s.value = tekusht !== null && 'tekst' in tekusht ? tekusht.tekst : '';
    return s;
  }
  const p = document.createElement('input');
  p.className = 'pole';
  p.dataset['kolona'] = kol.klyuch;
  p.placeholder = kol.ime;
  if (kol.vid === 'evro') {
    p.inputMode = 'decimal';
    p.value = tekusht !== null && 'stoynost_st' in tekusht ? pishiVPole(tekusht.stoynost_st) : '';
  } else if (kol.vid === 'chislo' || kol.vid === 'protsent') {
    p.inputMode = 'decimal';
    if (tekusht !== null && 'chislo' in tekusht) {
      p.value = kol.merka === 'kvsm' ? kvsmZaPole(tekusht.chislo) : String(tekusht.chislo);
    }
  } else {
    p.value = tekusht !== null && 'tekst' in tekusht ? tekusht.tekst : '';
  }
  return p;
}

/** Клетката от полето · празно = `null` (изпразване) · грешен вход хвърля с думи. */
export function kletkaOtPoleto(
  kol: Kolona,
  pole: HTMLInputElement | HTMLSelectElement,
): Kletka | null {
  const v = pole.value.trim();
  if (v === '') return null;
  switch (kol.vid) {
    case 'evro':
      return { stoynost_st: otSuma(v) };
    case 'chislo':
    case 'protsent': {
      const chislo = Number(v.replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(chislo)) throw new Error(`„${v}" не е число.`);
      if (kol.merka === 'kvsm') return { chislo: Math.round(chislo * 10000) };
      if (!Number.isInteger(chislo)) throw new Error(`„${kol.ime}" е цяло число.`);
      return { chislo };
    }
    case 'izbor':
      return { nomer: Number(v) };
    case 'vrazka':
    case 'tekst':
    case 'data':
      return { tekst: v };
    case 'nomeratsiya':
      return null;
    default:
      return null;
  }
}

function razlozhiBeleg(beleg: string): { tablitsa: string; id: string; kolona: string } | null {
  const chasti = beleg.split('·');
  if (chasti.length !== 3) return null;
  return { tablitsa: chasti[0]!, id: chasti[1]!, kolona: chasti[2]! };
}

/** Съседната клетка · надолу/нагоре в същата колона, наляво/надясно в реда. */
function sasedna(td: HTMLElement, posoka: string): HTMLElement | null {
  const tr = td.closest('tr');
  if (!tr) return null;
  const kolona = td.dataset['kolona'] ?? '';
  if (posoka === 'ArrowDown' || posoka === 'ArrowUp') {
    let sled = posoka === 'ArrowDown' ? tr.nextElementSibling : tr.previousElementSibling;
    while (sled && !sled.classList.contains('red')) {
      sled = posoka === 'ArrowDown' ? sled.nextElementSibling : sled.previousElementSibling;
    }
    return sled?.querySelector<HTMLElement>(`[data-redakt][data-kolona="${kolona}"]`) ?? null;
  }
  const kletki = [...tr.querySelectorAll<HTMLElement>('[data-redakt]')];
  const i = kletki.indexOf(td);
  return kletki[posoka === 'ArrowRight' ? i + 1 : i - 1] ?? null;
}

/** Закача редакцията върху всички клетки с белег в корена · след всяко рисуване. */
export function zakachiRedaktsiya(koren: HTMLElement, k: KonteksNaEkrana): void {
  const otvori = (td: HTMLElement): void => {
    if (td.querySelector('.pole')) return;
    const beleg = razlozhiBeleg(td.dataset['redakt'] ?? '');
    if (beleg === null) return;
    const o = k.porta.ogledalo();
    const t = tablitsata(MODEL, beleg.tablitsa);
    const kol = kolonaNa(t, beleg.kolona);
    const tv = o.tablitsi.get(beleg.tablitsa);
    const i = tv?.indeks.get(beleg.id);
    if (kol === undefined || tv === undefined || i === undefined) return;
    const red = redKato(tv, i);
    const pole = poleZaKolona(o, kol, red.kletki[kol.klyuch] ?? null, red.kletki);
    td.replaceChildren(pole);
    pole.focus();
    if (pole instanceof HTMLInputElement) pole.select();
    let zapisva = false;

    const zapishi = async (): Promise<void> => {
      let kletka: Kletka | null;
      try {
        kletka = kletkaOtPoleto(kol, pole);
      } catch (g) {
        pokazhiGreshka(k.tyalo, dumiZaGreshka(g));
        return;
      }
      zapisva = true;
      const sledvashta = sasedna(td, 'ArrowDown');
      // ПРЕДИ записа: прерисуването идва от абонамента ВЪТРЕ в izpalni и чете белега тогава.
      fokusSled = sledvashta?.dataset['redakt'] ?? td.dataset['redakt'] ?? null;
      const r = await k.porta.izpalni(crypto.randomUUID(), 'red.popraviKletka', {
        tablitsa: beleg.tablitsa,
        id: beleg.id,
        kletki: { [beleg.kolona]: kletka },
      });
      if ('otkaz' in r) {
        zapisva = false;
        fokusSled = null;
        pokazhiGreshka(k.tyalo, r.zashto.join(' '));
        pole.focus();
        return;
      }
      pokazhiGreshka(k.tyalo, '');
      // Огледалото се смени · екранът се прерисува от абонамента; ако не (повторено), сами.
      if (r.povtoreno) k.prerisuvay();
    };
    naEnterIEscape(
      pole,
      () => void zapishi(),
      () => {
        zapisva = true;
        fokusSled = td.dataset['redakt'] ?? null;
        k.prerisuvay();
      },
    );
    pole.addEventListener('blur', () => {
      if (!zapisva) k.prerisuvay();
    });
  };

  koren.addEventListener('dblclick', (e) => {
    const td = (e.target as HTMLElement).closest<HTMLElement>('.kletka[data-redakt]');
    if (td) otvori(td);
  });
  koren.addEventListener('keydown', (e) => {
    const td = e.target as HTMLElement;
    if (!td.matches?.('.kletka[data-redakt]')) return;
    if (e.key === 'F2' || e.key === 'Enter') {
      e.preventDefault();
      otvori(td);
    } else if (e.key.startsWith('Arrow')) {
      const s = sasedna(td, e.key);
      if (s) {
        e.preventDefault();
        s.focus();
      }
    }
  });
}
