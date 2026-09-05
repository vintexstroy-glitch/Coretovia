/**
 * РЕШЕТКАТА · една таблица от Модела, нарисувана от Огледалото.
 *
 * Нищо тук не е код по таблица: главата идва от колоните, редовете — от
 * номерацията и групите, думите в клетките — от `dumiNaKletka`. Клетката
 * ОБЯВЯВА какво е (правило 16): `data-redakt="таблица·id·колона"` носят само
 * отворените колони, `data-surovo` — стойността от модела, `data-st` — центовете.
 * Затворена колона (номерацията) няма белег и не се отваря.
 *
 * Редовете са `tr.red` в `tbody.tablitsa`, групите — `tr.grupata`: точно
 * децата, които зебрата (`zebra.ts`) брои.
 */

import { tablitsata } from '../../src/model/model.js';
import type { Kolona } from '../../src/model/kolona.js';
import { koloniNaReda } from '../../src/model/tablitsa.js';
import type { Ogledalo } from '../../src/ogledalo/ogledalo.js';
import { type Red, redKato, zhiviteRedove } from '../../src/ogledalo/tablitsa.js';
import { dumiNaKletka } from '../../src/smetach/kletki.js';
import {
  grupiPoImotIKategoriya,
  nomerNaRed,
  podrediPoNomer,
  tekstNaNomera,
} from '../../src/smetach/nomeratsiya.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { ekraniraj } from './obshto.js';
import { fokusiraySled, zakachiRedaktsiya } from './redaktsiya.js';
import { zakachiZebrata } from './zebra.js';

const SPRYANA_DUMA = ' · спряна';

/** Една клетка · и за дървото на Управление, което има свои глави, но същите клетки. */
export function kletkaHTML(
  o: Ogledalo,
  tablitsa: string,
  k: Kolona,
  r: Red,
  bezRedaktsiya = false,
): string {
  if (k.vid === 'nomeratsiya') {
    return `<td class="kletka nomer" data-kolona="${k.klyuch}" translate="no">${tekstNaNomera(nomerNaRed(o, tablitsa, r.i))}</td>`;
  }
  const kletka = r.kletki[k.klyuch] ?? null;
  const dumi = dumiNaKletka(o, tablitsa, k.klyuch, kletka, r.kletki);
  const surovo = kletka === null ? '' : String(Object.values(kletka)[0] ?? '');
  const st =
    k.vid === 'evro' && kletka !== null && 'stoynost_st' in kletka
      ? ` data-st="${kletka.stoynost_st}"`
      : '';
  const spryana = dumi.endsWith(SPRYANA_DUMA);
  const redakt =
    k.zatvorena || bezRedaktsiya
      ? ''
      : ` data-redakt="${tablitsa}·${ekraniraj(r.id)}·${k.klyuch}" tabindex="0"`;
  const podskazka = spryana ? ' title="спряна от Настройки · старите редове я пазят"' : '';
  return `<td class="kletka ${k.vid}${spryana ? ' spryana' : ''}" data-kolona="${k.klyuch}" data-surovo="${ekraniraj(surovo)}"${st}${redakt}${podskazka} translate="no">${ekraniraj(dumi)}</td>`;
}

/** Таблицата като HTML · с групите, живите редове и (по избор) изключените. */
export function reshetkaHTML(o: Ogledalo, tablitsa: string, pokazhiIzklyuchenite: boolean): string {
  const t = tablitsata(o.model, tablitsa);
  const tv = o.tablitsi.get(tablitsa);
  if (tv === undefined) return '';
  const koloni = koloniNaReda(t);
  const glava = `<thead><tr>${koloni
    .map((k) => `<th data-kolona="${k.klyuch}" class="${k.vid}">${ekraniraj(k.ime)}</th>`)
    .join('')}</tr></thead>`;
  const redHTML = (i: number): string => {
    const r = redKato(tv, i);
    return `<tr class="red${r.izklyuchen ? ' izklyuchen' : ''}" data-id="${ekraniraj(r.id)}" data-tablitsa="${tablitsa}" data-seq="${r.seq}">${koloni
      .map((k) => kletkaHTML(o, tablitsa, k, r))
      .join('')}</tr>`;
  };
  let tyalo = '';
  if (t.grupirane?.some((g) => g.vKletkataNa !== undefined)) {
    for (const g of grupiPoImotIKategoriya(o, [tablitsa])) {
      const nomer = `${tekstNaNomera(g.imotNomer)}.${g.kategoriya}`;
      tyalo += `<tr class="grupata" data-grupa="${ekraniraj(g.imotId)}·${g.kategoriya}"><td colspan="${koloni.length}" translate="no">${nomer} · ${ekraniraj(g.imotIme)} · ${ekraniraj(g.kategoriyaTekst)}</td></tr>`;
      for (const r of g.redove) tyalo += redHTML(r.i);
    }
  } else {
    for (const r of podrediPoNomer(o, tablitsa)) tyalo += redHTML(r.i);
  }
  const zhivi = zhiviteRedove(tv).length;
  const izklyucheni = tv.broy - zhivi;
  if (pokazhiIzklyuchenite) {
    for (let i = 0; i < tv.broy; i += 1) if (tv.izklyuchen[i] === 1) tyalo += redHTML(i);
  }
  return (
    `<table class="reshetka" data-reshetka="${tablitsa}">${glava}<tbody class="tablitsa">${tyalo}</tbody></table>` +
    `<p class="pod-tablitsata" data-sverka="${tablitsa}">живи ${zhivi} · изключени ${izklyucheni} · всички ${tv.broy}</p>`
  );
}

/**
 * ОБЩОТО ЗАКАЧАНЕ на един прозорец с решетка · зебрата, редакцията в клетка и
 * фокусът след прерисуване. Четири прозореца правеха трите реда еднакво; домът
 * им е един (правило 17).
 */
export function zakachiReshetkata(k: KonteksNaEkrana): void {
  zakachiZebrata(k.tyalo);
  zakachiRedaktsiya(k.tyalo, k);
  fokusiraySled(k.tyalo);
}
