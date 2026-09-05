/**
 * МОДЕЛЪТ · прозорци → таблици → колони → номенклатури, като ДАННИ (ADR-003).
 *
 * Негово, 05.09: „…да се управлява от изкуствен интелект, които да използва само
 * функционалноста на кода като ограничением…". Затова структурата на
 * прозорците е данни: агентът (резен 7) ще я мени с команди, не с код.
 *
 * Моделът е СТРУКТУРА + базови стойности. Живите стойности на номенклатурите
 * имат един дом — Огледалото (правило 14). Тук няма състояние.
 */

import type { ProzoretsVOsnovata } from './klyuchove.js';
import type { Nomenklatura } from './nomenklatura.js';
import type { Tablitsa } from './tablitsa.js';

export interface Model {
  readonly versiya: number;
  readonly prozortsi: readonly ProzoretsVOsnovata[];
  readonly tablitsi: ReadonlyMap<string, Tablitsa>;
  readonly nomenklaturi: ReadonlyMap<string, Nomenklatura>;
}

/** Таблицата по ключ · хвърля с думи, защото липсата ѝ е грешка в кода, не в данните. */
export function tablitsata(m: Model, klyuch: string): Tablitsa {
  const t = m.tablitsi.get(klyuch);
  if (t === undefined) throw new Error(`Няма таблица „${klyuch}" в Модела.`);
  return t;
}

export function nomenklaturata(m: Model, klyuch: string): Nomenklatura {
  const n = m.nomenklaturi.get(klyuch);
  if (n === undefined) throw new Error(`Няма номенклатура „${klyuch}" в Модела.`);
  return n;
}

/**
 * ПРОВЕРКАТА НА МОДЕЛА · връща списък от думи; празен значи здрав.
 *
 * Тест го пуска върху основата. Всяка находка е изречение с адрес, за да може
 * човек да я поправи, без да гадае.
 */
export function proveriModela(m: Model): readonly string[] {
  const nahodki: string[] = [];
  const prozortsi = new Set(m.prozortsi.map((p) => p.klyuch));
  if (m.prozortsi.length !== 8) {
    nahodki.push(`Прозорците са ${m.prozortsi.length}, а трябва да са 8.`);
  }

  for (const t of m.tablitsi.values()) {
    const adres = (k: string): string => `Колона „${t.klyuch}.${k}"`;
    if (!prozortsi.has(t.prozorets)) {
      nahodki.push(`Таблица „${t.klyuch}" сочи непознат прозорец „${t.prozorets}".`);
    }
    const klyuchove = new Set<string>();
    for (const k of t.koloni) {
      if (klyuchove.has(k.klyuch))
        nahodki.push(`Таблица „${t.klyuch}" има две колони „${k.klyuch}".`);
      klyuchove.add(k.klyuch);
      if (k.vid === 'izbor') {
        const n = k.nomenklatura === undefined ? undefined : m.nomenklaturi.get(k.nomenklatura);
        if (n === undefined) nahodki.push(`${adres(k.klyuch)} е избор без номенклатура.`);
        else if (n.podredbaPo !== undefined && k.belegOt === undefined) {
          nahodki.push(`${adres(k.klyuch)} избира по белег, а не казва от коя колона го взима.`);
        }
      } else if (k.nomenklatura !== undefined) {
        nahodki.push(`${adres(k.klyuch)} носи номенклатура, а не е избор.`);
      }
      if (k.vid === 'vrazka' && (k.vrazka === undefined || !m.tablitsi.has(k.vrazka))) {
        nahodki.push(`${adres(k.klyuch)} е връзка към непозната таблица.`);
      }
      if (k.vid === 'nomeratsiya' && !k.zatvorena) {
        nahodki.push(`${adres(k.klyuch)} е номерация, а не е затворена.`);
      }
    }
    if (t.roditel !== undefined) {
      if (!m.tablitsi.has(t.roditel.tablitsa)) {
        nahodki.push(`Таблица „${t.klyuch}" има родител „${t.roditel.tablitsa}", който го няма.`);
      }
      if (!klyuchove.has(t.roditel.kolona)) {
        nahodki.push(
          `Таблица „${t.klyuch}" сочи родителя през колона „${t.roditel.kolona}", която я няма.`,
        );
      }
    }
    for (const s of t.nomeratsiya?.segmenti ?? []) {
      if (s.ot === 'roditel' && t.roditel === undefined) {
        nahodki.push(`Номерацията на „${t.klyuch}" иска родител, а таблицата няма.`);
      }
      if ((s.ot === 'nomenklatura' || s.ot === 'kolona') && !klyuchove.has(s.kolona)) {
        nahodki.push(`Номерацията на „${t.klyuch}" сочи колона „${s.kolona}", която я няма.`);
      }
    }
    for (const g of t.grupirane ?? []) {
      if (!klyuchove.has(g.kolona)) {
        nahodki.push(`Групирането на „${t.klyuch}" сочи колона „${g.kolona}", която я няма.`);
      }
      if (g.vKletkataNa !== undefined && !klyuchove.has(g.vKletkataNa)) {
        nahodki.push(
          `Групирането на „${t.klyuch}" слага „${g.kolona}" в клетката на „${g.vKletkataNa}", която я няма.`,
        );
      }
    }
  }

  for (const n of m.nomenklaturi.values()) {
    const teksti = new Set<string>();
    const nomera = new Set<string>();
    for (const s of n.bazovi) {
      const obhvat = n.podredbaPo === undefined ? '' : String(s.belezi[n.podredbaPo] ?? '');
      const klyuchNaNomer = `${obhvat}#${s.nomer}`;
      if (nomera.has(klyuchNaNomer)) {
        nahodki.push(`Номенклатура „${n.klyuch}" има два пъти номер ${s.nomer}.`);
      }
      nomera.add(klyuchNaNomer);
      if (teksti.has(s.tekst))
        nahodki.push(`Номенклатура „${n.klyuch}" има два пъти „${s.tekst}".`);
      teksti.add(s.tekst);
      if (n.podredbaPo !== undefined && s.belezi[n.podredbaPo] === undefined) {
        nahodki.push(`„${s.tekst}" в „${n.klyuch}" няма белег „${n.podredbaPo}".`);
      }
      if (!s.bazova)
        nahodki.push(`„${s.tekst}" в „${n.klyuch}" е базова, а не е белязана като такава.`);
    }
  }
  return nahodki;
}
