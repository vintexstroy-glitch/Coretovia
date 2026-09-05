/**
 * ПРОДАЖБИ · прозорецът на листа „Продажби" (ADR-010).
 *
 * Двете му таблици, всяка с лентата си дословно (A3 · A60), с главите си и с
 * НЕГОВИЯ ред „ОБЩО евро" отдолу. Над тях: полетата с цифри, както в Управление
 * и Сметки, и СЪСТОЯНИЕТО на всяка таблица — негово: „едната таблица е завършила
 * и всичко е платено, а другата е с Активни продажби които чакат плащания".
 *
 * Проверките („проверка банка" · „проверка кеш") са СМЕТНАТИ: цената минус
 * вноските от същата страна. Затворена колона не се редактира от никого
 * (правило 23), затова те се рисуват без `data-redakt` и се виждат наравно с
 * останалите — скритото пак се смята, а сметнатото се показва.
 */

import { KLYUCH_KOLONA_PRODAZHBI } from '../../src/kniga/dumi.js';
import { DUMI_OT_KNIGATA } from '../../src/model/dumi-ot-knigata.js';
import { tablitsata } from '../../src/model/model.js';
import { MODEL } from '../../src/model/osnova.js';
import { redKato } from '../../src/ogledalo/tablitsa.js';
import {
  evroZaKvadrat,
  IMENA_NA_STRANITE_NA_PLASHTANE,
  type Prodazhba,
  prodazhbite,
  type TablitsaNaProdazhbite,
} from '../../src/smetach/prodazhbi.js';
import { pishi } from '../../src/yadro/pari.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { otvoriChernova, zakachiButonite } from '../reshetka/chernova.js';
import { ekraniraj } from '../reshetka/obshto.js';
import { kletkaHTML, zakachiReshetkata } from '../reshetka/reshetka.js';
import { zakachiZebrata } from '../reshetka/zebra.js';
import { butoniteHTML, iznosVestHTML } from './deystviya.js';
import { dumiteHTML } from './profil.js';

/** Кой бутон коя таблица отваря · двете му сгради. */
const TABLITSA_NA_BUTONA: Readonly<Record<string, string>> = Object.freeze({
  'prodazhbi.dobaviParva': 'prodazhbi',
  'prodazhbi.dobaviVtora': 'prodazhbi2',
});

const DUMI_NA_SASTOYANIETO: Readonly<Record<TablitsaNaProdazhbite['sastoyanie'], string>> =
  Object.freeze({
    zavarshena: 'ЗАВЪРШЕНА · всичко е платено',
    aktivna: 'АКТИВНА · чака плащания',
    prazna: 'празна · още няма продажби',
  });

/** Квадратурата се пише в кв. м · числото се пази в цели кв. см. */
function kvadrati(kvsm: number): string {
  return (kvsm / 10000).toFixed(2).replace('.', ',');
}

export function narisuvayProdazhbi(k: KonteksNaEkrana): void {
  const o = k.porta.ogledalo();
  const butoni = k.porta.butoniZa('prodazhbi').filter((b) => b.myasto === 'buton');
  const sega = new Date().toISOString();
  const v = prodazhbite(o, sega);

  const poletaHTML = (): string => {
    const sredno =
      v.tsena === 0
        ? 0
        : evroZaKvadrat(
            v.tsena,
            v.tablitsi.reduce((s, t) => s + t.kvadratura, 0),
          );
    const poleta: readonly { klyuch: string; ime: string; tekst: string }[] = [
      { klyuch: 'broy', ime: 'продажби', tekst: String(v.broy) },
      { klyuch: 'tsena', ime: 'обща цена', tekst: pishi(v.tsena) },
      { klyuch: 'vneseno', ime: 'внесено', tekst: pishi(v.vneseno) },
      { klyuch: 'ostatak', ime: 'остатък', tekst: pishi(v.ostatak) },
      { klyuch: 'evro-kvadrat', ime: 'евро/квадрат', tekst: pishi(sredno) },
    ];
    return poleta
      .map(
        (x) =>
          `<div class="pole-tsifra"><span class="tsifra" data-tsifra="${x.klyuch}" translate="no">${ekraniraj(x.tekst)}</span><span class="ime">${ekraniraj(x.ime)}</span></div>`,
      )
      .join('');
  };

  /** Един ред · сметнатите проверки стоят до записаните колони. */
  const redHTML = (t: ReturnType<typeof tablitsata>, r: Prodazhba): string => {
    const tv = o.tablitsi.get(t.klyuch)!;
    const red = redKato(tv, r.i);
    const tds = t.koloni
      .map((kol) => {
        const pl = kol.plashtane;
        if (pl?.rolya === 'proverka') {
          const ostatak = r.strani.find((x) => x.strana === pl.strana)?.ostatak ?? 0;
          const duma = IMENA_NA_STRANITE_NA_PLASHTANE[pl.strana];
          return `<td class="kletka evro smetnata${ostatak === 0 ? ' platena' : ''}" data-kolona="${kol.klyuch}" data-proverka="${ekraniraj(r.id)}·${pl.strana}" title="сметнато: цена ${ekraniraj(duma)} − вноските ${ekraniraj(duma)}" translate="no">${ekraniraj(pishi(ostatak))}</td>`;
        }
        return kletkaHTML(o, t.klyuch, kol, red);
      })
      .join('');
    return `<tr class="red${r.platena ? ' platena' : ''}" data-id="${ekraniraj(r.id)}" data-tablitsa="${t.klyuch}" data-seq="${red.seq}">${tds}</tr>`;
  };

  /** Редът му „ОБЩО евро" · сборовете по колона, сметнати в цели центове. */
  const obshtoHTML = (t: ReturnType<typeof tablitsata>, s: TablitsaNaProdazhbite): string => {
    const tds = t.koloni
      .map((kol, i) => {
        if (i === 0) return `<td class="kletka">ОБЩО евро</td>`;
        const sbor = s.obshto[kol.klyuch];
        if (sbor === undefined) return '<td class="kletka"></td>';
        const tekst = kol.merka === 'kvsm' ? kvadrati(sbor) : pishi(sbor);
        return `<td class="kletka ${kol.vid}" data-obshto="${kol.klyuch}" translate="no">${ekraniraj(tekst)}</td>`;
      })
      .join('');
    return `<tr class="sbor">${tds}</tr>`;
  };

  const tablitsaHTML = (s: TablitsaNaProdazhbite): string => {
    const t = tablitsata(MODEL, s.klyuch);
    const glavi = t.koloni
      .map(
        (kol) =>
          `<th data-kolona="${kol.klyuch}" class="${kol.vid}" title="${ekraniraj(kol.ime)}">${ekraniraj(kol.kratko ?? kol.ime)}</th>`,
      )
      .join('');
    return `<section class="tablitsa-blok" data-blok="${s.klyuch}">
        <h2 class="lenta" translate="no">${ekraniraj(s.ime)}</h2>
        <p class="pod-tablitsata" data-sastoyanie="${s.klyuch}">${ekraniraj(DUMI_NA_SASTOYANIETO[s.sastoyanie])} · платени ${s.platenite} от ${s.redove.length} · остатък <span translate="no">${ekraniraj(pishi(s.ostatak))}</span></p>
        <div class="pregled">
          <table class="reshetka prodazhbi" data-reshetka="${s.klyuch}">
            <thead><tr>${glavi}</tr></thead>
            <tbody class="tablitsa">${s.redove.map((r) => redHTML(t, r)).join('')}</tbody>
            <tfoot>${obshtoHTML(t, s)}</tfoot>
          </table>
        </div>
      </section>`;
  };

  k.tyalo.innerHTML = `
    <div class="zalepeno">
      <div class="poleta" data-poleta>${poletaHTML()}</div>
      <div class="deystviya" data-deystviya>
        ${butoniteHTML(butoni)}
        <button type="button" class="vtorichen" data-zapazi-kniga>Запази книгата</button>
      </div>
    </div>
    <p class="greshka" data-greshka></p>
    ${dumiteHTML(DUMI_OT_KNIGATA.prodazhbi)}
    ${v.tablitsi.map(tablitsaHTML).join('')}
    <p class="pod-tablitsata" data-proverkite>Проверката е СМЕТНАТА: цена минус вноските от същата страна. Нулата значи платено и се записва като сверка (правило 7). Колоната „Ключ" стои в ${ekraniraj(String(KLYUCH_KOLONA_PRODAZHBI))}-та колона на листа, скрита.</p>
    ${iznosVestHTML()}`;

  zakachiZebrata(k.tyalo);
  zakachiReshetkata(k);

  zakachiButonite(k, 'prodazhbi', TABLITSA_NA_BUTONA);
}
