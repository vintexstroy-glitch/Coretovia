/**
 * КЛЕТКАТА С ДУМИ · как една клетка се ЧЕТЕ от човек, по вида на колоната.
 *
 * Едно място за екрана, за разликите в командите и за агента: избор → текстът
 * на стойността (плюс „· спряна", ако е спряна), връзка → името на реда, евро →
 * по нормите на валутата (`1 234,56 €`), площ → кв. м с два знака, число →
 * както е. Книгата взима от тук само ТЕКСТА на избора и името на връзката
 * (`tekstNaIzbora` · `imeNaReda`) — числата пише сама, без думи.
 */

import type { Kletka } from '../model/kletka.js';
import type { Kolona } from '../model/kolona.js';
import { tablitsata, tablitsaNaVrazkata } from '../model/model.js';
import { poNomer } from '../model/nomenklatura.js';
import { kolonaNa } from '../model/tablitsa.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { kletkaNa } from '../ogledalo/tablitsa.js';
import { pishi } from '../yadro/pari.js';
import { nomerNaRed, tekstNaNomera } from './nomeratsiya.js';

const SPRYANA = ' · спряна';

/** кв. см → кв. м · с два знака · закръглено веднъж, на стотни, за да няма „1,100" */
function kvSmKatoKvM(kvsm: number): string {
  const znak = kvsm < 0 ? '-' : '';
  const stotni = Math.round(Math.abs(kvsm) / 100);
  return `${znak}${Math.floor(stotni / 100)},${String(stotni % 100).padStart(2, '0')}`;
}

/** Името на ред, към който сочи връзка · първата текстова колона на таблицата (име Имот). */
export function imeNaReda(o: Ogledalo, tablitsa: string, id: string): string {
  const t = o.tablitsi.get(tablitsa);
  const i = t?.indeks.get(id);
  if (t === undefined || i === undefined) return id;
  const opis = tablitsata(o.model, tablitsa);
  const parvaTekstova = opis.koloni.find((k) => k.vid === 'tekst');
  const k = parvaTekstova === undefined ? null : kletkaNa(t, i, parvaTekstova.klyuch);
  return k !== null && 'tekst' in k && k.tekst !== '' ? k.tekst : id;
}

/**
 * Стойността на избор · `red` е целият ред, защото избор по белег (Видът) се
 * чете само заедно с колоната-белег (Категорията) на същия ред.
 */
function stoynostNaIzbora(
  o: Ogledalo,
  tablitsa: string,
  kolona: string,
  k: Kletka,
  red: Readonly<Record<string, Kletka>>,
): { readonly tekst: string; readonly spryana: boolean } | undefined {
  const opis = kolonaNa(tablitsata(o.model, tablitsa), kolona);
  if (opis === undefined || opis.vid !== 'izbor' || !('nomer' in k)) return undefined;
  const n = opis.nomenklatura === undefined ? undefined : o.nomenklaturi.get(opis.nomenklatura);
  const beleg = opis.belegOt === undefined ? undefined : red[opis.belegOt];
  const belezi =
    n?.podredbaPo !== undefined && beleg !== undefined && 'nomer' in beleg
      ? { [n.podredbaPo]: beleg.nomer }
      : {};
  const s = n === undefined ? undefined : poNomer(n, k.nomer, belezi);
  return s === undefined ? undefined : { tekst: s.tekst, spryana: s.spryana };
}

/** ТЕКСТЪТ на избора · без екранни думи · за Книгата и за сравнение. */
export function tekstNaIzbora(
  o: Ogledalo,
  tablitsa: string,
  kolona: string,
  k: Kletka | null,
  red: Readonly<Record<string, Kletka>> = {},
): string {
  if (k === null) return '';
  const s = stoynostNaIzbora(o, tablitsa, kolona, k, red);
  return s === undefined ? ('nomer' in k ? `№ ${k.nomer}` : '') : s.tekst;
}

/** Думите на една клетка · за екрана и за агента. */
export function dumiNaKletka(
  o: Ogledalo,
  tablitsa: string,
  kolona: string,
  k: Kletka | null,
  red: Readonly<Record<string, Kletka>> = {},
): string {
  if (k === null) return '';
  const opis = kolonaNa(tablitsata(o.model, tablitsa), kolona);
  if (opis === undefined) return String(Object.values(k)[0] ?? '');
  switch (opis.vid) {
    case 'evro':
      return 'stoynost_st' in k ? pishi(k.stoynost_st) : '';
    case 'chislo':
      if (!('chislo' in k)) return '';
      return opis.merka === 'kvsm' ? kvSmKatoKvM(k.chislo) : String(k.chislo);
    case 'protsent':
      return 'chislo' in k ? `${k.chislo} %` : '';
    case 'izbor': {
      const s = stoynostNaIzbora(o, tablitsa, kolona, k, red);
      if (s === undefined) return tekstNaIzbora(o, tablitsa, kolona, k, red);
      return s.spryana ? `${s.tekst}${SPRYANA}` : s.tekst;
    }
    case 'vrazka':
      return 'tekst' in k ? imeNaVrazkata(o, opis, k.tekst) : '';
    case 'tekst':
    case 'data':
      return 'tekst' in k ? k.tekst : '';
    case 'nomeratsiya':
      return '';
  }
}

/** Името на реда, към който сочи връзка · таблицата е по префикса на id-то. */
export function imeNaVrazkata(o: Ogledalo, kol: Kolona, id: string): string {
  const t = tablitsaNaVrazkata(o.model, kol, id);
  if (t === undefined) return id;
  const ime = imeNaReda(o, t.klyuch, id);
  if (ime !== id || t.nomeratsiya === undefined) return ime;
  // Обект и Бизнес нямат име · номерът им е адресът (3.1.1.27)
  const i = o.tablitsi.get(t.klyuch)?.indeks.get(id);
  return i === undefined ? id : tekstNaNomera(nomerNaRed(o, t.klyuch, i));
}
