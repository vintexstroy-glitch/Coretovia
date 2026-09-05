/**
 * ОСНОВАТА · осемте прозореца на Книгата, преписани от нея (ADR-001 §2), и
 * таблиците, колоните и номенклатурите на резен 1 (ADR-003).
 *
 * Негови думи (05.09.2026): „Всеки шийт от ексела е равен на прозорец от
 * програмата. Само това и нищо повече или по малко." (`zadanie/00`; „шийт" е негово „шиит")
 *
 * ═══ ЕДИНСТВЕНИЯТ ДОМ (правило 14) ═══
 *
 * Имената на листовете стоят САМО тук. Никъде другаде в `src/` не се пише
 * „Управление" като низ — прозорците са ДАННИ, и тест го пази (`tests/osemte`).
 * Който иска име на прозорец, го взима оттук по ключ. Същото важи за главите
 * на колоните и за базовите стойности на номенклатурите: те са НЕГОВИТЕ думи,
 * дословно, с правописа му („Фактури Бнка" остава — той преименува). Където
 * Книгата му има ПАДАЩО МЕНЮ (валидация от списък), базата е то — така
 * стойностите са онези, които той вече избира в клетките.
 *
 * ═══ КАКВО Е И КАКВО НЕ Е ═══
 *
 * Това е преписът на СТРУКТУРАТА. Данните от неговата Книга не са тук и никога
 * няма да бъдат (правило 21): тя живее при него. Имената на листовете са
 * ДОСЛОВНО както са в Книгата — със скобата без интервал в „Настройки(Стопанин)"
 * и без интервали в „ИмотиОбектиБизнеси". Не се „оправят": файлът е Заданието.
 */

import type { ProzoretsVOsnovata } from './klyuchove.js';
import type { Kolona } from './kolona.js';
import type { Model } from './model.js';
import type { Nomenklatura, StoynostNaNomenklatura } from './nomenklatura.js';
import type { Nomeratsiya, Segment, Tablitsa } from './tablitsa.js';

export const PROZORTSI: readonly ProzoretsVOsnovata[] = Object.freeze([
  { klyuch: 'profil', list: 'Профил', lenti: [] },
  {
    klyuch: 'imoti',
    list: 'ИмотиОбектиБизнеси',
    lenti: ['Имоти', 'Обекти добавени към Имоти', 'Бизнеси'],
  },
  {
    klyuch: 'upravlenie',
    list: 'УправлениеДелаПреписки',
    lenti: ['Бутони', 'ОБЕКТИ', 'Диаграма Гант (Календар)'],
  },
  {
    klyuch: 'smetki',
    list: 'Сметки',
    lenti: [
      'Бутони',
      'ОБЕКТИ',
      'Диаграма Гант (Календар)',
      'ПРИХОД',
      'Разходи',
      'Финансови Отчети за избрания период',
    ],
  },
  {
    klyuch: 'sluzhiteli',
    list: 'Служители',
    lenti: [
      'Стопани свързани с Coretovia',
      'Служители свързани с Coretovia',
      'Достъп на Длъжности за Служител',
      'Програма за Задачи на Служители',
    ],
  },
  {
    klyuch: 'prodazhbi',
    list: 'Продажби',
    lenti: ['Таблица за продажби · първа сграда', 'Таблица за продажби · втора сграда'],
  },
  { klyuch: 'ii', list: 'ИИ', lenti: ['Активни агенти', 'Неактивни агенти'] },
  { klyuch: 'nastroyki', list: 'Настройки(Стопанин)', lenti: [] },
]);

/**
 * СЛУЖЕБНИЯТ ЛИСТ · деветият лист на изнесената Книга, който НЕ е прозорец.
 *
 * Носи версията на Модела, отпечатъка му, курсора и къде стои всяка таблица,
 * за да може резен 2 да прочете Книгата обратно, без да гадае. Скрит с
 * `veryHidden`. Четците делят листовете на прозорец · служебен · непознат.
 */
export const SLUZHEBEN_LIST = '_coretovia';

/** Прозорецът по името на листа · `undefined`, ако листът не е един от осемте. */
export function prozoretsPoList(list: string): ProzoretsVOsnovata | undefined {
  return PROZORTSI.find((p) => p.list === list.normalize('NFC').trim());
}

/* ═══════════════════════════════════════════════════════════════════════════
 * НОМЕНКЛАТУРИТЕ · базовите стойности са НЕГОВИТЕ думи (решение 18 на резен 1).
 *
 * Номерът е замразен и е редът, в който думите стоят в Книгата му. Растежът е
 * събития; живите стойности имат един дом — Огледалото.
 * ═══════════════════════════════════════════════════════════════════════════ */

function bazovi(
  teksti: readonly string[],
  belezi: StoynostNaNomenklatura['belezi'] = {},
): readonly StoynostNaNomenklatura[] {
  return Object.freeze(
    teksti.map((tekst, i) =>
      Object.freeze({ nomer: i + 1, tekst, bazova: true, spryana: false, belezi }),
    ),
  );
}

/** Ключът на номенклатурата · тук, за да се пише по име, не по низ. */
export const NOMENKLATURA = Object.freeze({
  sastoyanieNaImot: 'sastoyanie-na-imot',
  kategoriya: 'kategoriya',
  vidNaObekt: 'vid-na-obekt',
  sastoyanieNaBiznes: 'sastoyanie-na-biznes',
  vidNaZadacha: 'vid-na-zadacha',
  sastoyanieNaSmetki: 'sastoyanie-na-smetki',
  funktsiyaNaParite: 'funktsiya-na-parite',
  otsenka: 'otsenka',
  sektsiiPrihod: 'sektsii-prihod',
  sektsiiRazhodi: 'sektsii-razhodi',
  dlazhnosti: 'dlazhnosti',
} as const);

/**
 * КАТЕГОРИЯТА · неговата дума за нея е „Състояние" на Обекта (Управление C18:
 * „За Имот и за Обект са различни Състояние. Долу ги пише." — и долу стоят
 * „УПИ/Сграда/" и „УПИ/Паркинг"). Затова тук е ЕДНА номенклатура, не две:
 * „Състояние на Обект" и „Категория" са едно и също нещо с две имена, и планът
 * на резена, който броеше дванайсет, се поправя на единайсет.
 *
 * Бизнесът е трета категория (неговото `2.3.1`), без Вид и със своя таблица.
 */
const KATEGORII: readonly StoynostNaNomenklatura[] = Object.freeze([
  { nomer: 1, tekst: 'Сграда', bazova: true, spryana: false, belezi: {} },
  { nomer: 2, tekst: 'Паркинг', bazova: true, spryana: false, belezi: {} },
  {
    nomer: 3,
    tekst: 'Бизнес',
    bazova: true,
    spryana: false,
    belezi: { bezVid: true, tablitsa: 'biznesi' },
  },
]);

/**
 * Видът се номерира В категорията · `3.1.1.27` = Сграда(1) · апартамент(1) · № 27.
 * Думите са от падащото меню на листа му (валидацията в C17:C48: „склад" с малка
 * буква, макар клетките C18–C21 да пишат „Склад"); „Хале" е от Управление C22.
 */
const VIDOVE_NA_OBEKT: readonly StoynostNaNomenklatura[] = Object.freeze([
  ...bazovi(['апартамент', 'гараж', 'офис', 'склад', 'Хале'], { kategoriya: 1 }),
  ...bazovi(['НПМ'], { kategoriya: 2 }),
]);

export const NOMENKLATURI: readonly Nomenklatura[] = Object.freeze([
  {
    klyuch: NOMENKLATURA.sastoyanieNaImot,
    ime: 'Състояние на Имот',
    vid: 'zaklyucheno',
    bazovi: bazovi(['ПИ', 'УПИ', 'Строеж']),
  },
  {
    klyuch: NOMENKLATURA.kategoriya,
    ime: 'Състояние на Обект',
    vid: 'zaklyucheno',
    bazovi: KATEGORII,
  },
  {
    klyuch: NOMENKLATURA.vidNaObekt,
    ime: 'Вид на обект',
    vid: 'zaklyucheno',
    bazovi: VIDOVE_NA_OBEKT,
    podredbaPo: 'kategoriya',
  },
  {
    klyuch: NOMENKLATURA.sastoyanieNaBiznes,
    ime: 'Състояние Бизнес',
    vid: 'zaklyucheno',
    bazovi: bazovi(['ФЕЦ+Батерии', 'Батерии']),
  },
  {
    klyuch: NOMENKLATURA.vidNaZadacha,
    ime: 'Вид на задача',
    vid: 'zaklyucheno',
    bazovi: bazovi(['Дело', 'Среща', 'Преписка', 'Проект']),
  },
  {
    klyuch: NOMENKLATURA.sastoyanieNaSmetki,
    ime: 'Състояние на Сметки',
    vid: 'zaklyucheno',
    // падащото меню на Сметки E39:E91 · описано и в E16: „Сметнато, Вкарано (поле за това),
    // Прочетено(Сверено.)"
    bazovi: bazovi(['Сметнато', 'Вкарано', 'Прочетено (Сверено)']),
  },
  {
    klyuch: NOMENKLATURA.funktsiyaNaParite,
    ime: 'Функция на парите',
    vid: 'zaklyucheno',
    // падащото меню на Сметки E39:E91 (трите, които не са състояния) · описано в E12 като
    // „ФУнкция на парите в Приход и Разход: ВИждане, Смятане или Въвеждане."
    bazovi: bazovi(['Въвеждане', 'Сверяване с Банкови Извлечения', 'Вкарване']),
  },
  {
    klyuch: NOMENKLATURA.otsenka,
    ime: 'Оценка',
    vid: 'zaklyucheno',
    // падащото меню на Управление G20:G36 · четирите му думи
    bazovi: bazovi(['Спешно и Важно', 'Спешно', 'Важно', 'Нито едно']),
  },
  {
    klyuch: NOMENKLATURA.sektsiiPrihod,
    ime: 'Секции Приход',
    vid: 'zaklyucheno',
    bazovi: bazovi(['Наем Банка', 'Наем Кеш', 'Бизнес', 'Други']),
  },
  {
    klyuch: NOMENKLATURA.sektsiiRazhodi,
    ime: 'Секции Разходи',
    vid: 'zaklyucheno',
    bazovi: bazovi([
      'Заплати Кеш',
      'Фактури Кеш',
      'Фактури Карта',
      'Фактури Бнка',
      'Кредити',
      'Банкови такси',
      'Заплати Банка',
      'Бизнес',
    ]),
  },
  {
    klyuch: NOMENKLATURA.dlazhnosti,
    ime: 'Длъжности',
    vid: 'zaklyucheno',
    bazovi: bazovi(['Стопанин', 'Управител', 'Помощник Управител', 'Служител', 'Наблюдател']),
  },
]);

/* ═══════════════════════════════════════════════════════════════════════════
 * ТАБЛИЦИТЕ на ИмотиОбектиБизнеси · главите са неговите, дословно (ред 5 · 16 · 54).
 *
 * Колоната с номерацията в А няма глава в листа му при Имоти и Обекти (A5, A16
 * са празни) и има „№" при Бизнесите (A54). Тук е „№" и в трите, белязана като
 * НАША дума там, където неговата липсва — за да се чете обратно еднакво.
 * ═══════════════════════════════════════════════════════════════════════════ */

const NOMERATSIYA_KOLONA: Kolona = Object.freeze({
  klyuch: 'nomeratsiya',
  ime: '№',
  vid: 'nomeratsiya',
  zadalzhitelna: false,
  zatvorena: true,
  nashaDuma: true,
});

function tekst(klyuch: string, ime: string, zadalzhitelna = false): Kolona {
  return Object.freeze({ klyuch, ime, vid: 'tekst', zadalzhitelna, zatvorena: false });
}

/** НЕГОВОТО число „№" · цяло · при Обекти и Бизнеси е сегмент на номерацията. */
function chislo(klyuch: string, ime: string, zadalzhitelna: boolean): Kolona {
  return Object.freeze({ klyuch, ime, vid: 'chislo', zadalzhitelna, zatvorena: false });
}

function nomeratsiya(...segmenti: readonly Segment[]): Nomeratsiya {
  return Object.freeze({ razdelitel: '.', segmenti: Object.freeze([...segmenti]) });
}

function izbor(klyuch: string, ime: string, nomenklatura: string, belegOt?: string): Kolona {
  return Object.freeze({
    klyuch,
    ime,
    vid: 'izbor',
    nomenklatura,
    ...(belegOt === undefined ? {} : { belegOt }),
    zadalzhitelna: true,
    zatvorena: false,
  });
}

function vrazkaKamImot(): Kolona {
  return Object.freeze({
    klyuch: 'imot',
    ime: 'име Имот',
    vid: 'vrazka',
    vrazka: 'imoti',
    zadalzhitelna: true,
    zatvorena: false,
  });
}

/** Общите опашки на трите таблици · площ · цена · папка · адрес. */
function obshtiteKoloni(adres: string): readonly Kolona[] {
  return [
    {
      klyuch: 'plosht',
      ime: 'площ',
      vid: 'chislo',
      zadalzhitelna: false,
      zatvorena: false,
      merka: 'kvsm',
    },
    { klyuch: 'tsena', ime: 'цена', vid: 'evro', zadalzhitelna: false, zatvorena: false },
    tekst('papka', 'папка в драйва'),
    tekst('adres', adres),
  ];
}

const IMOTI: Tablitsa = Object.freeze({
  klyuch: 'imoti',
  ime: 'Имоти',
  prozorets: 'imoti',
  sashtnost: 'imot',
  koloni: [
    NOMERATSIYA_KOLONA,
    tekst('ime', 'име Имот', true),
    izbor('sastoyanie', 'Състояние', NOMENKLATURA.sastoyanieNaImot),
    chislo('nomer', '№', false),
    ...obshtiteKoloni('адрес гугъл'),
  ],
  nomeratsiya: nomeratsiya({ ot: 'broyach' }),
});

const OBEKTI: Tablitsa = Object.freeze({
  klyuch: 'obekti',
  ime: 'Обекти добавени към Имоти',
  prozorets: 'imoti',
  sashtnost: 'obekt',
  koloni: [
    NOMERATSIYA_KOLONA,
    vrazkaKamImot(),
    izbor('kategoriya', 'Състояние', NOMENKLATURA.kategoriya),
    izbor('vid', 'Състояние', NOMENKLATURA.vidNaObekt, 'kategoriya'),
    chislo('nomer', '№', true),
    ...obshtiteKoloni('адрес в гугъл карти'),
  ],
  roditel: { tablitsa: 'imoti', kolona: 'imot' },
  nomeratsiya: nomeratsiya(
    { ot: 'roditel' },
    { ot: 'nomenklatura', kolona: 'kategoriya' },
    { ot: 'nomenklatura', kolona: 'vid' },
    { ot: 'kolona', kolona: 'nomer' },
  ),
  grupirane: [{ kolona: 'imot' }, { kolona: 'kategoriya', vKletkataNa: 'vid' }],
});

const BIZNESI: Tablitsa = Object.freeze({
  klyuch: 'biznesi',
  ime: 'Бизнеси (работещи в Имотите без Обекти и без Продажба и без Наеми Наем, а с вид Бизнес.)',
  prozorets: 'imoti',
  sashtnost: 'biznes',
  koloni: [
    NOMERATSIYA_KOLONA,
    vrazkaKamImot(),
    izbor('sastoyanie', 'Състояние Бизнес', NOMENKLATURA.sastoyanieNaBiznes),
    chislo('nomer', '№ Обект', true),
    ...obshtiteKoloni('адрес в гугъл карти'),
    tekst('drugi', 'други(при нужда)'),
  ],
  roditel: { tablitsa: 'imoti', kolona: 'imot' },
  nomeratsiya: nomeratsiya(
    { ot: 'roditel' },
    { ot: 'kategoriya-fiksirana', nomer: 3 },
    { ot: 'kolona', kolona: 'nomer' },
  ),
  grupirane: [{ kolona: 'imot' }],
});

export const TABLITSI: readonly Tablitsa[] = Object.freeze([IMOTI, OBEKTI, BIZNESI]);

/** МОДЕЛЪТ на резен 1 · единственият екземпляр в кода. */
export const MODEL: Model = Object.freeze({
  versiya: 1,
  prozortsi: PROZORTSI,
  tablitsi: new Map(TABLITSI.map((t) => [t.klyuch, t])),
  nomenklaturi: new Map(NOMENKLATURI.map((n) => [n.klyuch, n])),
});
