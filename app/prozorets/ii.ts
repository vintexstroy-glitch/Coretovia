/**
 * ИИ · прозорецът на листа „ИИ" · Сверчикът без мрежа (ADR-004).
 *
 * Неговите четири инструкции, двете му таблици с агенти (петте реда под
 * „Активни агенти" със статус; „Неактивни агенти" празна, както е при него), и
 * „Прочети Книгата": файлът се чете, разпознава и сверява с Огледалото → ОТЧЕТ
 * с находки и предложения, всяко с отметка. Нищо не се записва, докато човекът
 * не натисне „Приеми избраните" (K3); тогава отметнатите минават през Портата
 * едно по едно, а накрая се записва РАЗПИСКАТА — и при нула, и при спиране
 * (правило 7).
 *
 * Отчетът живее извън тялото (`prochit`), защото всеки запис прерисува прозореца
 * и той трябва да го намери пак, с отметките и състоянията си. Ключовете на
 * действията се раждат при прочита (за пробата) и се преизползват при „Приеми"
 * до успех (правило 5). Успешното „Приеми" ПРИКЛЮЧВА прочита: за останалите
 * предложения се чете пак, и екранът го казва.
 */

import type { Otchet } from '../../src/kniga/sverchik.js';
import { AGENTI, GLAVI_NA_AGENTITE, statusNaAgenta } from '../../src/model/agenti.js';
import { DUMI_OT_KNIGATA } from '../../src/model/dumi-ot-knigata.js';
import { PROZORTSI } from '../../src/model/osnova.js';
import { DUMI_NA_VIDA, type Predlozhenie } from '../../src/model/predlozhenie.js';
import {
  izpalniPredlozheniyata,
  type ProbaNaPredlozhenie,
  probvayPredlozheniyata,
  type RezultatOtVnasyane,
  type SastoyanieNaPredlozhenie,
} from '../../src/porta/vnasyane.js';
import { dumiZaGreshka } from '../../src/yadro/dumi.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { ekraniraj } from '../reshetka/obshto.js';
import { zakachiZebrata } from '../reshetka/zebra.js';
import { dumiteHTML } from './profil.js';

/** Един прочит на Книга · отчетът, пробите, отметките и какво е станало при „Приеми". */
interface Prochit {
  readonly ime: string;
  readonly otpechatak: string;
  readonly otchet: Otchet;
  /** броят събития при прочита (и след нашата партида) · сменил ли се е светът, отчетът не е за него */
  broySabitiya: number;
  readonly probi: readonly ProbaNaPredlozhenie[];
  /** ключовете на действията по предложение · раждат се веднъж, преизползват се до успех */
  readonly klyuchove: Map<number, string>;
  readonly otmetnati: Set<number>;
  rezultat: RezultatOtVnasyane | null;
  /** вносът тече · между „Приеми" и разписката · екранът го рисува сиво */
  teche: boolean;
  /** думите за разписката · след „Приеми" */
  vest: string;
}

let prochit: Prochit | null = null;

const DUMI_NA_SASTOYANIETO: Readonly<Record<SastoyanieNaPredlozhenie, string>> = Object.freeze({
  priet: 'приет',
  povtoren: 'повторен',
  otkazan: 'отказан',
  propusnat: 'пропуснат · зависи от неминало',
  neopitan: 'неопитан · след отказа',
});

const DUMI_ZA_PRIKLYUCHEN = 'Приетото е записано — за останалите предложения прочети Книгата пак.';
const DUMI_ZA_TECHE = 'вносът тече — изчакай разписката';
const DUMI_ZA_CHUZHDA = 'нищо за приемане — Книгата не е на този Стопанин или Модел';

function idNaOt(pr: Prochit): (i: number) => string {
  return (i) => {
    let k = pr.klyuchove.get(i);
    if (k === undefined) {
      k = crypto.randomUUID();
      pr.klyuchove.set(i, k);
    }
    return k;
  };
}

/** Блокирано е предложение, което зависи от неотметнато или от блокирано · транзитивно. */
function blokirano(pr: Prochit, i: number, videni = new Set<number>()): boolean {
  const p = pr.otchet.predlozheniya[i];
  if (p === undefined || videni.has(i)) return false;
  videni.add(i);
  return p.zavisiOt.some((z) => !pr.otmetnati.has(z) || blokirano(pr, z, videni));
}

/** Свършено е предложение, което е минало · прието или повторено. */
function svarsheno(pr: Prochit, i: number): boolean {
  const s = pr.rezultat?.sastoyaniya.get(i);
  return s === 'priet' || s === 'povtoren';
}

/** Приключен е прочит, чието „Приеми" е минало без отказ · за останалото трябва нов прочит. */
function priklyuchen(pr: Prochit): boolean {
  return pr.rezultat !== null && pr.rezultat.otkaz === null;
}

/** Книга на друг Стопанин или друг Модел · нищо не се приема и разписка не се пише (правило 21). */
function chuzhda(pr: Prochit): boolean {
  return pr.otchet.nahodki.some((n) => n.list === 'служебен');
}

function izbraniDumi(pr: Prochit): string {
  return `избрани ${[...pr.otmetnati].filter((i) => !blokirano(pr, i)).length} от ${pr.otchet.predlozheniya.length}`;
}

function redNaPredlozhenieHTML(pr: Prochit, p: Predlozhenie, i: number): string {
  const proba = pr.probi[i];
  const sastoyanie = pr.rezultat?.sastoyaniya.get(i);
  const otkazSled = pr.rezultat?.otkaz?.indeks === i ? pr.rezultat.otkaz.zashto.join(' ') : '';
  const blok = blokirano(pr, i);
  const gotovo = svarsheno(pr, i);
  const portata =
    otkazSled !== ''
      ? `<span class="greshka-tekst">${ekraniraj(otkazSled)}</span>`
      : proba === undefined
        ? ''
        : !proba.probvano
          ? `<span class="sivo">зависи от № ${p.zavisiOt.map((z) => z + 1).join(', ')}</span>`
          : proba.otkaz === null
            ? 'минава'
            : `<span class="greshka-tekst">${ekraniraj(proba.otkaz.join(' '))}</span>`;
  const otkazano = proba?.otkaz !== null && proba?.probvano === true;
  const otmetnato = pr.otmetnati.has(i) && !blok && !otkazano;
  const zamlaknala = blok || otkazano || gotovo || priklyuchen(pr) || pr.teche;
  const zashto = blok
    ? `зависи от № ${p.zavisiOt.map((z) => z + 1).join(', ')}`
    : priklyuchen(pr) && !gotovo
      ? DUMI_ZA_PRIKLYUCHEN
      : '';
  return `<tr class="red${gotovo ? ' svarsheno' : ''}" data-predlozhenie="${i}" data-vid="${p.vid}">
    <td><input type="checkbox" data-otmetka="${i}" ${otmetnato ? 'checked' : ''} ${zamlaknala ? 'disabled' : ''} title="${ekraniraj(zashto)}"></td>
    <td class="nomer">${i + 1}</td>
    <td translate="no">${ekraniraj(p.list)}</td>
    <td translate="no">${ekraniraj(p.adres)}</td>
    <td>${DUMI_NA_VIDA[p.vid]}</td>
    <td translate="no">${ekraniraj(p.zashto)}</td>
    <td data-porta="${i}" translate="no">${portata}</td>
    <td data-sastoyanie="${i}">${sastoyanie === undefined ? '' : DUMI_NA_SASTOYANIETO[sastoyanie]}</td>
  </tr>`;
}

function otchetHTML(pr: Prochit): string {
  const { otchet } = pr;
  const greshki = otchet.nahodki.filter((n) => n.stepen === 'greshka').length;
  const sivDumi = pr.teche
    ? DUMI_ZA_TECHE
    : chuzhda(pr)
      ? DUMI_ZA_CHUZHDA
      : priklyuchen(pr)
        ? DUMI_ZA_PRIKLYUCHEN
        : '';
  return `
    <p class="vest" data-otchet-fayl translate="no">${ekraniraj(pr.ime)} · отпечатък ${ekraniraj(pr.otpechatak.slice(0, 16))}…${
      otchet.sluzhebno === null
        ? ' · без служебен лист (не е наша Книга)'
        : ` · изнесена ${ekraniraj(otchet.sluzhebno.iznesenoNa || '—')} · seq ${otchet.sluzhebno.kursor?.seq ?? '—'}`
    }</p>
    <p class="vest" data-otchet-vest>${ekraniraj(otchet.obobshtenie)}</p>
    <details class="sverki">
      <summary data-sverki-obobshtenie>сверки · ${otchet.sverki.filter((s) => s.nared).length} от ${otchet.sverki.length} затварят</summary>
      <table class="tablitsa" data-sverki>
        <thead><tr><th>какво</th><th>вход</th><th>изход</th><th>разлика</th></tr></thead>
        <tbody>${otchet.sverki
          .map(
            (s) =>
              `<tr class="${s.nared ? '' : 'greshka-red'}"><td translate="no">${ekraniraj(s.kakvo)}</td><td>${s.vhod}</td><td>${s.izhod}</td><td>${s.razlika}</td></tr>`,
          )
          .join('')}</tbody>
      </table>
    </details>
    <h3>Находки · ${greshki} грешки · ${otchet.nahodki.length - greshki} бележки</h3>
    ${
      otchet.nahodki.length === 0
        ? '<p class="vest" data-nahodki-nyama>няма</p>'
        : `<table class="tablitsa" data-nahodki>
        <thead><tr><th>лист</th><th>адрес</th><th>степен</th><th>какво</th></tr></thead>
        <tbody>${otchet.nahodki
          .map(
            (n) =>
              `<tr class="${n.stepen === 'greshka' ? 'greshka-red' : ''}" data-nahodka="${ekraniraj(n.adres)}"><td translate="no">${ekraniraj(n.list)}</td><td translate="no">${ekraniraj(n.adres)}</td><td>${n.stepen === 'greshka' ? 'грешка' : 'бележка'}</td><td translate="no">${ekraniraj(n.kakvo)}</td></tr>`,
          )
          .join('')}</tbody>
      </table>`
    }
    <h3>Предложения · ${otchet.predlozheniya.length}</h3>
    <table class="reshetka" data-predlozheniya>
      <thead><tr><th></th><th>№</th><th>лист</th><th>адрес</th><th>вид</th><th>защо</th><th>Портата</th><th>състояние</th></tr></thead>
      <tbody class="tablitsa">${otchet.predlozheniya.map((p, i) => redNaPredlozhenieHTML(pr, p, i)).join('')}</tbody>
    </table>
    <div class="deystviya">
      <button type="button" data-priemi ${sivDumi === '' ? '' : `disabled title="${ekraniraj(sivDumi)}"`}>Приеми избраните</button>
      <span class="vest" data-izbrani>${izbraniDumi(pr)}</span>
    </div>
    <p class="vest" data-vnos-vest translate="no">${ekraniraj(pr.vest)}</p>`;
}

export function narisuvayII(k: KonteksNaEkrana): void {
  const o = k.porta.ogledalo();
  const p = PROZORTSI.find((x) => x.klyuch === 'ii')!;
  const glavi = GLAVI_NA_AGENTITE.map((g) => `<th>${ekraniraj(g)}</th>`).join('');
  k.tyalo.innerHTML = `
    ${dumiteHTML(DUMI_OT_KNIGATA.ii)}
    <section class="sektsiya" data-sektsiya="agenti">
      <h2 class="lenta" translate="no">${ekraniraj(p.lenti[0] ?? '')}</h2>
      <table class="reshetka agenti" data-agenti="aktivni">
        <thead><tr>${glavi}</tr></thead>
        <tbody class="tablitsa">${AGENTI.map(
          (a) =>
            `<tr class="red" data-agent="${a.nomer}"><td class="nomer">${a.nomer}</td><td translate="no">${ekraniraj(a.agent)}</td><td translate="no">${ekraniraj(a.dlazhnost)}</td><td translate="no">${ekraniraj(a.zadacha)}</td><td data-status>${ekraniraj(statusNaAgenta(a))}</td><td></td><td></td></tr>`,
        ).join('')}</tbody>
      </table>
      <h2 class="lenta" translate="no">${ekraniraj(p.lenti[1] ?? '')}</h2>
      <table class="reshetka agenti" data-agenti="neaktivni">
        <thead><tr>${glavi}</tr></thead>
        <tbody class="tablitsa"></tbody>
      </table>
    </section>
    <section class="sektsiya" data-sektsiya="vnos">
      <h2>Прочети Книгата</h2>
      <p>Сверчикът чете една Книга (.xlsx), сравнява я с Огледалото и ПРЕДЛАГА. Нищо не се записва, докато не натиснеш „Приеми избраните" — тогава отметнатите минават през Портата едно по едно и се записва разписка, дори при нула.</p>
      <input type="file" accept=".xlsx" data-kniga-vnos>
      <div data-otchet>${prochit === null ? '<p class="vest" data-otchet-vest>няма прочетена Книга</p>' : otchetHTML(prochit)}</div>
    </section>
    <section class="sektsiya" data-sektsiya="vnasyaniya">
      <h2>Разписки за внос</h2>
      ${
        o.vnasyaniya.length === 0
          ? '<p class="vest" data-vnasyaniya-nyama>още няма</p>'
          : `<table class="tablitsa" data-vnasyaniya>
          <thead><tr><th>кога</th><th>файл</th><th>изнесена</th><th>предложени</th><th>избрани</th><th>приети</th><th>отказани</th><th>находки</th></tr></thead>
          <tbody>${o.vnasyaniya
            .map(
              (v) =>
                `<tr data-vnasyane="${ekraniraj(v.otpechatakNaFayla.slice(0, 16))}" translate="no"><td>${ekraniraj(v.vnesenoNa)}</td><td>${ekraniraj(v.otpechatakNaFayla.slice(0, 16))}…</td><td>${ekraniraj(v.iznesenoNa || '—')}</td><td>${v.predlozheni}</td><td>${v.izbrani}</td><td>${v.prieti}</td><td>${v.otkazani}</td><td>${v.nahodki}</td></tr>`,
            )
            .join('')}</tbody>
        </table>`
      }
    </section>`;

  zakachiZebrata(k.tyalo);

  k.tyalo
    .querySelector<HTMLInputElement>('[data-kniga-vnos]')
    ?.addEventListener('change', (e) => void prochetiFayla(k, e));
  zakachiOtcheta(k);
}

async function prochetiFayla(k: KonteksNaEkrana, e: Event): Promise<void> {
  const fayl = (e.target as HTMLInputElement).files?.[0];
  const vest = k.tyalo.querySelector('[data-otchet-vest]');
  if (!fayl) return;
  if (vest) vest.textContent = 'чета…';
  try {
    const baytove = await fayl.arrayBuffer();
    const otpechatak = await k.otpechatakNaBaytove(baytove);
    // Библиотеката за Книгата се тегли ПРИ НАТИСКАНЕ (най-тежкото парче); четенето и
    // Сверчикът идват с нея, защото четенето говори с нея.
    const [{ prochetiKniga }, { razpoznayKnigata }, { sveri }] = await Promise.all([
      import('../../src/kniga/ooxml.js'),
      import('../../src/kniga/chetene.js'),
      import('../../src/kniga/sverchik.js'),
    ]);
    const o = k.porta.ogledalo();
    const sega = new Date().toISOString();
    const kniga = await prochetiKniga(baytove);
    const otchet = sveri(o, razpoznayKnigata(kniga, o, sega), sega);
    const pr: Prochit = {
      ime: fayl.name,
      otpechatak,
      otchet,
      broySabitiya: o.broySabitiya,
      probi: [],
      klyuchove: new Map(),
      otmetnati: new Set(
        otchet.predlozheniya.map((p, i) => (p.poPodrazbirane ? i : -1)).filter((i) => i >= 0),
      ),
      rezultat: null,
      teche: false,
      vest: '',
    };
    // пробата е върху живото Огледало, с ключовете, които и „Приеми" ще преизползва
    const probi = probvayPredlozheniyata(k.porta, otchet.predlozheniya, idNaOt(pr));
    for (const [i, pb] of probi.entries()) if (pb.otkaz !== null) pr.otmetnati.delete(i);
    prochit = { ...pr, probi };
    k.prerisuvay();
  } catch (g) {
    if (vest) vest.textContent = `Книгата не се чете: ${dumiZaGreshka(g)}`;
  }
}

function zakachiOtcheta(k: KonteksNaEkrana): void {
  const pr = prochit;
  if (pr === null) return;
  for (const ot of k.tyalo.querySelectorAll<HTMLInputElement>('[data-otmetka]')) {
    ot.addEventListener('change', () => {
      const i = Number(ot.dataset['otmetka']);
      if (ot.checked) pr.otmetnati.add(i);
      else pr.otmetnati.delete(i);
      // зависимите падат и се вдигат с отметката, от която зависят · без пълно прерисуване
      for (const drug of k.tyalo.querySelectorAll<HTMLInputElement>('[data-otmetka]')) {
        const j = Number(drug.dataset['otmetka']);
        const p = pr.otchet.predlozheniya[j];
        if (p === undefined || p.zavisiOt.length === 0) continue;
        const blok = blokirano(pr, j);
        const otkazano = pr.probi[j]?.otkaz !== null && pr.probi[j]?.probvano === true;
        drug.disabled = blok || otkazano || svarsheno(pr, j);
        drug.title = blok ? `зависи от № ${p.zavisiOt.map((z) => z + 1).join(', ')}` : '';
        drug.checked = !blok && !otkazano && pr.otmetnati.has(j);
      }
      const izbrani = k.tyalo.querySelector('[data-izbrani]');
      if (izbrani) izbrani.textContent = izbraniDumi(pr);
    });
  }
  k.tyalo.querySelector<HTMLButtonElement>('[data-priemi]')?.addEventListener('click', () => {
    void priemi(k, pr);
  });
}

async function priemi(k: KonteksNaEkrana, pr: Prochit): Promise<void> {
  // сивият бутон не стига дотук · пазачът е за чужд клик
  if (pr.teche || chuzhda(pr) || priklyuchen(pr)) return;
  // отчетът е за Огледалото при прочита · друго Огледало иска нов прочит (номерата на новите
  // стойности и пробите са сметнати върху него); собствената ни партида го придвижва накрая
  if (k.porta.ogledalo().broySabitiya !== pr.broySabitiya) {
    pr.vest = 'Журналът се промени след прочита — прочети Книгата пак, преди да приемаш.';
    k.prerisuvay();
    return;
  }
  const sega = new Date().toISOString();
  // отметнати без блокираните · човекът вижда същото число в „избрани N от M"
  const izbrani = new Set([...pr.otmetnati].filter((i) => !blokirano(pr, i)));
  pr.teche = true;
  pr.vest = 'приемам избраните — изчакай разписката…';
  k.prerisuvay();
  try {
    const r = await izpalniPredlozheniyata(
      k.porta,
      pr.otchet.predlozheniya,
      izbrani,
      idNaOt(pr),
      sega,
    );
    pr.rezultat = r;
    const nahodki = pr.otchet.nahodki.filter((n) => n.stepen === 'greshka').length;
    const razpiska = await k.porta.izpalni(crypto.randomUUID(), 'kniga.vnesi', {
      otpechatakNaFayla: pr.otpechatak,
      iznesenoNa: pr.otchet.sluzhebno?.iznesenoNa ?? '',
      kursorSeqNaIznosa: pr.otchet.sluzhebno?.kursor?.seq ?? 0,
      predlozheni: pr.otchet.predlozheniya.length,
      izbrani: r.izbrani,
      prieti: r.prieti + r.povtoreni,
      otkazani: r.otkaz === null ? 0 : 1,
      nahodki,
      vnesenoNa: sega,
    });
    // светът след НАШАТА партида · чуждо събитие оттук нататък пак иска нов прочит
    pr.broySabitiya = k.porta.ogledalo().broySabitiya;
    const dumi = `приети ${r.prieti} от ${r.izbrani} избрани · повторени ${r.povtoreni} · отказани ${
      r.otkaz === null ? 0 : 1
    } · пропуснати ${r.propusnati.length} · неопитани ${r.neopitani.length} · сверка ${r.sverka.nared ? 'затваря' : `НЕ затваря (${r.sverka.razlika})`}`;
    pr.vest =
      'otkaz' in razpiska
        ? `${dumi} · разписката е отказана: ${razpiska.zashto.join(' ')}`
        : `${dumi} · разписката е записана (seq ${razpiska.seqove.join(', ')})${
            r.otkaz === null
              ? ''
              : ` · спряно на № ${r.otkaz.indeks + 1}: ${r.otkaz.zashto.join(' ')}`
          }${r.prieti > 0 ? ' · Запази книгата от Имоти, за да получи файлът ключовете на новите редове.' : ''}${
            r.otkaz === null && pr.otchet.predlozheniya.length > r.izbrani
              ? ` · ${DUMI_ZA_PRIKLYUCHEN}`
              : ''
          }`;
  } finally {
    pr.teche = false;
  }
  k.prerisuvay();
}
