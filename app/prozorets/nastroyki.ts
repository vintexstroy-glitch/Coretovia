/**
 * НАСТРОЙКИ(СТОПАНИН) · НОМЕНКЛАТУРИТЕ като ЕДНА таблица с подтаблици.
 *
 * Негово, 05.09: „с възможност за редакция, триене, създаване, просто пишейки
 * в таблицата за всички номенклатури свсяка в подтаблици в голямата таблица".
 *
 *   · пише в празния последен ред на подтаблица + Enter → нова стойност с номер;
 *   · поправя текст → преименува (същият номер);
 *   · изтрива текста + Enter → стойността е СПРЯНА (сива, с номера си);
 *   · пише отново в спрян ред → връща я.
 *
 * Без диалози — обратимо и видимо. `komandaId` се ражда при отварянето на
 * полето и се преизползва до успех (правило 5: ключът носи ДЕЙСТВИЕТО): двоен
 * Enter е един запис, не два. Под всяка подтаблица стои броячът ѝ.
 */

import { DUMI_OT_KNIGATA } from '../../src/model/dumi-ot-knigata.js';
import {
  type Belezi,
  broyachNaNomenklaturata,
  poNomer,
  sledvashtNomer,
  type ZhivaNomenklatura,
  zhivite,
} from '../../src/model/nomenklatura.js';
import type { Ogledalo } from '../../src/ogledalo/ogledalo.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { ekraniraj } from '../reshetka/obshto.js';
import { naEnterIEscape, pokazhiGreshka } from '../reshetka/redaktsiya.js';
import { zakachiZebrata } from '../reshetka/zebra.js';
import { dumiteHTML } from './profil.js';

/** Нашите думи на екрана · главите на голямата таблица. */
const GLAVI = ['Номенклатура', '№', 'Стойност', 'Белег', 'Спряна'] as const;

/** Клетката, която трябва да получи фокуса след прерисуване · нов ред или стойност. */
let fokusSled: string | null = null;

function belegNa(n: ZhivaNomenklatura, belezi: Belezi): string {
  return n.podredbaPo === undefined ? '' : String(belezi[n.podredbaPo] ?? '');
}

function beleziOt(n: ZhivaNomenklatura, beleg: string): Belezi {
  if (n.podredbaPo === undefined || beleg === '') return {};
  return { [n.podredbaPo]: Number(beleg) };
}

/** Белегът с думи · номерът на категорията → текстът ѝ. */
function belegSDumi(o: Ogledalo, n: ZhivaNomenklatura, beleg: string): string {
  if (n.podredbaPo === undefined || beleg === '') return '';
  const kategorii = o.nomenklaturi.get(n.podredbaPo);
  return kategorii === undefined ? beleg : (poNomer(kategorii, Number(beleg))?.tekst ?? beleg);
}

export function narisuvayNastroyki(k: KonteksNaEkrana): void {
  const o = k.porta.ogledalo();
  const redove: string[] = [];
  for (const n of o.nomenklaturi.values()) {
    redove.push(
      `<tr class="grupata" data-nomenklatura="${n.klyuch}"><td colspan="${GLAVI.length}" translate="no">${ekraniraj(n.ime)}</td></tr>`,
    );
    const spreni = n.stoynosti.filter((s) => s.spryana);
    for (const s of [...zhivite(n), ...spreni]) {
      const beleg = belegNa(n, s.belezi);
      redove.push(
        `<tr class="red${s.spryana ? ' spryana' : ''}" data-nomenklatura="${n.klyuch}" data-nomer="${s.nomer}" data-beleg="${ekraniraj(beleg)}">
          <td></td>
          <td class="nomer">${s.nomer}</td>
          <td class="kletka" data-stoynost tabindex="0" translate="no">${ekraniraj(s.tekst)}</td>
          <td translate="no">${ekraniraj(belegSDumi(o, n, beleg))}</td>
          <td>${s.spryana ? 'спряна' : ''}</td>
        </tr>`,
      );
    }
    const kategorii = n.podredbaPo === undefined ? undefined : o.nomenklaturi.get(n.podredbaPo);
    const izborNaBeleg =
      kategorii === undefined
        ? ''
        : `<select class="pole" data-nov-beleg>${zhivite(kategorii)
            .filter((s) => s.belezi['bezVid'] !== true)
            .map((s) => `<option value="${s.nomer}">${ekraniraj(s.tekst)}</option>`)
            .join('')}</select>`;
    const sledvasht =
      kategorii === undefined
        ? sledvashtNomer(n)
        : sledvashtNomer(n, beleziOt(n, String(zhivite(kategorii)[0]?.nomer ?? '')));
    redove.push(
      `<tr class="nov" data-nov="${n.klyuch}">
        <td></td>
        <td class="nomer" data-sledvasht>${sledvasht}</td>
        <td><input class="pole" data-nova-stoynost placeholder="нова стойност · Enter"></td>
        <td>${izborNaBeleg}</td>
        <td></td>
      </tr>`,
    );
    const b = broyachNaNomenklaturata(n);
    redove.push(
      `<tr class="sverka"><td colspan="${GLAVI.length}" data-sverka="${n.klyuch}">живи ${b.zhivi} · спрени ${b.spreni} · всички ${b.vsichki}</td></tr>`,
    );
  }

  k.tyalo.innerHTML = `
    ${dumiteHTML(DUMI_OT_KNIGATA.nastroyki)}
    <h2 class="lenta">Номенклатури</h2>
    <p class="vest">Пиши в празния ред и натисни Enter. Поправи текста — номерът остава. Изтрий текста — стойността спира, старите редове я пазят. Пиши в спрян ред — връща се.</p>
    <p class="greshka" data-greshka></p>
    <table class="reshetka nomenklaturi" data-reshetka="nomenklaturi">
      <thead><tr>${GLAVI.map((g) => `<th>${g}</th>`).join('')}</tr></thead>
      <tbody class="tablitsa">${redove.join('')}</tbody>
    </table>`;

  zakachiZebrata(k.tyalo);

  // нов ред · Enter → добавяне · ключът се ражда при рисуването на полето и се пази до успех
  for (const vhod of k.tyalo.querySelectorAll<HTMLInputElement>('[data-nova-stoynost]')) {
    const tr = vhod.closest<HTMLElement>('tr[data-nov]')!;
    const klyuch = tr.dataset['nov'] ?? '';
    const beleg = tr.querySelector<HTMLSelectElement>('[data-nov-beleg]');
    const komandaId = crypto.randomUUID();
    let vDvizhenie = false;
    beleg?.addEventListener('change', () => {
      const n = k.porta.ogledalo().nomenklaturi.get(klyuch);
      const td = tr.querySelector('[data-sledvasht]');
      if (n && td) td.textContent = String(sledvashtNomer(n, beleziOt(n, beleg.value)));
    });
    vhod.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (vDvizhenie) return;
      const n = k.porta.ogledalo().nomenklaturi.get(klyuch);
      if (!n) return;
      vDvizhenie = true;
      fokusSled = `nov:${klyuch}`;
      const r = await k.porta.izpalni(komandaId, 'nastroyki.dobaviStoynost', {
        nomenklatura: klyuch,
        tekst: vhod.value,
        belezi: beleziOt(n, beleg?.value ?? ''),
      });
      vDvizhenie = false;
      if ('otkaz' in r) {
        fokusSled = null;
        pokazhiGreshka(k.tyalo, r.zashto.join(' '));
        return;
      }
      pokazhiGreshka(k.tyalo, '');
      if (r.povtoreno) k.prerisuvay();
    });
  }

  // редакция на стойност · преименуване · спиране · връщане
  const otvori = (td: HTMLElement): void => {
    if (td.querySelector('.pole')) return;
    const tr = td.closest<HTMLElement>('tr.red')!;
    const klyuch = tr.dataset['nomenklatura'] ?? '';
    const nomer = Number(tr.dataset['nomer']);
    const beleg = tr.dataset['beleg'] ?? '';
    const spryana = tr.classList.contains('spryana');
    const staro = td.textContent?.trim() ?? '';
    const pole = document.createElement('input');
    pole.className = 'pole';
    pole.value = staro;
    td.replaceChildren(pole);
    pole.focus();
    pole.select();
    // ЕДНО действие, ЕДИН ключ: второто Enter е повторение, не второ действие
    const komandaId = crypto.randomUUID();
    const vtoriKomandaId = crypto.randomUUID();
    let zapisva = false;
    const zapishi = async (): Promise<void> => {
      if (zapisva) return;
      const n = k.porta.ogledalo().nomenklaturi.get(klyuch);
      if (!n) return;
      const tekst = pole.value.trim();
      const belezi = beleziOt(n, beleg);
      const osnova = { nomenklatura: klyuch, nomer, belezi };
      zapisva = true;
      fokusSled = `stoynost:${klyuch}:${nomer}:${beleg}`;
      let r: Awaited<ReturnType<typeof k.porta.izpalni>> | null = null;
      let dumiPredi = '';
      if (tekst === '') {
        if (!spryana) r = await k.porta.izpalni(komandaId, 'nastroyki.spriStoynost', osnova);
      } else if (spryana) {
        r = await k.porta.izpalni(komandaId, 'nastroyki.varniStoynost', osnova);
        if (!('otkaz' in r) && tekst !== staro) {
          dumiPredi = `„${staro}" е върната със стария си текст; `;
          r = await k.porta.izpalni(vtoriKomandaId, 'nastroyki.preimenuvayStoynost', {
            ...osnova,
            tekst,
          });
        }
      } else if (tekst !== staro) {
        r = await k.porta.izpalni(komandaId, 'nastroyki.preimenuvayStoynost', { ...osnova, tekst });
      }
      if (r === null) {
        k.prerisuvay();
        return;
      }
      if ('otkaz' in r) {
        zapisva = false;
        pokazhiGreshka(k.tyalo, dumiPredi + r.zashto.join(' '));
        if (dumiPredi === '') pole.focus();
        return;
      }
      pokazhiGreshka(k.tyalo, '');
      if (r.povtoreno) k.prerisuvay();
    };
    naEnterIEscape(
      pole,
      () => void zapishi(),
      () => {
        zapisva = true;
        k.prerisuvay();
      },
    );
    pole.addEventListener('blur', () => {
      if (!zapisva) k.prerisuvay();
    });
  };
  k.tyalo.addEventListener('dblclick', (e) => {
    const td = (e.target as HTMLElement).closest<HTMLElement>('[data-stoynost]');
    if (td) otvori(td);
  });
  k.tyalo.addEventListener('keydown', (e) => {
    const td = e.target as HTMLElement;
    if (td.matches?.('[data-stoynost]') && (e.key === 'Enter' || e.key === 'F2')) {
      e.preventDefault();
      otvori(td);
    }
  });

  if (fokusSled !== null) {
    const [vid, klyuch, nomer, beleg] = fokusSled.split(':');
    fokusSled = null;
    const el =
      vid === 'nov'
        ? k.tyalo.querySelector<HTMLElement>(`[data-nov="${klyuch}"] input`)
        : k.tyalo.querySelector<HTMLElement>(
            `tr.red[data-nomenklatura="${klyuch}"][data-nomer="${nomer}"][data-beleg="${beleg ?? ''}"] [data-stoynost]`,
          );
    el?.focus();
  }
}
