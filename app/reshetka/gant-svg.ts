/**
 * ДИАГРАМАТА ГАНТ · SVG до таблицата на Управление (ADR-005, решение 8).
 *
 * Редовете са ТЕЗИ на таблицата — същият ред, същата височина, измерени от
 * екрана след рисуването, за да стоят лентите точно срещу задачите си. Колоните
 * са тактовете (`koloniNaTakta`), лентата — от началото до края (`lentaNa`),
 * днешната колона е засенчена, а срокът свети по светофара му (нормално · жълто
 * седмица преди · червено два дни преди · просрочено); „Спешно и Важно" е
 * червена лента — негова дума (G18: „червн цвят в Календара").
 *
 * Отдолу стои редът СБОР под тактовете (негово, 05.09 т.1): бюджетът по началото
 * на задачите във всяка колона и броят на лентите, които я покриват. Числата
 * идват сметнати (`sboroveVKolonite` · `broyPokrivashti`); тук само се рисуват.
 */

import type { Lenta, SborVKolona, Svetofar } from '../../src/smetach/gant.js';
import type { KolonaNaTakta } from '../../src/smetach/vreme.js';
import { pishi } from '../../src/yadro/pari.js';
import { h, type Zapechatan } from './shablon.js';

export interface RedNaGanta {
  readonly id: string;
  readonly ime: string;
  /** горният ръб · спрямо началото на таблицата */
  readonly y: number;
  readonly visina: number;
  readonly lenta: Lenta | null;
  readonly svetofar: Svetofar | null;
  readonly speshno: boolean;
}

export interface GantZaRisuvane {
  readonly koloni: readonly KolonaNaTakta[];
  readonly redove: readonly RedNaGanta[];
  /** височината на главата на таблицата · главата на Ганта е същата */
  readonly visinaNaGlavata: number;
  readonly sborove: readonly SborVKolona[];
  readonly pokrivashti: readonly number[];
  readonly shirinaNaKolonata: number;
}

const VISINA_NA_SBORA = 44;

/** кратко число за тясна колона · пълното стои в `title` */
function kratko(st: number): string {
  const evro = Math.round(st / 100);
  if (Math.abs(evro) >= 1_000_000) return `${(evro / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (Math.abs(evro) >= 1_000) return `${Math.round(evro / 1_000)}k`;
  return String(evro);
}

export function gantSVG(g: GantZaRisuvane): Zapechatan {
  const w = g.shirinaNaKolonata;
  const shirina = g.koloni.length * w;
  const posledenRed = g.redove.at(-1);
  const dolu = posledenRed === undefined ? g.visinaNaGlavata : posledenRed.y + posledenRed.visina;
  const visina = dolu + VISINA_NA_SBORA;
  const chasti: Zapechatan[] = [];
  // главата · колоните · днес
  for (const [i, k] of g.koloni.entries()) {
    const x = i * w;
    chasti.push(
      h`<rect class="gant-kolona${k.dnes ? ' dnes' : ''}" x="${x}" y="0" width="${w}" height="${visina}"><title>${k.opis}</title></rect>`,
      h`<text class="gant-nadpis" x="${x + w / 2}" y="${Math.min(14, g.visinaNaGlavata - 4)}" text-anchor="middle">${k.nadpis}</text>`,
    );
  }
  // редовете · линия под всеки · лентата на задачата
  for (const r of g.redove) {
    chasti.push(
      h`<line class="gant-red" x1="0" y1="${r.y + r.visina}" x2="${shirina}" y2="${r.y + r.visina}"/>`,
    );
    if (r.lenta === null) continue;
    const x = r.lenta.ot * w;
    const sh = r.lenta.broy * w;
    const y = r.y + 4;
    const vis = Math.max(6, r.visina - 8);
    const klas = `gant-lenta ${r.svetofar ?? 'normalno'}${r.speshno ? ' speshno' : ''}${r.lenta.izlizaNalyavo ? ' nalyavo' : ''}${r.lenta.izlizaNadyasno ? ' nadyasno' : ''}`;
    chasti.push(
      h`<rect class="${klas}" data-lenta="${r.id}" x="${x}" y="${y}" width="${sh}" height="${vis}" rx="3"><title>${r.ime}</title></rect>`,
    );
  }
  // днешната линия
  const dnes = g.koloni.findIndex((k) => k.dnes);
  if (dnes >= 0)
    chasti.push(
      h`<line class="gant-dnes-liniya" x1="${dnes * w}" y1="0" x2="${dnes * w}" y2="${visina}"/>`,
    );
  // СБОР под тактовете · бюджетът по началото · броят покриващи
  chasti.push(
    h`<rect class="gant-sbor-fon" x="0" y="${dolu}" width="${shirina}" height="${VISINA_NA_SBORA}"/>`,
  );
  for (const [i, s] of g.sborove.entries()) {
    const x = i * w + w / 2;
    if (s.obhvat > 0 && s.sbor !== 0)
      chasti.push(
        h`<text class="gant-sbor" data-sbor-takt="${i}" x="${x}" y="${dolu + 16}" text-anchor="middle">${kratko(s.sbor)}<title>${pishi(s.sbor)}</title></text>`,
      );
    const b = g.pokrivashti[i] ?? 0;
    if (b > 0)
      chasti.push(
        h`<text class="gant-broy" data-broy-takt="${i}" x="${x}" y="${dolu + 34}" text-anchor="middle">${b}</text>`,
      );
  }
  return h`<svg class="gant" data-gant width="${shirina}" height="${visina}" viewBox="0 0 ${shirina} ${visina}" role="img" aria-label="Диаграма Гант">${chasti}</svg>`;
}
