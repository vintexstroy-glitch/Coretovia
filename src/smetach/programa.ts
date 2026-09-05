/**
 * ПРОГРАМАТА ЗА ЗАДАЧИ на Служителите · неговото A23 (ADR-008 · ADR-009).
 *
 * Негови глави: „Име Служител" · „днешни задачи" · „седмични задачи в таблица".
 * До резен 4б Книгата нямаше кой да носи задачата и двете числа стояха с тире.
 * Негова дума, 05.09: „Да се добави отговорник за всяка задача." — оттам насетне
 * колоната `otgovornik` на задачата сочи ЧОВЕК от листа Служители, и програмата
 * се СМЯТА от нея.
 *
 * ДНЕШНА е задачата, чийто период покрива днешния ден; СЕДМИЧНА — тази, която
 * покрива поне един ден от текущата седмица (понеделник–неделя). Задача без
 * начало не се брои никъде: тя няма кога да е (правило 12 — липсата се казва на
 * екрана, не се замества с днешна дата).
 *
 * Нищо тук не пише: чисто смятане върху Огледалото.
 */

import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { kletkaNa, zhiviteRedove } from '../ogledalo/tablitsa.js';
import { imeNaReda } from './kletki.js';

const ZADACHI = 'zadachi';
const HORA = ['stopani', 'sluzhiteli'] as const;
const KOLONA_OTGOVORNIK = 'otgovornik';

export interface RedNaProgramata {
  /** id-то на човека · `stopan:…` или `sluzhitel:…` */
  readonly id: string;
  readonly tablitsa: string;
  readonly ime: string;
  readonly dneshni: number;
  readonly sedmichni: number;
  /** всички живи задачи, които носи · за сверката */
  readonly vsichki: number;
}

export interface Programata {
  readonly redove: readonly RedNaProgramata[];
  /** живи задачи без отговорник · казват се, не се разпределят */
  readonly bezOtgovornik: number;
  /** задачи, чийто отговорник вече не е жив ред · находка за човек */
  readonly kamNezhivi: number;
  readonly broyZadachi: number;
}

/** Ден плюс N дни · ГГГГ-ММ-ДД, по UTC (датите в Книгата нямат час). */
function plyusDni(den: string, dni: number): string {
  const d = new Date(`${den}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dni);
  return d.toISOString().slice(0, 10);
}

/** Понеделникът на седмицата, в която пада този ден · неделя е седмият ѝ ден. */
export function nachaloNaSedmitsata(dnes: string): string {
  const den = new Date(`${dnes}T00:00:00.000Z`).getUTCDay();
  return plyusDni(dnes, -(den === 0 ? 6 : den - 1));
}

/** Периодът на задачата покрива ли отрязъка [ot, sled) · краят липсва → един ден. */
function pokriva(ot: string, doo: string, otOtryazak: string, sledOtryazak: string): boolean {
  if (ot === '') return false;
  const kray = doo === '' ? ot : doo;
  return ot < sledOtryazak && kray >= otOtryazak;
}

function tekstNa(o: Ogledalo, tablitsa: string, i: number, kolona: string): string {
  const tv = o.tablitsi.get(tablitsa);
  const k = tv === undefined ? null : kletkaNa(tv, i, kolona);
  return k !== null && 'tekst' in k ? k.tekst : '';
}

/**
 * Програмата · по един ред на ЧОВЕК (Стопани, после Служители), в реда на
 * листа му. Човек без нито една задача също стои: празният ред е отговор.
 */
export function programata(o: Ogledalo, dnes: string): Programata {
  const zhiviHora = new Set<string>();
  for (const tablitsa of HORA) {
    const tv = o.tablitsi.get(tablitsa);
    if (tv === undefined) continue;
    for (const i of zhiviteRedove(tv)) zhiviHora.add(tv.id[i] ?? '');
  }

  const otSedmitsata = nachaloNaSedmitsata(dnes);
  const sledSedmitsata = plyusDni(otSedmitsata, 7);
  const sledDnes = plyusDni(dnes, 1);
  const poId = new Map<string, { dneshni: number; sedmichni: number; vsichki: number }>();
  const tvZ = o.tablitsi.get(ZADACHI);
  let bezOtgovornik = 0;
  let kamNezhivi = 0;
  let broyZadachi = 0;

  if (tvZ !== undefined) {
    for (const i of zhiviteRedove(tvZ)) {
      broyZadachi += 1;
      const chovek = tekstNa(o, ZADACHI, i, KOLONA_OTGOVORNIK);
      if (chovek === '') {
        bezOtgovornik += 1;
        continue;
      }
      if (!zhiviHora.has(chovek)) {
        kamNezhivi += 1;
        continue;
      }
      const ot = tekstNa(o, ZADACHI, i, 'ot');
      const doo = tekstNa(o, ZADACHI, i, 'do');
      const b = poId.get(chovek) ?? { dneshni: 0, sedmichni: 0, vsichki: 0 };
      b.vsichki += 1;
      if (pokriva(ot, doo, dnes, sledDnes)) b.dneshni += 1;
      if (pokriva(ot, doo, otSedmitsata, sledSedmitsata)) b.sedmichni += 1;
      poId.set(chovek, b);
    }
  }

  const redove: RedNaProgramata[] = [];
  for (const tablitsa of HORA) {
    const tv = o.tablitsi.get(tablitsa);
    if (tv === undefined) continue;
    for (const i of zhiviteRedove(tv)) {
      const id = tv.id[i] ?? '';
      const b = poId.get(id) ?? { dneshni: 0, sedmichni: 0, vsichki: 0 };
      redove.push({
        id,
        tablitsa,
        ime: imeNaReda(o, tablitsa, id),
        dneshni: b.dneshni,
        sedmichni: b.sedmichni,
        vsichki: b.vsichki,
      });
    }
  }

  return { redove, bezOtgovornik, kamNezhivi, broyZadachi };
}
