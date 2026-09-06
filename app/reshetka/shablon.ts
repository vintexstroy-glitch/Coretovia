/**
 * ЗАПЕЧАТАНИЯТ HTML · единственият път от низ до екрана (резен 6м · ADR-019).
 *
 * ═══ ЗАЩО, С ЕДНО ИЗРЕЧЕНИЕ ═══
 *
 * Дотук безопасността на екрана се държеше на НАВИК: 185 викания на `ekraniraj`,
 * и всяко от тях трябваше да бъде написано. Едно забравено — и чуждо име от
 * негов `.xlsx` става изпълним код, а един изпълним ред тук чете ЦЕЛИЯ Журнал и
 * пише през Портата.
 *
 * Тук забравянето става НЕПОСТИЖИМО: няма път от обикновен низ до `innerHTML`
 * покрай тази функция. Не защото някой ще внимава, а защото другия път го няма.
 *
 * ═══ И ЕДНА ДУПКА, КОЯТО СТОЕШЕ ОТВОРЕНА ═══
 *
 * `ekraniraj` екранира `&`, `<`, `>` и `"` — но НЕ апострофа. Днес нито един
 * атрибут не се пише с единични кавички, тъй че дупка няма. Но това го пази
 * навик: първият ред `data-ime='${ime}'`, написан след година, е XSS. Тук
 * апострофът влиза в списъка и въпросът се затваря завинаги.
 *
 * ═══ ЗАЩО ВРАТАТА Е ПРЕДИ ПЕЧАТА ═══
 *
 * Негово решение, 06.09: вариант А — врата, после печат, после свидетел. Редът
 * не е предпочитание. `crypto.subtle.generateKey(…, extractable: false, …)`
 * заключва САМО `exportKey` и `wrapKey`; **`sign()` остава отворен за всеки
 * скрипт на този адрес**. Тоест подписващият ключ не може да бъде откраднат, но
 * може да бъде УПОТРЕБЕН — става подписващ оракул. Затова криптографията върху
 * адрес, който пуска чужд код, е брава на отворена врата.
 *
 * Записано е дословно в Security Considerations на W3C Web Cryptography API и е
 * платено на живо: XSS в Proton Mail (Sonar, 2024) даде ДЕШИФРИРАНИ писма при
 * налично криптиране от край до край.
 *
 * ═══ ОБРАЗЕЦЪТ ═══
 *
 * `google/safevalues` (Apache-2.0) — същият модел: запечатан тип, който само
 * една функция разпечатва. Не се внася библиотека (правило 10): двайсетина реда
 * не решават нерешен проблем, те СА решението.
 */

/**
 * ЗАПЕЧАТАН HTML · строи се само от `h`, разпечатва се само от `sloji`.
 *
 * Полето е с непроизносимо име нарочно: то не се пише на ръка, а типът не може
 * да се подправи с обикновен обектен литерал, без това да личи в диф.
 */
export interface Zapechatan {
  readonly __zapechatanHTML: string;
}

/** Всичко, написано от човек, минава оттук · вкл. апострофа. */
function ekraniray(tekst: string): string {
  return tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function eZapechatan(x: unknown): x is Zapechatan {
  return (
    typeof x === 'object' && x !== null && typeof (x as Zapechatan).__zapechatanHTML === 'string'
  );
}

/**
 * ЕДНА ВМЪКНАТА СТОЙНОСТ · как се превръща в HTML.
 *
 * · вече запечатано → влиза както си е (така се влагат шаблони един в друг);
 * · списък → всеки елемент по същото правило, слепени без разделител;
 * · `null` и `undefined` → нищо. Празното е ЛИПСА, не думата „undefined";
 * · всичко останало → текст, ЕКРАНИРАН.
 */
function stoynostta(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (eZapechatan(v)) return v.__zapechatanHTML;
  if (Array.isArray(v)) return v.map(stoynostta).join('');
  return ekraniray(typeof v === 'string' ? v : String(v));
}

/**
 * ЗАПЕЧАТВАНЕТО · и ЕДНА тиха грешка, която тук става шумна.
 *
 * Запечатан обект, вмъкнат в ОБИКНОВЕН шаблонен низ, дава `[object Object]` —
 * без грешка при сглобяване и без грешка при типовете. Тоест точно онзи вид
 * повреда, която минава портите и се вижда чак на екрана, ако някой погледне.
 *
 * Затова `toString` тук ХВЪРЛЯ. Превръщането на тихото в шумно е по-евтино от
 * всеки обход: първата такава грешка пада на място, с думи какво да се направи.
 * Полето е неизброимо, за да не се появи в `Object.keys` и в износ.
 */
function zapechatay(html: string): Zapechatan {
  const z = { __zapechatanHTML: html };
  Object.defineProperty(z, 'toString', {
    enumerable: false,
    value: () => {
      throw new TypeError(
        'Запечатан HTML в обикновен шаблон · сложи `h` пред низа или ползвай `sloji`.',
      );
    },
  });
  return z;
}

/** Шаблонът · `h\`<td>${ime}</td>\`` · всяка вмъкната стойност се екранира сама. */
export function h(chasti: TemplateStringsArray, ...stoynosti: readonly unknown[]): Zapechatan {
  let iz = chasti[0] ?? '';
  for (let i = 0; i < stoynosti.length; i += 1) {
    iz += stoynostta(stoynosti[i]) + (chasti[i + 1] ?? '');
  }
  return zapechatay(iz);
}

/**
 * ГОЛ HTML · за случаите, в които низът е НАШ и вече е готов.
 *
 * Има точно два такива: вграденият SVG на Ганта, който се строи с числа, и
 * листовете, сглобени от други наши шаблони. Всяко викане тук е РЕШЕНИЕ и се
 * вижда в диф — затова функцията се казва така, а не „безопасно".
 *
 * Обходът на чистотата брои виканията ѝ. Расте ли броят, някой е заобиколил
 * вратата и това се вижда, вместо да се промъкне.
 */
export function nashHTML(gotov: string): Zapechatan {
  return zapechatay(gotov);
}

/**
 * ПОЛИТИКАТА НА БРАУЗЪРА · Trusted Types.
 *
 * `createHTML` не чисти нищо и това е ВЯРНОТО: чистенето вече е станало в `h`,
 * при сглобяването, където се знае кое е текст и кое е разметка. Санитация
 * после, върху сглобен низ, е по-слаба — тя гадае онова, което тук се знае.
 *
 * Политиката е ЕДНА и се казва `coretovia`; директивата в `app/index.html`
 * позволява само нея. Втора политика браузърът отказва.
 */
type SPolitika = {
  createHTML(s: string): string;
  createScriptURL(s: string): string;
};

/**
 * НАШ АДРЕС НА СКРИПТ · и защо изобщо има такъв.
 *
 * Trusted Types пази ДВА вида дупка, не една: `innerHTML` (разметка) и
 * `src`/`register` (АДРЕС НА СКРИПТ). Второто изникна веднага щом директивата
 * влезе в сила — браузърът отказа `serviceWorker.register('./sw.js')` и
 * приложението остана без офлайн част, БЕЗ да падне нито един тест.
 *
 * Хванато от прохода, не от разсъждение (ADR-056). Затова тук стои тесен
 * пропуск: САМО собствен относителен път, завършващ на `.js`. Всичко друго
 * хвърля — чужд адрес няма как да мине оттук по невнимание.
 */
const NASH_SKRIPT = /^\.\/[\w./-]+\.js$/;

function samoNash(pat: string): string {
  if (!NASH_SKRIPT.test(pat)) {
    throw new TypeError(`Чужд адрес на скрипт: ${pat}`);
  }
  return pat;
}

const bezPolitika: SPolitika = { createHTML: (s) => s, createScriptURL: samoNash };

let politikata: SPolitika | null = null;
function politika(): SPolitika {
  if (politikata !== null) return politikata;
  const tt = (globalThis as { trustedTypes?: { createPolicy(i: string, p: SPolitika): SPolitika } })
    .trustedTypes;
  try {
    politikata =
      tt?.createPolicy('coretovia', {
        createHTML: (s: string) => s,
        createScriptURL: samoNash,
      }) ?? bezPolitika;
  } catch {
    // втора политика със същото име · браузърът отказва, и това не е повреда
    politikata = bezPolitika;
  }
  return politikata;
}

/** Слага запечатан HTML в възел · ЕДИНСТВЕНИЯТ път до `innerHTML` в целия екран. */
export function sloji(kade: Element, kakvo: Zapechatan): void {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: единственият дом на
  // `innerHTML` в целия екран · съдържанието е запечатано от `h`, а обходът на
  // чистотата пази никой друг да не пише тук (праг НУЛА)
  kade.innerHTML = politika().createHTML(kakvo.__zapechatanHTML) as string;
}

/**
 * Адресът на НАШ скрипт, приет от политиката · за `serviceWorker.register`.
 *
 * Връща се като низ, защото типовете на браузъра още го искат така; браузърът
 * обаче получава доверения тип и точно затова пуска регистрацията.
 */
export function nashSkript(pat: string): string {
  return politika().createScriptURL(pat) as unknown as string;
}

/** Дописва запечатан HTML накрая на възел · за градене на части. */
export function dopishi(kade: Element, kakvo: Zapechatan): void {
  const nosach = document.createElement('template');
  sloji(nosach, kakvo);
  kade.append(nosach.content);
}
