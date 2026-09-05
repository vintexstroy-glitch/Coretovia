/**
 * СМЕТКИ · прозорецът на листа „Сметки" (ADR-006).
 *
 * Негово (B9): „Видима част която седи залепена горе и под нея започват
 * таблиците." И от 05.09 т.2: „В смевтки освен реда с полетата и информация от
 * самия таб и ред на бутоните има и ред на реда на бутоните като 2ред от трите,
 * ойто ред дава възможност за въвеждане на информация за дадени Кеш пари за
 * Заплати и Фактури Кеш и сверка на края на месеца от извлечението." Затова
 * залепената част тук е ТРИ реда: полета с цифри · редът за КЕШ · бутоните.
 *
 * Под нея — неговите две ленти: ПРИХОД и Разходи, всяка със секциите си и с ред
 * ОБЩ; после секцията „Вкарване" (негово т.3: Заплати Кеш · Фактури Кеш ·
 * Фактури Карта на едно място, за Помощник Управителя — правото му идва с
 * резен 4 и се КАЗВА); и диаграмата Гант по месеца на движенията.
 *
 * ЗНАКЪТ решава страната (правило 20): екранът пише знака сам, когато секцията е
 * разходна, за да не го смята човек наум; Портата пак го проверява.
 */

import { DUMI_OT_KNIGATA } from '../../src/model/dumi-ot-knigata.js';
import type { Kletka } from '../../src/model/kletka.js';
import { tablitsata } from '../../src/model/model.js';
import {
  BUTONI_NA_UPRAVLENIE,
  type ButonNaProzoretsa,
  MODEL,
  PROZORTSI,
} from '../../src/model/osnova.js';
import { slotNaKolonata } from '../../src/model/kolona.js';
import { kolonaNa } from '../../src/model/tablitsa.js';
import { redKato } from '../../src/ogledalo/tablitsa.js';
import { broyPokrivashti, lentaNa, sboroveVKolonite } from '../../src/smetach/gant.js';
import { imeNaVrazkata } from '../../src/smetach/kletki.js';
import {
  IMENA_NA_STRANITE,
  keshatNaMeseca,
  type Sektsiya,
  smetkite,
  type Strana,
  vkarvaneto,
} from '../../src/smetach/smetki.js';
import { ddsat, type MesetsNaDdsa } from '../../src/smetach/dds.js';
import { nahodkiteNaNap, NIVA } from '../../src/smetach/nahodki-nap.js';
import { mozheDaRedaktira } from '../../src/smetach/pravo.js';
import { koloniNaTakta } from '../../src/smetach/vreme.js';
import { pishi, pishiVPole } from '../../src/yadro/pari.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { otvoriChernova } from '../reshetka/chernova.js';
import { gantSVG, type RedNaGanta } from '../reshetka/gant-svg.js';
import { ekraniraj } from '../reshetka/obshto.js';
import { chetiEkranno, zapomniEkranno } from '../reshetka/pamet-ekran.js';
import { podtaboveHTML, tekushtPodtab, zakachiPodtabove } from '../reshetka/podtabove.js';
import { pokazhiGreshka } from '../reshetka/redaktsiya.js';
import { kletkaHTML, zakachiReshetkata } from '../reshetka/reshetka.js';
import {
  gantIDumiHTML,
  izpalniOtMenyuto,
  otgovoratNaPortata,
  zakachiDyasnoMenyu,
  zapaziKnigata,
} from './deystviya.js';

const TABLITSA = 'dvizheniya';
const PAMET = Object.freeze({
  mesets: 'smetki.mesets',
  samoMeseca: 'smetki.samoMeseca',
  podtab: 'smetki.podtab',
});
/** неговият „таб НАП" е ПОДТАБ на Сметки (05.09 т.2) · осемте прозореца остават осем */
const PODTABOVE = [
  { klyuch: 'smetki', ime: 'Сметки' },
  { klyuch: 'nap', ime: 'НАП' },
] as const;
/** колоните на ДДС на екрана · месецът и неговите числа */
const KOLONI_NA_DDSA = [
  'mesets',
  'nachislen',
  'kredit',
  'deklarirano',
  'plateno',
  'izdadeni',
  'plateni',
] as const;
/** колоните на движението на екрана · неговите глави са дълги, тук стоят кратките */
const KOLONI = ['kam', 'ime', 'funktsiya', 'sastoyanie', 'mesets', 'suma'] as const;
const SHIRINA_NA_TAKTA = 36;

function mesetsatSega(): string {
  return new Date().toISOString().slice(0, 7);
}

/** лицето на бутона · до първата скоба · неговата дума */
function litse(b: ButonNaProzoretsa): string {
  return b.ime.split('(')[0]!.trim();
}

interface RedNaEkrana {
  readonly id: string;
  readonly i: number;
  readonly mesets: string;
  readonly suma: number;
  readonly ime: string;
}

export function narisuvaySmetki(k: KonteksNaEkrana): void {
  const o = k.porta.ogledalo();
  const p = PROZORTSI.find((x) => x.klyuch === 'smetki')!;
  const t = tablitsata(MODEL, TABLITSA);
  const tv = o.tablitsi.get(TABLITSA);
  const kogato = new Date().toISOString();
  const mesets = chetiEkranno<string>(PAMET.mesets, mesetsatSega());
  const samoMeseca = chetiEkranno<boolean>(PAMET.samoMeseca, false);
  const s = smetkite(o, kogato, samoMeseca ? (m) => m === mesets : undefined);
  const kesh = keshatNaMeseca(o, mesets, kogato);
  const v = vkarvaneto(o, kogato, samoMeseca ? (m) => m === mesets : undefined);
  const podtab = tekushtPodtab(PAMET.podtab, PODTABOVE);
  // ДДС · редът на всеки месец влиза в СМЕТКИ по знака си (негово, 05.09 т.2)
  const dds = ddsat(o, kogato);
  const ddsMesetsi = dds.mesetsi.filter((m) => !samoMeseca || m.mesets === mesets);
  const ddsNa = (strana: Strana): readonly MesetsNaDdsa[] =>
    ddsMesetsi.filter((m) => m.strana === strana);
  const ddsSbor = (strana: Strana): number => ddsNa(strana).reduce((a, m) => a + m.suma, 0);
  const sborPrihod = s.sborPrihod + ddsSbor('prihod');
  const sborRazhod = s.sborRazhod + ddsSbor('razhod');
  const nap = nahodkiteNaNap(o, `${mesets}-01`, kogato);
  const nesvereni = [...s.prihod, ...s.razhod]
    .flatMap((x) => x.redove)
    .filter((r) => {
      const kl = tv === undefined ? null : redKato(tv, r.i).kletki['sastoyanie'];
      return kl === undefined || kl === null;
    }).length;

  const poleta = [
    { klyuch: 'prihod', ime: 'Приход', dumi: pishi(sborPrihod) },
    { klyuch: 'razhod', ime: 'Разходи', dumi: pishi(sborRazhod) },
    { klyuch: 'rezultat', ime: 'Резултат', dumi: pishi(sborPrihod + sborRazhod) },
    { klyuch: 'kesh-dadeno', ime: 'Кеш дадено', dumi: pishi(kesh.dadeno) },
    { klyuch: 'kesh-izvlechenie', ime: 'Кеш изтеглено', dumi: pishi(kesh.izvlechenie) },
    { klyuch: 'kesh-vkarano', ime: 'Кеш вкарано', dumi: pishi(Math.abs(kesh.vkarano)) },
    { klyuch: 'dvizheniya', ime: 'движения', dumi: String(s.broyDvizheniya) },
    { klyuch: 'nesvereni', ime: 'несверени', dumi: String(nesvereni) },
    { klyuch: 'dds-ostatak', ime: 'ДДС остатък', dumi: pishi(dds.ostatak) },
    { klyuch: 'nap-nahodki', ime: 'находки НАП', dumi: String(nap.nahodki.length) },
  ];

  // ПРАВОТО стеснява „Вкарване": неговото D19 дава на Помощник Управителя точно
  // трите секции; който няма правото, ГЛЕДА (правило 23 · ADR-008)
  const mozhePriVkarvane = v.sektsii.every((sek) => mozheDaRedaktira(o, k.aktor(), sek.tekst));

  /** Един ред с пари · клетките са редактируеми на място, както в дървото. */
  const redHTML = (r: RedNaEkrana, samoGledane = false): string => {
    const red = redKato(tv!, r.i);
    const tds = KOLONI.map((klyuch) => {
      const kol = kolonaNa(t, klyuch);
      if (kol === undefined) return '<td class="kletka prazna"></td>';
      if (klyuch === 'kam') {
        const kl = red.kletki['kam'] ?? null;
        const dumi = kl !== null && 'tekst' in kl ? imeNaVrazkata(o, kol, kl.tekst) : '';
        return `<td class="kletka vrazka" data-kolona="kam" data-redakt="${TABLITSA}·${ekraniraj(r.id)}·kam" tabindex="0" translate="no">${ekraniraj(dumi)}</td>`;
      }
      return kletkaHTML(o, TABLITSA, kol, red, samoGledane);
    }).join('');
    return `<tr class="red" data-id="${ekraniraj(r.id)}" data-tablitsa="${TABLITSA}" data-seq="${red.seq}">${tds}</tr>`;
  };

  const sektsiyaHTML = (sek: Sektsiya, samoGledane = false): string =>
    `<tr class="grupata sektsiya" data-sektsiya="${sek.strana}·${sek.nomer}">
        <td colspan="${KOLONI.length - 1}" translate="no">${ekraniraj(sek.tekst)}</td>
        <td class="evro" data-sbor-sektsiya="${sek.strana}·${sek.nomer}" translate="no">${ekraniraj(pishi(sek.sbor))}</td>
      </tr>${sek.redove
        .map((r) =>
          redHTML(
            {
              id: r.id,
              i: r.i,
              mesets: r.mesets,
              suma: r.suma_st,
              ime: sek.tekst,
            },
            samoGledane,
          ),
        )
        .join('')}`;

  const vsichkiKoloni = t.koloni.filter((kol) => slotNaKolonata(kol) !== undefined);
  const glaviHTML = KOLONI.map((klyuch) => {
    const kol = kolonaNa(t, klyuch);
    return `<th data-kolona="${klyuch}" class="${kol?.vid ?? ''}" title="${ekraniraj(kol?.ime ?? '')}">${ekraniraj(kol?.kratko ?? kol?.ime ?? '')}</th>`;
  }).join('');

  /** Редът на ДДС в лентата · СМЯТА се от таблицата, не е движение (една истина). */
  const ddsHTML = (strana: Strana): string => {
    const redove = ddsNa(strana);
    if (redove.length === 0) return '';
    return `<tr class="grupata sektsiya dds" data-sektsiya="${strana}·ддс">
        <td colspan="${KOLONI.length - 1}" translate="no">ДДС</td>
        <td class="evro" data-sbor-dds="${strana}" translate="no">${ekraniraj(pishi(ddsSbor(strana)))}</td>
      </tr>${redove
        .map(
          (m) =>
            `<tr class="red dds" data-dds="${ekraniraj(m.mesets)}"><td class="kletka" colspan="${KOLONI.length - 2}" translate="no">ДДС ${ekraniraj(m.mesets)} · ${m.strana === 'razhod' ? 'за внасяне' : 'за възстановяване'}</td><td class="kletka tekst" translate="no">${ekraniraj(m.mesets)}</td><td class="kletka evro" translate="no">${ekraniraj(pishi(m.suma))}</td></tr>`,
        )
        .join('')}`;
  };

  const stranaHTML = (strana: Strana, sektsii: readonly Sektsiya[], sbor: number): string => `
    <section class="tablitsa-blok" data-blok="${strana}">
      <h2 class="lenta" translate="no">${ekraniraj(IMENA_NA_STRANITE[strana])}</h2>
      <table class="reshetka smetki" data-reshetka="${strana}">
        <thead><tr>${glaviHTML}</tr></thead>
        <tbody class="tablitsa">${sektsii.map((sek) => sektsiyaHTML(sek)).join('')}${ddsHTML(strana)}</tbody>
        <tfoot><tr class="sbor"><td colspan="${KOLONI.length - 1}">ОБЩ ${ekraniraj(IMENA_NA_STRANITE[strana])}</td><td class="evro" data-sbor="${strana}" translate="no">${ekraniraj(pishi(sbor))}</td></tr></tfoot>
      </table>
    </section>`;

  const butonHTML = (b: ButonNaProzoretsa): string => {
    const d = b.deystvie;
    if (d.vid === 'idva')
      return `<button type="button" class="malak" data-buton-ekran="${b.klyuch}" disabled title="${ekraniraj(d.dumi ?? `идва с резен ${d.rezen}`)}">${ekraniraj(litse(b))}</button>`;
    const duma =
      b.klyuch === 'skriy-dela'
        ? 'Дела · в Управление'
        : b.klyuch === 'skriy-razhodi' || b.klyuch === 'skriy-prihodi'
          ? litse(b)
          : litse(b);
    return `<button type="button" class="malak" data-buton-ekran="${b.klyuch}" title="${ekraniraj(b.ime)}">${ekraniraj(duma)}</button>`;
  };

  /** Подтабът НАП · ДДС по месеци и таблицата с находки (негово, 05.09 т.2). */
  const napHTML = (): string => {
    const tDds = tablitsata(MODEL, 'dds');
    const tvDds = o.tablitsi.get('dds');
    // полетата НОСЯТ числата на месеца · иначе вторият запис би изтрил останалите
    // (командата пише целия ред: празно поле значи празна клетка)
    const zaMeseca = dds.mesetsi.find((m) => m.mesets === mesets);
    const vPoleto = (chislo: number | undefined): string =>
      chislo === undefined || chislo === 0 ? '' : pishiVPole(chislo);
    const glavi = KOLONI_NA_DDSA.map((klyuch) => {
      const kol = kolonaNa(tDds, klyuch);
      return `<th data-kolona="${klyuch}" class="${kol?.vid ?? ''}">${ekraniraj(kol?.ime ?? '')}</th>`;
    }).join('');
    const redove = dds.mesetsi
      .map((m) => {
        const red = redKato(tvDds!, m.i);
        const tds = KOLONI_NA_DDSA.map((klyuch) => {
          const kol = kolonaNa(tDds, klyuch);
          return kol === undefined ? '<td></td>' : kletkaHTML(o, 'dds', kol, red);
        }).join('');
        return `<tr class="red" data-id="${ekraniraj(m.id)}" data-tablitsa="dds" data-seq="${red.seq}">${tds}<td class="kletka evro" data-dalzhimo="${ekraniraj(m.mesets)}" translate="no">${ekraniraj(pishi(m.dalzhimo))}</td><td class="kletka evro" data-ostatak="${ekraniraj(m.mesets)}" translate="no">${ekraniraj(pishi(m.ostatak))}</td></tr>`;
      })
      .join('');
    return `<section class="tablitsa-blok" data-blok="nap">
      <h2 class="lenta" translate="no">ДДС по месеци</h2>
      <form class="red-kesh" data-dds-forma>
        <label class="malak">месец <input class="pole malak" data-dds-mesets value="${ekraniraj(mesets)}" size="7"></label>
        <label class="malak">начислен <input class="pole malak" data-dds-nachislen value="${vPoleto(zaMeseca?.nachislen)}" inputmode="decimal"></label>
        <label class="malak">данъчен кредит <input class="pole malak" data-dds-kredit value="${vPoleto(zaMeseca?.kredit)}" inputmode="decimal"></label>
        <label class="malak">декларирано <input class="pole malak" data-dds-deklarirano value="${vPoleto(zaMeseca?.deklarirano)}" inputmode="decimal"></label>
        <label class="malak">платено <input class="pole malak" data-dds-plateno value="${vPoleto(zaMeseca?.plateno)}" inputmode="decimal"></label>
        <button type="submit" class="malak" data-dds-zapishi>Запиши ДДС</button>
        <span class="vest" translate="no">дължимо = начислен − кредит · остатък = дължимо − платено</span>
      </form>
      <table class="reshetka smetki" data-reshetka="dds">
        <thead><tr>${glavi}<th class="evro">дължимо</th><th class="evro">остатък</th></tr></thead>
        <tbody class="tablitsa">${redove}</tbody>
        <tfoot><tr class="sbor"><td colspan="${KOLONI_NA_DDSA.length}">натрупване</td><td class="evro" data-dds-dalzhimo translate="no">${ekraniraj(pishi(dds.dalzhimo))}</td><td class="evro" data-dds-ostatak translate="no">${ekraniraj(pishi(dds.ostatak))}</td></tr></tfoot>
      </table>
      <h2 class="lenta" translate="no">Находки от сверките</h2>
      <p class="pod-tablitsata" data-nap-obobshtenie>${nap.nahodki.length} находки от ${nap.proverki} проверки на три нива: ${NIVA.join(' · ')}. Няма връзка с НАП (негово) — това е инструмент за счетоводителя. Износът за Микроинвест чака файл-мостра от него.</p>
      ${
        nap.nahodki.length === 0
          ? '<p class="vest" data-nap-nyama>няма находки · всички сверки затварят</p>'
          : `<table class="tablitsa" data-nap-nahodki>
        <thead><tr><th>ниво</th><th>проверка</th><th>адрес</th><th>какво</th></tr></thead>
        <tbody>${nap.nahodki
          .map(
            (n) =>
              `<tr class="red" data-nahodka="${ekraniraj(n.proverka)}"><td>${ekraniraj(n.nivo)}</td><td translate="no">${ekraniraj(n.proverka)}</td><td translate="no">${ekraniraj(n.adres)}</td><td translate="no">${ekraniraj(n.kakvo)}</td></tr>`,
          )
          .join('')}</tbody>
      </table>`
      }
    </section>`;
  };

  k.tyalo.innerHTML = `
    <div class="zalepeno" data-zalepeno="smetki">
      <div class="poleta-s-tsifri" data-poleta>
        ${poleta
          .map(
            (pl) =>
              `<div class="pole-s-tsifra" data-pole="${pl.klyuch}"><span class="tsifra" data-tsifra="${pl.klyuch}" translate="no">${ekraniraj(pl.dumi)}</span><span class="ime">${ekraniraj(pl.ime)}</span></div>`,
          )
          .join('')}
      </div>
      <form class="red-kesh" data-kesh-forma>
        <label class="malak">месец <input class="pole malak" data-kesh-mesets value="${ekraniraj(mesets)}" size="7"></label>
        <label class="malak">дадени за Заплати Кеш <input class="pole malak" data-kesh-zaplati value="${kesh.zaplati === 0 ? '' : pishiVPole(kesh.zaplati)}" inputmode="decimal"></label>
        <label class="malak">дадени за Фактури Кеш <input class="pole malak" data-kesh-fakturi value="${kesh.fakturi === 0 ? '' : pishiVPole(kesh.fakturi)}" inputmode="decimal"></label>
        <label class="malak">изтеглено по извлечение <input class="pole malak" data-kesh-izvlechenie value="${kesh.izvlechenie === 0 ? '' : pishiVPole(kesh.izvlechenie)}" inputmode="decimal"></label>
        <button type="submit" class="malak" data-kesh-zapishi>Запиши кеша</button>
        <label class="otmetka malak"><input type="checkbox" data-samo-meseca ${samoMeseca ? 'checked' : ''}> само този месец</label>
        <span class="vest" data-kesh-sverki translate="no">${kesh.sverki
          .map((sv) => `${sv.kakvo}: ${sv.nared ? 'затваря' : `разлика ${pishi(sv.razlika)}`}`)
          .join(' · ')}</span>
      </form>
      <div class="deystviya butoni-malki" data-butoni>
        ${BUTONI_NA_UPRAVLENIE.map(butonHTML).join('')}
        <button type="button" class="malak" data-dobavi-dvizhenie>Добави ред с пари</button>
      </div>
    </div>
    ${podtaboveHTML(PODTABOVE, podtab)}
    <p class="greshka" data-greshka></p>
    ${
      podtab === 'nap'
        ? napHTML()
        : `<section class="tablitsa-blok" data-blok="nov">
      <h2 class="lenta" translate="no">Нов ред с пари</h2>
      <table class="reshetka smetki nov" data-reshetka="dvizheniya">
        <thead><tr>${vsichkiKoloni
          .map(
            (kol) =>
              `<th data-kolona="${kol.klyuch}" class="${kol.vid}" title="${ekraniraj(kol.ime)}">${ekraniraj(kol.kratko ?? kol.ime)}</th>`,
          )
          .join('')}</tr></thead>
        <tbody class="tablitsa"></tbody>
      </table>
      <p class="pod-tablitsata">Знакът решава страната: приходът е +, разходът е − (правило 20).</p>
    </section>
    <section class="upravlenie-tyalo" data-smetki>
      <div class="smetki-blokove">
        ${stranaHTML('prihod', s.prihod, sborPrihod)}
        ${stranaHTML('razhod', s.razhod, sborRazhod)}
        <section class="tablitsa-blok" data-blok="vkarvane">
          <h2 class="lenta" translate="no">Вкарване</h2>
          <p class="pod-tablitsata">Заплати Кеш · Фактури Кеш · Фактури Карта на едно място (негово, 05.09). Правото на Помощник Управителя идва с резен 4.</p>
          <p class="pod-tablitsata" data-vkarvane-pravo>${
            mozhePriVkarvane
              ? 'Имаш право да вкарваш тук.'
              : 'Ти само гледаш тук · правото за вкарване е на Помощник Управителя (лист Служители).'
          }</p>
          <table class="reshetka smetki" data-reshetka="vkarvane">
            <thead><tr>${glaviHTML}</tr></thead>
            <tbody class="tablitsa">${v.sektsii.map((sek) => sektsiyaHTML(sek, !mozhePriVkarvane)).join('')}</tbody>
            <tfoot><tr class="sbor"><td colspan="${KOLONI.length - 1}">ОБЩ Вкарване</td><td class="evro" data-sbor="vkarvane" translate="no">${ekraniraj(pishi(v.sbor))}</td></tr></tfoot>
          </table>
        </section>
        <p class="pod-tablitsata" data-sverka="smetki">движения ${s.broyDvizheniya} · без секция ${s.bezSektsiya.length} · сверката ${s.sverka.nared ? 'затваря' : `не затваря (${s.sverka.razlika})`}${samoMeseca ? ` · само ${ekraniraj(mesets)}` : ''}</p>
      </div>
      ${gantIDumiHTML(p.lenti[2] ?? '', DUMI_OT_KNIGATA.smetki)}`
    }`;

  zakachiReshetkata(k);
  zakachiPodtabove(k.tyalo, PAMET.podtab, k.prerisuvay);
  if (podtab === 'smetki') narisuvayGanta(k, [...s.prihod, ...s.razhod], mesets);
  k.tyalo.querySelector<HTMLFormElement>('[data-dds-forma]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    void zapishiDdsa(k);
  });

  // ═══ редът за кеш · един запис на месец ═══
  const pole = (beleg: string): HTMLInputElement | null =>
    k.tyalo.querySelector<HTMLInputElement>(`[data-kesh-${beleg}]`);
  pole('mesets')?.addEventListener('change', (e) => {
    zapomniEkranno(PAMET.mesets, (e.target as HTMLInputElement).value.trim());
    k.prerisuvay();
  });
  k.tyalo.querySelector<HTMLInputElement>('[data-samo-meseca]')?.addEventListener('change', (e) => {
    zapomniEkranno(PAMET.samoMeseca, (e.target as HTMLInputElement).checked);
    k.prerisuvay();
  });
  k.tyalo.querySelector<HTMLFormElement>('[data-kesh-forma]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    void zapishiKesha(k);
  });

  // ═══ бутоните ═══
  for (const b of k.tyalo.querySelectorAll<HTMLButtonElement>('button[data-buton-ekran]')) {
    const opis = BUTONI_NA_UPRAVLENIE.find((x) => x.klyuch === b.dataset['butonEkran']);
    if (opis === undefined) continue;
    b.addEventListener('click', () => deystvieNaButona(k, opis));
  }
  k.tyalo
    .querySelector<HTMLButtonElement>('[data-dobavi-dvizhenie]')
    ?.addEventListener('click', () => {
      // черновата се пише в СВОЯТА таблица · с ВСИЧКИТЕ си колони (вкл. двете
      // секции); записаният ред застава в секцията си при следващото рисуване
      otvoriChernova(k.tyalo, k, TABLITSA, 'smetki.dobaviDvizhenie');
    });

  zakachiDyasnoMenyu(k, 'smetki', (b) => void izpalniOtMenyuto(k, b.klyuch, b.tovar));
}

/** Гантът на Сметки · всяко движение е една колона — месецът му. */
function narisuvayGanta(k: KonteksNaEkrana, sektsii: readonly Sektsiya[], mesets: string): void {
  const skrol = k.tyalo.querySelector<HTMLElement>('[data-gant-skrol]');
  if (!skrol) return;
  const koloni = koloniNaTakta('godina', `${mesets}-01`);
  const tabl = k.tyalo.querySelectorAll<HTMLTableElement>('[data-reshetka]');
  const gore =
    k.tyalo.querySelector<HTMLElement>('.smetki-blokove')?.getBoundingClientRect().top ?? 0;
  const redove: RedNaGanta[] = [];
  const chislaPoData: { data: string; chislo: number }[] = [];
  for (const tb of tabl) {
    if (tb.dataset['reshetka'] === 'vkarvane') continue;
    for (const tr of tb.querySelectorAll<HTMLElement>('tbody tr.red')) {
      const r = tr.getBoundingClientRect();
      const id = tr.dataset['id'] ?? '';
      const sek = sektsii.find((x) => x.redove.some((y) => y.id === id));
      const red = sek?.redove.find((y) => y.id === id);
      const kogaMu = red?.mesets ?? '';
      redove.push({
        id,
        ime: `${sek?.tekst ?? ''} · ${kogaMu}`,
        y: r.top - gore,
        visina: r.height,
        lenta:
          kogaMu === '' ? null : lentaNa({ id, ot: `${kogaMu}-01`, do: `${kogaMu}-01` }, koloni),
        svetofar: null,
        speshno: false,
      });
      if (red !== undefined && kogaMu !== '')
        chislaPoData.push({ data: `${kogaMu}-01`, chislo: red.suma_st });
    }
  }
  const lenti = redove.map((r) => r.lenta).filter((l) => l !== null);
  skrol.innerHTML = gantSVG({
    koloni,
    redove,
    visinaNaGlavata: 24,
    sborove: sboroveVKolonite(koloni, chislaPoData),
    pokrivashti: broyPokrivashti(koloni, lenti),
    shirinaNaKolonata: SHIRINA_NA_TAKTA,
  });
  const sverka = k.tyalo.querySelector('[data-sverka="gant"]');
  if (sverka)
    sverka.textContent = `ленти ${lenti.length} · движения ${redove.length} · колони ${koloni.length}`;
}

async function zapishiKesha(k: KonteksNaEkrana): Promise<void> {
  const chetiPole = (beleg: string): string =>
    k.tyalo.querySelector<HTMLInputElement>(`[data-kesh-${beleg}]`)?.value.trim() ?? '';
  const { otSuma } = await import('../../src/yadro/pari.js');
  const suma = (v: string): Kletka | null => (v === '' ? null : { stoynost_st: otSuma(v) });
  try {
    const r = await k.porta.izpalni(crypto.randomUUID(), 'smetki.zapishiKesh', {
      mesets: chetiPole('mesets'),
      zaplati: suma(chetiPole('zaplati')),
      fakturi: suma(chetiPole('fakturi')),
      izvlechenie: suma(chetiPole('izvlechenie')),
    });
    otgovoratNaPortata(k, r);
  } catch (g) {
    pokazhiGreshka(k.tyalo, g instanceof Error ? g.message : String(g));
  }
}

/** Редът на ДДС за месеца на екрана · за да не се трият чужди числа при запис. */
function zaMesetsa(k: KonteksNaEkrana): { izdadeni: Kletka | null; plateni: Kletka | null } | null {
  const mesets = chetiEkranno<string>(PAMET.mesets, mesetsatSega());
  const m = ddsat(k.porta.ogledalo(), new Date().toISOString()).mesetsi.find(
    (x) => x.mesets === mesets,
  );
  if (m === undefined) return null;
  return {
    izdadeni: m.izdadeni === 0 ? null : { stoynost_st: m.izdadeni },
    plateni: m.plateni === 0 ? null : { stoynost_st: m.plateni },
  };
}

async function zapishiDdsa(k: KonteksNaEkrana): Promise<void> {
  const pole = (beleg: string): string =>
    k.tyalo.querySelector<HTMLInputElement>(`[data-dds-${beleg}]`)?.value.trim() ?? '';
  const { otSuma } = await import('../../src/yadro/pari.js');
  const suma = (v: string): Kletka | null => (v === '' ? null : { stoynost_st: otSuma(v) });
  try {
    const r = await k.porta.izpalni(crypto.randomUUID(), 'smetki.zapishiDds', {
      mesets: pole('mesets'),
      nachislen: suma(pole('nachislen')),
      kredit: suma(pole('kredit')),
      deklarirano: suma(pole('deklarirano')),
      plateno: suma(pole('plateno')),
      // числата от счетоводството не са в тази форма · пазят се такива, каквито са
      izdadeni: zaMesetsa(k)?.izdadeni ?? null,
      plateni: zaMesetsa(k)?.plateni ?? null,
    });
    otgovoratNaPortata(k, r);
  } catch (g) {
    pokazhiGreshka(k.tyalo, g instanceof Error ? g.message : String(g));
  }
}

function deystvieNaButona(k: KonteksNaEkrana, b: ButonNaProzoretsa): void {
  const d = b.deystvie;
  switch (d.vid) {
    case 'kniga':
      void zapaziKnigata(k);
      return;
    case 'nastroyki':
      location.hash = '#/nastroyki';
      return;
    case 'komanda':
      void izpalniOtMenyuto(k, d.klyuch, {});
      return;
    case 'idva':
      return;
    case 'ekran':
      break;
  }
  switch (d.klyuch) {
    case 'obnovi':
      k.prerisuvay();
      return;
    case 'skriy-dela':
    case 'dobavyane':
      location.hash = '#/upravlenie';
      return;
    default:
      pokazhiGreshka(
        k.tyalo,
        `Бутонът „${b.ime.split('(')[0]!.trim()}" на Сметки идва с втората половина на резен 3.`,
      );
  }
}
