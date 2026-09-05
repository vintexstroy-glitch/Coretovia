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
import { koloniNaTakta } from '../../src/smetach/vreme.js';
import { pishi, pishiVPole } from '../../src/yadro/pari.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { otvoriChernova } from '../reshetka/chernova.js';
import { gantSVG, type RedNaGanta } from '../reshetka/gant-svg.js';
import { ekraniraj } from '../reshetka/obshto.js';
import { chetiEkranno, zapomniEkranno } from '../reshetka/pamet-ekran.js';
import { fokusiraySled, pokazhiGreshka, zakachiRedaktsiya } from '../reshetka/redaktsiya.js';
import { kletkaHTML } from '../reshetka/reshetka.js';
import { zakachiZebrata } from '../reshetka/zebra.js';
import {
  gantIDumiHTML,
  izpalniOtMenyuto,
  otgovoratNaPortata,
  zakachiDyasnoMenyu,
  zapaziKnigata,
} from './deystviya.js';
import { dumiteHTML } from './profil.js';

const TABLITSA = 'dvizheniya';
const PAMET = Object.freeze({
  mesets: 'smetki.mesets',
  samoMeseca: 'smetki.samoMeseca',
});
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
  const nesvereni = [...s.prihod, ...s.razhod]
    .flatMap((x) => x.redove)
    .filter((r) => {
      const kl = tv === undefined ? null : redKato(tv, r.i).kletki['sastoyanie'];
      return kl === undefined || kl === null;
    }).length;

  const poleta = [
    { klyuch: 'prihod', ime: 'Приход', dumi: pishi(s.sborPrihod) },
    { klyuch: 'razhod', ime: 'Разходи', dumi: pishi(s.sborRazhod) },
    { klyuch: 'rezultat', ime: 'Резултат', dumi: pishi(s.rezultat) },
    { klyuch: 'kesh-dadeno', ime: 'Кеш дадено', dumi: pishi(kesh.dadeno) },
    { klyuch: 'kesh-izvlechenie', ime: 'Кеш изтеглено', dumi: pishi(kesh.izvlechenie) },
    { klyuch: 'kesh-vkarano', ime: 'Кеш вкарано', dumi: pishi(Math.abs(kesh.vkarano)) },
    { klyuch: 'dvizheniya', ime: 'движения', dumi: String(s.broyDvizheniya) },
    { klyuch: 'nesvereni', ime: 'несверени', dumi: String(nesvereni) },
  ];

  /** Един ред с пари · клетките са редактируеми на място, както в дървото. */
  const redHTML = (r: RedNaEkrana): string => {
    const red = redKato(tv!, r.i);
    const tds = KOLONI.map((klyuch) => {
      const kol = kolonaNa(t, klyuch);
      if (kol === undefined) return '<td class="kletka prazna"></td>';
      if (klyuch === 'kam') {
        const kl = red.kletki['kam'] ?? null;
        const dumi = kl !== null && 'tekst' in kl ? imeNaVrazkata(o, kol, kl.tekst) : '';
        return `<td class="kletka vrazka" data-kolona="kam" data-redakt="${TABLITSA}·${ekraniraj(r.id)}·kam" tabindex="0" translate="no">${ekraniraj(dumi)}</td>`;
      }
      return kletkaHTML(o, TABLITSA, kol, red);
    }).join('');
    return `<tr class="red" data-id="${ekraniraj(r.id)}" data-tablitsa="${TABLITSA}" data-seq="${red.seq}">${tds}</tr>`;
  };

  const sektsiyaHTML = (sek: Sektsiya): string =>
    `<tr class="grupata sektsiya" data-sektsiya="${sek.strana}·${sek.nomer}">
        <td colspan="${KOLONI.length - 1}" translate="no">${ekraniraj(sek.tekst)}</td>
        <td class="evro" data-sbor-sektsiya="${sek.strana}·${sek.nomer}" translate="no">${ekraniraj(pishi(sek.sbor))}</td>
      </tr>${sek.redove
        .map((r) =>
          redHTML({
            id: r.id,
            i: r.i,
            mesets: r.mesets,
            suma: r.suma_st,
            ime: sek.tekst,
          }),
        )
        .join('')}`;

  const vsichkiKoloni = t.koloni.filter((kol) => slotNaKolonata(kol) !== undefined);
  const glaviHTML = KOLONI.map((klyuch) => {
    const kol = kolonaNa(t, klyuch);
    return `<th data-kolona="${klyuch}" class="${kol?.vid ?? ''}" title="${ekraniraj(kol?.ime ?? '')}">${ekraniraj(kol?.kratko ?? kol?.ime ?? '')}</th>`;
  }).join('');

  const stranaHTML = (strana: Strana, sektsii: readonly Sektsiya[], sbor: number): string => `
    <section class="tablitsa-blok" data-blok="${strana}">
      <h2 class="lenta" translate="no">${ekraniraj(IMENA_NA_STRANITE[strana])}</h2>
      <table class="reshetka smetki" data-reshetka="${strana}">
        <thead><tr>${glaviHTML}</tr></thead>
        <tbody class="tablitsa">${sektsii.map(sektsiyaHTML).join('')}</tbody>
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
    <p class="greshka" data-greshka></p>
    <section class="tablitsa-blok" data-blok="nov">
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
        ${stranaHTML('prihod', s.prihod, s.sborPrihod)}
        ${stranaHTML('razhod', s.razhod, s.sborRazhod)}
        <section class="tablitsa-blok" data-blok="vkarvane">
          <h2 class="lenta" translate="no">Вкарване</h2>
          <p class="pod-tablitsata">Заплати Кеш · Фактури Кеш · Фактури Карта на едно място (негово, 05.09). Правото на Помощник Управителя идва с резен 4.</p>
          <table class="reshetka smetki" data-reshetka="vkarvane">
            <thead><tr>${glaviHTML}</tr></thead>
            <tbody class="tablitsa">${v.sektsii.map(sektsiyaHTML).join('')}</tbody>
            <tfoot><tr class="sbor"><td colspan="${KOLONI.length - 1}">ОБЩ Вкарване</td><td class="evro" data-sbor="vkarvane" translate="no">${ekraniraj(pishi(v.sbor))}</td></tr></tfoot>
          </table>
        </section>
        <p class="pod-tablitsata" data-sverka="smetki">движения ${s.broyDvizheniya} · без секция ${s.bezSektsiya.length} · сверката ${s.sverka.nared ? 'затваря' : `не затваря (${s.sverka.razlika})`}${samoMeseca ? ` · само ${ekraniraj(mesets)}` : ''}</p>
      </div>
      ${gantIDumiHTML(p.lenti[2] ?? '', DUMI_OT_KNIGATA.smetki)}`;

  zakachiZebrata(k.tyalo);
  zakachiRedaktsiya(k.tyalo, k);
  fokusiraySled(k.tyalo);
  narisuvayGanta(k, [...s.prihod, ...s.razhod], mesets);

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
