/**
 * НОМЕНКЛАТУРАТА · списък от стойности със ЗАМРАЗЕН номер (ADR-003).
 *
 * Негово, 05.09: „таб в Главни Настройки за всички номенклатури в правилна
 * обща таблица с възможност за редакция, триене, създаване, просто пишейки в
 * таблицата". И от 03.09 (MasterBook, ADR-157): „меню, върху което системата
 * СМЯТА, расте само от Настройки".
 *
 * ═══ ТРИТЕ ЗАКОНА ═══
 *
 *   1. НОМЕРЪТ Е ЗАМРАЗЕН. Стойността получава номер при раждането си (1, 2, 3…
 *      в реда на създаване) и го носи завинаги. Номерацията `3.1.1.27` стъпва
 *      върху номера, не върху текста — затова преименуването не я чупи.
 *   2. ТРИЕНЕ НЯМА · има СПИРАНЕ. Спряната стойност не се предлага, но старите
 *      редове я пазят (правило 1). Връщането е същото събитие със `spryana: false`.
 *   3. ТЕКСТЪТ Е УНИКАЛЕН — сред живите И сред спрените. Пише ли човек текст на
 *      спряна стойност, отговорът е „върни я", не нов номер.
 *
 * Базовите стойности са НЕГОВИТЕ думи (`osnova.ts`); растежът е събития; живите
 * стойности имат ЕДИН дом — Огледалото. Тук са само данните и чистите
 * функции върху тях, без нито един внос от домейна.
 */

export type VidVhod = 'zaklyucheno' | 'otvoreno';

/** Белезите на една стойност · какво ЗНАЧИ тя за сметача (например коя категория). */
export type Belezi = Readonly<Record<string, string | number | boolean>>;

export interface StoynostNaNomenklatura {
  /** замразен · 1-базиран · в обхвата си (виж `podredbaPo`) */
  readonly nomer: number;
  /** дословно · с главните и правописа на човека */
  readonly tekst: string;
  /** негова от Книгата, или добавена от Настройки */
  readonly bazova: boolean;
  /** спряна = не се предлага · старите редове я пазят */
  readonly spryana: boolean;
  readonly belezi: Belezi;
}

/** Описанието на една номенклатура в Модела · СТРУКТУРА + базови, без живото. */
export interface Nomenklatura {
  readonly klyuch: string;
  readonly ime: string;
  readonly vid: VidVhod;
  readonly bazovi: readonly StoynostNaNomenklatura[];
  /**
   * По кой белег се брои номерът · например „Вид на обект" номерира В категорията:
   * апартамент 1 · гараж 2 · офис 3 · склад 4 · Хале 5 под „Сграда", НПМ 1 под „Паркинг".
   * Липсва ли, номерът е един за цялата номенклатура.
   */
  readonly podredbaPo?: string;
}

/** Живата номенклатура · както я носи Огледалото. */
export interface ZhivaNomenklatura {
  readonly klyuch: string;
  readonly ime: string;
  readonly vid: VidVhod;
  readonly podredbaPo?: string;
  readonly stoynosti: readonly StoynostNaNomenklatura[];
}

export class GreshkaNomenklatura extends Error {}

/**
 * Подравняване на текст за сравнение · trim + свиване на интервали.
 *
 * НАРОЧНО без `toLowerCase`: „Акт 15" и „акт 15" могат да са различни неща в
 * различни списъци (пренос на закона от `padashti-menyuta.ts`).
 */
export function podravni(tekst: string): string {
  return tekst.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function zhivite(n: ZhivaNomenklatura): readonly StoynostNaNomenklatura[] {
  return n.stoynosti.filter((s) => !s.spryana);
}

/** Обхватът на стойността · празен без `podredbaPo`; иначе стойността на белега. */
function obhvat(n: ZhivaNomenklatura, belezi: Belezi): string {
  return n.podredbaPo === undefined ? '' : String(belezi[n.podredbaPo] ?? '');
}

/** Ключът на стойността · обхват + номер · ЕДИН за (Сграда, 1) и друг за (Паркинг, 1). */
function klyuchNaStoynost(
  n: ZhivaNomenklatura,
  s: { readonly nomer: number; readonly belezi: Belezi },
): string {
  return `${obhvat(n, s.belezi)}#${s.nomer}`;
}

/**
 * По номер · при номенклатура по белег белегът е ЗАДЪЛЖИТЕЛЕН — без него не
 * се намира нищо, вместо да се върне мълчаливо първата с този номер.
 */
export function poNomer(
  n: ZhivaNomenklatura,
  nomer: number,
  belezi: Belezi = {},
): StoynostNaNomenklatura | undefined {
  if (n.podredbaPo !== undefined && belezi[n.podredbaPo] === undefined) return undefined;
  const k = klyuchNaStoynost(n, { nomer, belezi });
  return n.stoynosti.find((s) => klyuchNaStoynost(n, s) === k);
}

export function poTekst(n: ZhivaNomenklatura, tekst: string): StoynostNaNomenklatura | undefined {
  const t = podravni(tekst);
  return n.stoynosti.find((s) => podravni(s.tekst) === t);
}

/** Обхватът, в който се брои номерът · всички, или само тези със същия белег. */
function vObhvata(n: ZhivaNomenklatura, belezi: Belezi): readonly StoynostNaNomenklatura[] {
  const po = n.podredbaPo;
  if (po === undefined) return n.stoynosti;
  return n.stoynosti.filter((s) => s.belezi[po] === belezi[po]);
}

/** Следващият свободен номер · най-големият в обхвата + 1 · спрените се броят. */
export function sledvashtNomer(n: ZhivaNomenklatura, belezi: Belezi = {}): number {
  let nay = 0;
  for (const s of vObhvata(n, belezi)) if (s.nomer > nay) nay = s.nomer;
  return nay + 1;
}

/**
 * ДОБАВЯНЕ · връща новата стойност или отказва с думи.
 *
 * Отказът за спряна е нарочно различен от отказа за жива: човекът трябва да
 * разбере, че думата вече съществува и чака връщане, а не да я напише втори
 * път под нов номер.
 */
export function dobavi(
  n: ZhivaNomenklatura,
  tekst: string,
  belezi: Belezi = {},
): StoynostNaNomenklatura {
  const t = podravni(tekst);
  if (t === '') throw new GreshkaNomenklatura('Стойността не може да е празна.');
  if (n.podredbaPo !== undefined && belezi[n.podredbaPo] === undefined) {
    throw new GreshkaNomenklatura(`„${n.ime}" се номерира по „${n.podredbaPo}" — избери го първо.`);
  }
  const veche = poTekst(n, t);
  if (veche !== undefined) {
    throw new GreshkaNomenklatura(
      veche.spryana
        ? `„${t}" вече съществува като СПРЯНА (№ ${veche.nomer}) — върни я, вместо да я пишеш втори път.`
        : `„${t}" вече е в „${n.ime}" (№ ${veche.nomer}).`,
    );
  }
  return { nomer: sledvashtNomer(n, belezi), tekst: t, bazova: false, spryana: false, belezi };
}

/** ПРЕИМЕНУВАНЕ · същият номер, нов текст · върху съществуващ текст се отказва. */
export function preimenuvay(
  n: ZhivaNomenklatura,
  nomer: number,
  tekst: string,
  belezi: Belezi = {},
): StoynostNaNomenklatura {
  const t = podravni(tekst);
  if (t === '')
    throw new GreshkaNomenklatura('Стойността не може да е празна — за махане ползвай спиране.');
  const stara = poNomer(n, nomer, belezi);
  if (stara === undefined) throw new GreshkaNomenklatura(`Няма стойност № ${nomer} в „${n.ime}".`);
  const druga = poTekst(n, t);
  if (druga !== undefined && klyuchNaStoynost(n, druga) !== klyuchNaStoynost(n, stara)) {
    throw new GreshkaNomenklatura(`„${t}" вече е № ${druga.nomer} в „${n.ime}".`);
  }
  return { ...stara, tekst: t };
}

/** СПИРАНЕ или ВРЪЩАНЕ · същият номер · само флагът се мени. */
export function spri(
  n: ZhivaNomenklatura,
  nomer: number,
  spryana: boolean,
  belezi: Belezi = {},
): StoynostNaNomenklatura {
  const stara = poNomer(n, nomer, belezi);
  if (stara === undefined) throw new GreshkaNomenklatura(`Няма стойност № ${nomer} в „${n.ime}".`);
  return { ...stara, spryana };
}

/** Нова версия на списъка със сложена (добавена или сменена) стойност · по ключ. */
export function sStoynost(
  n: ZhivaNomenklatura,
  stoynost: StoynostNaNomenklatura,
): ZhivaNomenklatura {
  const k = klyuchNaStoynost(n, stoynost);
  const ima = n.stoynosti.some((s) => klyuchNaStoynost(n, s) === k);
  const stoynosti = ima
    ? n.stoynosti.map((s) => (klyuchNaStoynost(n, s) === k ? stoynost : s))
    : [...n.stoynosti, stoynost];
  return { ...n, stoynosti: Object.freeze(stoynosti) };
}

/** Живата номенклатура от базовите · началото, преди което и да е събитие. */
export function otBazovite(n: Nomenklatura): ZhivaNomenklatura {
  const zh: ZhivaNomenklatura = {
    klyuch: n.klyuch,
    ime: n.ime,
    vid: n.vid,
    stoynosti: Object.freeze([...n.bazovi]),
  };
  return n.podredbaPo === undefined ? zh : { ...zh, podredbaPo: n.podredbaPo };
}

/** Броячът на една номенклатура · живи · спрени · всички · за екрана. */
export function broyachNaNomenklaturata(n: ZhivaNomenklatura): {
  readonly zhivi: number;
  readonly spreni: number;
  readonly vsichki: number;
} {
  const zhivi = zhivite(n).length;
  return { zhivi, spreni: n.stoynosti.length - zhivi, vsichki: n.stoynosti.length };
}
