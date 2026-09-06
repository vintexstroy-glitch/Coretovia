/**
 * ОТВОРИ и ЗАПАЗИ · моделите на екрана, като меню и като запис (ADR-014).
 *
 * Негово: „Запази(записваш експерименталния модел за периоди напред)" и
 * „Отвори(запазен по рано модел или таблица за създаване на празна таблица и
 * после вкарване на функционалност…)".
 *
 * МОДЕЛ е именувана снимка на екранната памет за прозореца. „Отвори" я връща
 * обратно; „празна таблица" изчиства погледа до подразбраното — неговото
 * „таблица за създаване на празна таблица". Данни не се пипат никъде тук.
 *
 * Един дом за трите прозореца с бутони Отвори/Запази (правило 17).
 */

import type { KonteksNaEkrana } from '../kontekst.js';
import { pokazhiMenyu } from './menyu.js';
import { snimkaNaEkrana, vazstanoviEkrana } from './pamet-ekran.js';
import { pokazhiGreshka } from './redaktsiya.js';

/** Живите модели на един прозорец · махнатите не се предлагат. */
function modeliteNa(
  k: KonteksNaEkrana,
  prozorets: string,
): readonly { readonly ime: string; readonly snimka: Readonly<Record<string, unknown>> }[] {
  return k.porta
    .ogledalo()
    .modeli.filter((m) => m.prozorets === prozorets && m.izklyuchen !== true)
    .map((m) => ({ ime: m.ime, snimka: m.snimka }));
}

/**
 * ЗАПАЗИ · пита за име и записва СНИМКАТА на прозореца.
 *
 * Името се пита с `prompt`, защото това е един въпрос с един отговор и не иска
 * втора форма на екрана. Отказът (Escape) не пише нищо.
 */
export async function zapaziModela(k: KonteksNaEkrana, prozorets: string): Promise<void> {
  const snimka = snimkaNaEkrana(`${prozorets}.`);
  if (Object.keys(snimka).length === 0) {
    pokazhiGreshka(
      k.tyalo,
      'Прозорецът е както е по подразбиране — няма какво да се запази. Пипни филтър, такт или период и опитай пак.',
    );
    return;
  }
  const ime = globalThis.prompt?.('Име на модела (за периоди напред):', '')?.trim() ?? '';
  if (ime === '') return;
  const r = await k.porta.izpalni(crypto.randomUUID(), 'ekran.zapaziModel', {
    prozorets,
    ime,
    snimka,
  });
  pokazhiGreshka(k.tyalo, 'otkaz' in r ? r.zashto.join(' ') : `Моделът „${ime}" е записан.`);
}

/**
 * ОТВОРИ · менюто със запазените модели, плюс празната таблица.
 *
 * Празната таблица е ПЪРВА нарочно: тя е изходът от всеки объркан поглед.
 */
export function otvoriModel(k: KonteksNaEkrana, prozorets: string, el: HTMLElement): void {
  const modeli = modeliteNa(k, prozorets);
  const punktove = [
    { klyuch: '', ime: 'Празна таблица (изчисти погледа)', razreshen: true },
    ...modeli.map((m) => ({ klyuch: m.ime, ime: m.ime, razreshen: true })),
  ];
  const kutiya = el.getBoundingClientRect();
  pokazhiMenyu(
    kutiya.left,
    kutiya.bottom,
    punktove.map((p) => ({
      klyuch: p.klyuch,
      ime: p.ime,
      razreshena: p.razreshen,
      zashto: '',
      deystvie: () => {
        const izbran = modeli.find((m) => m.ime === p.klyuch);
        vazstanoviEkrana(`${prozorets}.`, izbran?.snimka ?? {});
        k.prerisuvay();
        pokazhiGreshka(
          k.tyalo,
          izbran === undefined
            ? 'Погледът е изчистен до подразбраното.'
            : `Моделът „${p.klyuch}" е отворен.`,
        );
      },
    })),
  );
}
