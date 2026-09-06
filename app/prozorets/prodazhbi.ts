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
import {
  bazataENegova,
  IMENA_NA_VIDOVETE_OBEKT,
  NEGOVI_PARAMETRI,
  parametaraENegov,
  razhodniyatNeVodi,
} from '../../src/smetach/kalkulator/nastroyki.js';
import { otsenkata } from '../../src/smetach/kalkulator/stoynost.js';
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
    zavarshena: 'ЗАВЪРШЕНА · всичко е платено и Акт 16 е дошъл',
    aktivna: 'АКТИВНА · чака плащания или Акт 16',
    prazna: 'празна · още няма продажби',
  });

/** Петте вида, в реда на матрицата · за реда с базите под калкулатора. */
const VIDOVE_OBEKT_ZA_EKRANA = Object.keys(
  IMENA_NA_VIDOVETE_OBEKT,
) as (keyof typeof IMENA_NA_VIDOVETE_OBEKT)[];

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
    const klas = r.zavarshena ? ' zavarshena' : r.platena ? ' platena' : '';
    const chaka = r.chaka.length === 0 ? '' : ` data-chaka="${ekraniraj(r.chaka.join(' · '))}"`;
    return `<tr class="red${klas}"${chaka} data-id="${ekraniraj(r.id)}" data-tablitsa="${t.klyuch}" data-seq="${red.seq}">${tds}</tr>`;
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

  /**
   * КАЛКУЛАТОРЪТ · негово: „Добави и калкулатора над Продажбите."
   *
   * Стои НАД двете таблици и дава втора ценова колона до неговата: договорената
   * цена и ОЦЕНЕНАТА, една до друга, с разликата помежду им („А продава, Б
   * оценява"). Числата, които са НАШИ, се КАЗВАТ такива (ADR-012).
   */
  const kalkulatorHTML = (): string => {
    const ots = otsenkata(o, sega);
    const n = ots.nastroyki;
    const redove = ots.redove
      .map(
        (r) =>
          `<tr class="red" data-otsenka="${ekraniraj(r.id)}"><td class="kletka tekst" translate="no">${ekraniraj(r.ime)}</td><td class="kletka" data-vid="${ekraniraj(r.id)}" title="${r.poDumata === '' ? 'нито една дума не съвпадна · оценява се като „друго"' : `познат по думата „${ekraniraj(r.poDumata)}"`}">${ekraniraj(IMENA_NA_VIDOVETE_OBEKT[r.vid])}</td><td class="kletka chislo" translate="no">${ekraniraj(kvadrati(r.kvadratura))}</td><td class="kletka evro" translate="no">${ekraniraj(pishi(r.pazaren_st))}</td><td class="kletka evro" translate="no">${ekraniraj(pishi(r.dohoden_st))}</td><td class="kletka evro" translate="no">${ekraniraj(pishi(r.razhoden_st))}</td><td class="kletka evro" data-saglasuvana="${ekraniraj(r.id)}" translate="no">${ekraniraj(pishi(r.saglasuvane.tochno_st))}</td><td class="kletka evro" translate="no">${ekraniraj(pishi(r.dogovorena_st))}</td><td class="kletka evro ${r.razlika_st === 0 ? '' : r.razlika_st > 0 ? 'nad' : 'pod'}" data-razlika="${ekraniraj(r.id)}" translate="no">${ekraniraj(pishi(r.razlika_st))}</td></tr>`,
      )
      .join('');
    const bazi = VIDOVE_OBEKT_ZA_EKRANA.map(
      (vid) =>
        `${IMENA_NA_VIDOVETE_OBEKT[vid]} ${pishi(n.baza_st[vid])}/м² (${bazataENegova(vid) ? 'негово' : 'наше'})`,
    ).join(' · ');
    return `<section class="tablitsa-blok" data-blok="kalkulator">
        <h2 class="lenta">Калкулатор · Стойност на Състояние</h2>
        <p class="pod-tablitsata" data-kalkulator-dumi>Оценява се по ТРИ подхода и се съгласува с тегла ${n.tegla.pazaren_bt / 100} / ${n.tegla.dohoden_bt / 100} / ${n.tegla.razhoden_bt / 100} на сто (пазарен · доходен · разходен). Разходният НЕ води в нито един случай: ${razhodniyatNeVodi(n.tegla) ? 'държи се' : 'НАРУШЕНО'}.</p>
        <table class="reshetka kalkulator" data-reshetka="kalkulator">
          <thead><tr><th>обект</th><th>вид</th><th>кв. м</th><th title="площ × база по вид">пазарен</th><th title="очакван наем ÷ доходност">доходен</th><th title="земя + строителна − овехтяване">разходен</th><th>ОЦЕНЕНА</th><th>договорена</th><th>разлика</th></tr></thead>
          <tbody class="tablitsa">${redove}</tbody>
          <tfoot><tr class="sbor"><td colspan="6">ОБЩО</td><td class="evro" data-otseneni translate="no">${ekraniraj(pishi(ots.otseneni_st))}</td><td class="evro" data-dogovoreni translate="no">${ekraniraj(pishi(ots.dogovoreni_st))}</td><td class="evro" data-razlikata translate="no">${ekraniraj(pishi(ots.razlika_st))}</td></tr></tfoot>
        </table>
        <p class="pod-tablitsata" data-kalkulator-chii>Базите: ${ekraniraj(bazi)}. Разходните шест числа са НАШИ и проучени (земя ${pishi(n.zemya_st_kvm.apartament)}/м² · строителна ${pishi(n.stroitelna_st_kvm.apartament)}/м² · полезен живот ${n.polezen_zhivot_g} г. · възраст ${n.vazrast_g} г.); негови сред тях са ${NEGOVI_PARAMETRI.length === 0 ? 'НИТО ЕДНО' : NEGOVI_PARAMETRI.filter((x) => parametaraENegov(x)).join(' · ')}.</p>
        ${
          ots.otpadnali.length === 0
            ? ''
            : `<p class="pod-tablitsata" data-otpadnali>Отпаднали подходи (нулева стойност, теглото им е пренасочено): ${ekraniraj(ots.otpadnali.join(' · '))}.</p>`
        }
      </section>`;
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
        <p class="pod-tablitsata" data-sastoyanie="${s.klyuch}">${ekraniraj(DUMI_NA_SASTOYANIETO[s.sastoyanie])} · платени ${s.platenite} от ${s.redove.length} · с Акт 16 ${s.zavarshenite} · остатък <span translate="no">${ekraniraj(pishi(s.ostatak))}</span>${
          s.platenite > s.zavarshenite
            ? ` · ${s.platenite - s.zavarshenite} платени чакат Акт 16`
            : ''
        }</p>
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
    ${kalkulatorHTML()}
    ${v.tablitsi.map(tablitsaHTML).join('')}
    <p class="pod-tablitsata" data-proverkite>Проверката е СМЕТНАТА: цена минус вноските от същата страна. Продажба с нулев остатък е ПЛАТЕНА; ЗАВЪРШЕНА е онази, при която е дошъл и Акт 16 (негово, 05.09). Нулата значи платено и се записва като сверка (правило 7). Колоната „Ключ" стои в ${ekraniraj(String(KLYUCH_KOLONA_PRODAZHBI))}-та колона на листа, скрита.</p>
    ${iznosVestHTML()}`;

  zakachiZebrata(k.tyalo);
  zakachiReshetkata(k);

  zakachiButonite(k, 'prodazhbi', TABLITSA_NA_BUTONA);
}
