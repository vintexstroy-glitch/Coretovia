/**
 * ПАМЕТТА НА ЕКРАНА · прозорецът се отваря както е оставен.
 *
 * Най-дълбокият Windows навик: филтърът, който човек си е сложил сутринта,
 * тактът на Ганта, гледаният месец — стоят и след презареждане. Дотук всичко
 * това живееше в модулни променливи и умираше с раздела.
 *
 * ДВЕ ГРАНИЦИ, И ДВЕТЕ ТВЪРДИ:
 *
 *   1. Тук влиза САМО ЕКРАННОТО — как се гледа, не какво е вярно. Данни не
 *      влизат никога: те са в Журнала. Скриването на колона е РЕШЕНИЕ и си
 *      остава събитие през Вратата (правило 18); отметнатият филтър е поглед
 *      и живее тук.
 *   2. Липсата не е грешка. Изтрито хранилище, друг браузър, счупен запис —
 *      всичко пада мълчаливо към подразбраното. Екран, който гърми заради
 *      изгубена отметка, е по-лош от екран, който я забравя.
 *
 * Ключовете носят версия (`ui.v1.`): смени ли се формата на записаното,
 * версията се вдига и старото просто спира да се чете — не се мигрира и не
 * се гадае.
 */

const PREFIKS = 'ui.v1.';

/** Хранилището, ако го има · тестовете и node нямат `localStorage`. */
function hranilishte(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Някои среди хвърлят при самото ДОКОСВАНЕ на localStorage.
    return null;
  }
}

export function zapomniEkranno(klyuch: string, stoynost: unknown): void {
  try {
    hranilishte()?.setItem(PREFIKS + klyuch, JSON.stringify(stoynost));
  } catch {
    // Пълно или заключено хранилище: екранът работи, просто не помни.
  }
}

/**
 * Чете запомненото, или връща подаденото подразбрано.
 *
 * `inache` се връща И при счупен JSON — записът може да е повреден от
 * разширение, чистач или прекъснат запис, и това не е повод за бял екран.
 */
export function chetiEkranno<T>(klyuch: string, inache: T): T {
  try {
    const surovo = hranilishte()?.getItem(PREFIKS + klyuch);
    if (surovo === null || surovo === undefined) return inache;
    return JSON.parse(surovo) as T;
  } catch {
    return inache;
  }
}

/**
 * СНИМКАТА на един прозорец · всичко запомнено с този префикс.
 *
 * Оттук идва „моделът" на неговите Отвори/Запази (ADR-014): не се измисля втора
 * форма на записа — взима се същото, което екранът вече помни. Така всяка нова
 * запомнена настройка влиза в моделите сама, без ред код.
 */
export function snimkaNaEkrana(prefiks: string): Record<string, unknown> {
  const rez: Record<string, unknown> = {};
  const h = hranilishte();
  if (h === null) return rez;
  try {
    for (let i = 0; i < h.length; i += 1) {
      const klyuch = h.key(i);
      if (klyuch === null || !klyuch.startsWith(PREFIKS + prefiks)) continue;
      const surovo = h.getItem(klyuch);
      if (surovo === null) continue;
      rez[klyuch.slice(PREFIKS.length)] = JSON.parse(surovo);
    }
  } catch {
    // Счупен запис или заключено хранилище · снимката е каквото е успяло
  }
  return rez;
}

/**
 * ВЪЗСТАНОВЯВА снимка · чисти стария поглед на прозореца и слага новия.
 *
 * Чистенето е нарочно: модел, който само ДОПИСВА, би оставил филтър от предишния
 * поглед и човек не би разбрал защо вижда по-малко редове.
 */
export function vazstanoviEkrana(prefiks: string, snimka: Readonly<Record<string, unknown>>): void {
  const h = hranilishte();
  if (h === null) return;
  try {
    const zaMahane: string[] = [];
    for (let i = 0; i < h.length; i += 1) {
      const klyuch = h.key(i);
      if (klyuch?.startsWith(PREFIKS + prefiks)) zaMahane.push(klyuch);
    }
    for (const k of zaMahane) h.removeItem(k);
    for (const [k, v] of Object.entries(snimka)) h.setItem(PREFIKS + k, JSON.stringify(v));
  } catch {
    // Пълно или заключено хранилище: екранът работи, просто не помни
  }
}
