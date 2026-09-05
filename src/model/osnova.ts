/**
 * ОСНОВАТА · осемте прозореца на Книгата, преписани от нея (ADR-001 §2),
 * таблиците, колоните и номенклатурите на резен 1 (ADR-003), задачите и
 * бутоните на Управление от резен 3 (ADR-005).
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

/**
 * ЛЕНТИТЕ на двете му таблици с продажби · A3 и A60, ДОСЛОВНО (правило 21).
 *
 * Двете са за РАЗЛИЧНИ сгради и с различни глави: първата няма „евро/квадрат", а
 * вноските ѝ се казват „смр" там, където втората казва „кеш". Едно и също нещо,
 * два негови правописа — затова смятането върви по БЕЛЕГ, не по дума (ADR-010).
 */
export const LENTA_NA_PARVATA_SGRADA =
  'Т А Б Л И Ц А  за продажби на Винтекс Строй ЕАД в обект: "ЖИЛИЩНА СГРАДА С ПОДЗЕМНИ ГАРАЖИ  УПИ ІХ-1691,1692, кв. 47, м. Студентски град, р-н Студентски, гр. София"';
export const LENTA_NA_VTORATA_SGRADA =
  'Т А Б Л И Ц А  за продажбите на Винтекс Строй ЕАД в обект: ЖИЛИЩНА СГРАДА С ПОДЗЕМНИ ГАРАЖИ в УПИ V-3508, кв. 56, м. Малинова долина, р-н Студентски, гр. София';

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
    lenti: [LENTA_NA_PARVATA_SGRADA, LENTA_NA_VTORATA_SGRADA],
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
    vrazka: ['imoti'],
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

/* ═══════════════════════════════════════════════════════════════════════════
 * ЗАДАЧИТЕ на УправлениеДелаПреписки · неговите глави (ред 17 · подглави ред 18).
 *
 * „Дело към Имот или към Обект" (B1–B3) — и Проект към Бизнес (A34–E36):
 * родителят е ЕДИН от трите реда на Имоти, затова връзката сочи трите таблици и
 * префиксът на id-то казва коя. Клетката E20 при него е „Дело / Сондаж" — вид и
 * име в една клетка; F18 „Начало/Край" — две дати в една. В Модела са по две
 * колони (видът е замразен номер, редовете пазят номера), в Книгата — слети.
 * Задачата няма номерация: неговите редове със задачи имат празно A.
 * ═══════════════════════════════════════════════════════════════════════════ */

const ZADACHI_KOLONI: readonly Kolona[] = [
  {
    klyuch: 'kam',
    ime: 'име Имот',
    vid: 'vrazka',
    vrazka: ['imoti', 'obekti', 'biznesi'],
    zadalzhitelna: true,
    zatvorena: false,
    vKlyucha: true,
    kratko: 'към',
  },
  {
    ...izbor(
      'vid',
      ' Задачи(нещо като състояние за Делата, Срещите и Преписките).',
      NOMENKLATURA.vidNaZadacha,
    ),
    vKlyucha: true,
    kratko: 'Вид',
  },
  // главата му E17 е за ВИДА; името е опашката на слятата клетка · нашата дума
  { ...tekst('ime', 'име на задачата', true), nashaDuma: true, vKlyucha: true, kratko: 'име' },
  {
    klyuch: 'ot',
    ime: 'Дата',
    vid: 'data',
    zadalzhitelna: false,
    zatvorena: false,
    vKlyucha: true,
    kratko: 'Начало',
  },
  {
    klyuch: 'do',
    ime: 'Край',
    vid: 'data',
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
  },
  {
    klyuch: 'otsenka',
    ime: 'Оценка',
    vid: 'izbor',
    nomenklatura: NOMENKLATURA.otsenka,
    zadalzhitelna: false,
    zatvorena: false,
  },
  {
    klyuch: 'byudzhet',
    ime: 'Бюджет Дела/ Бюджет Сметки',
    vid: 'evro',
    zadalzhitelna: false,
    zatvorena: false,
  },
  // НЕГОВО, 05.09: „Да се добави отговорник за всяка задача." Колоната я няма в
  // листа му — затова е НАША дума и стои НАКРАЯ, за да не мръдне негов адрес.
  {
    klyuch: 'otgovornik',
    ime: 'Отговорник',
    vid: 'vrazka',
    vrazka: ['stopani', 'sluzhiteli'],
    samoSochi: true,
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
    kratko: 'Отговорник',
  },
];

const ZADACHI: Tablitsa = Object.freeze({
  klyuch: 'zadachi',
  ime: 'ОБЕКТИ',
  prozorets: 'upravlenie',
  sashtnost: 'zadacha',
  koloni: ZADACHI_KOLONI,
  slyati: [
    { kolona: 'vid', opashka: 'ime', razdelitel: ' / ' },
    { kolona: 'ot', opashka: 'do', razdelitel: ' / ' },
  ],
  podglava: {
    vid: 'Дело, Среща, Преписка(редактират се и премахват и създават от Настройки в Нуменклатури)',
    ot: 'Начало/Край',
    otsenka: 'Спешно и Важно(червн цвят в Календара(Диагарамата Хант)',
  },
  redFiltar: true,
});

/* ═══════════════════════════════════════════════════════════════════════════
 * СМЕТКИ · ДВИЖЕНИЕТО и КЕШЪТ
 *
 * Редът с пари в листа му (38–91): към Имот · Обект · Бизнес, или без родител
 * (заплати · кредити · банкови такси), с ИМЕ в колона C („[служител 1]" ·
 * „Малинова Строителство"), СЕКЦИЯ (лентите му ПРИХОД и Разходи и главите под
 * тях), ФУНКЦИЯ на парите и СЪСТОЯНИЕ на сметката в една слята клетка E —
 * негово E81: „Вкарване / Сверяване с Банкови Извлечения" — месец и сума.
 *
 * ЗНАКЪТ решава страната (правило 20): приходът е +, разходът е −; секцията
 * трябва да е от страната на знака. „Бизнес" е дума и в двете номенклатури —
 * точно неговото B6: „Ако е на загуба се изпраща сметката с знак - в Разходи."
 *
 * МЕСЕЦЪТ е наша колона под неговата глава „Дата": дванайсетте такта на Ганта,
 * месечната сверка на кеша и периодът искат момент, а листът му няма дата тук.
 * ═══════════════════════════════════════════════════════════════════════════ */

const DVIZHENIYA_KOLONI: readonly Kolona[] = [
  {
    klyuch: 'kam',
    ime: 'име Имот',
    vid: 'vrazka',
    vrazka: ['imoti', 'obekti', 'biznesi'],
    zadalzhitelna: false,
    zatvorena: false,
    vKlyucha: true,
    kratko: 'към',
  },
  {
    ...tekst('ime', 'име на реда'),
    nashaDuma: true,
    vKlyucha: true,
    kratko: 'име',
  },
  {
    klyuch: 'sektsiya',
    ime: 'секция в ПРИХОД',
    vid: 'izbor',
    nomenklatura: NOMENKLATURA.sektsiiPrihod,
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
    vKlyucha: true,
    strana: 'prihod',
    kratko: 'Приход',
  },
  {
    klyuch: 'sektsiyaR',
    ime: 'секция в Разходи',
    vid: 'izbor',
    nomenklatura: NOMENKLATURA.sektsiiRazhodi,
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
    vKlyucha: true,
    strana: 'razhod',
    kratko: 'Разход',
  },
  {
    klyuch: 'funktsiya',
    ime: 'Функция на парите',
    vid: 'izbor',
    nomenklatura: NOMENKLATURA.funktsiyaNaParite,
    zadalzhitelna: true,
    zatvorena: false,
    vKlyucha: true,
    kratko: 'Функция',
  },
  {
    klyuch: 'sastoyanie',
    ime: 'Вид Сметка',
    vid: 'izbor',
    nomenklatura: NOMENKLATURA.sastoyanieNaSmetki,
    zadalzhitelna: false,
    zatvorena: false,
    kratko: 'Състояние',
  },
  {
    klyuch: 'mesets',
    ime: 'месец',
    vid: 'tekst',
    zadalzhitelna: true,
    zatvorena: false,
    nashaDuma: true,
    vKlyucha: true,
    kratko: 'месец',
  },
  {
    klyuch: 'suma',
    ime: 'Бюджет Дела/ Бюджет Сметки',
    vid: 'evro',
    zadalzhitelna: true,
    zatvorena: false,
    kratko: 'сума',
  },
];

const DVIZHENIYA: Tablitsa = Object.freeze({
  klyuch: 'dvizheniya',
  ime: 'Сметки',
  prozorets: 'smetki',
  sashtnost: 'dvizhenie',
  koloni: DVIZHENIYA_KOLONI,
  slyati: [{ kolona: 'funktsiya', opashka: 'sastoyanie', razdelitel: ' / ' }],
  podglava: {
    funktsiya:
      'Вид Задачи: Дело, Среща, Преписка и Вид Сметка: Сметнато, Вкарано (поле за това), Прочетено(Сверено.)',
    mesets: 'Начало ',
    suma: 'знак(Евро)',
  },
  redFiltar: true,
});

/**
 * КЕШЪТ · негово, 05.09: „ред … който ред дава възможност за въвеждане на
 * информация за дадени Кеш пари за Заплати и Фактури Кеш и сверка на края на
 * месеца от извлечението." Един ред на МЕСЕЦ; живее в залепената част на екрана
 * и — за да остане Ексел движеща сила — в края на листа Сметки, под неговите
 * блокове, за да не мръдне нито един негов адрес.
 */
const KESH_KOLONI: readonly Kolona[] = [
  {
    klyuch: 'mesets',
    ime: 'месец',
    vid: 'tekst',
    zadalzhitelna: true,
    zatvorena: false,
    nashaDuma: true,
    vKlyucha: true,
  },
  {
    klyuch: 'zaplati',
    ime: 'дадени за Заплати Кеш',
    vid: 'evro',
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
  },
  {
    klyuch: 'fakturi',
    ime: 'дадени за Фактури Кеш',
    vid: 'evro',
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
  },
  {
    klyuch: 'izvlechenie',
    ime: 'изтеглено по извлечение',
    vid: 'evro',
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
  },
];

/**
 * ДДС · един ред на МЕСЕЦ (негово, 05.09 т.2): „Върни ДДС като ред Към Приход
 * или разход с натрупване всеки месец и зависимост за внасяне или за плащане към
 * нас е знака на ддс. И Сверка и възможност да декларираш колко си платил и
 * колко остава да се внася или да ти плащат…"
 *
 * ДЪЛЖИМОТО се СМЯТА (начислен − кредит), не се въвежда: два записа за едно и
 * също число се разминават (правило 17). Декларираното и платеното са негови
 * числа — какво е подадено и какво е внесено; остатъкът пак се смята.
 * ИЗДАДЕНИТЕ и ПЛАТЕНИТЕ фактури идват от счетоводството с МЕСЕЦ назад (негово,
 * 05.09 т.3) и служат само за сверка.
 */
const DDS_KOLONI: readonly Kolona[] = [
  {
    klyuch: 'mesets',
    ime: 'месец',
    vid: 'tekst',
    zadalzhitelna: true,
    zatvorena: false,
    nashaDuma: true,
    vKlyucha: true,
  },
  {
    klyuch: 'nachislen',
    ime: 'начислен ДДС',
    vid: 'evro',
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
  },
  {
    klyuch: 'kredit',
    ime: 'данъчен кредит',
    vid: 'evro',
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
  },
  {
    klyuch: 'deklarirano',
    ime: 'декларирано',
    vid: 'evro',
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
  },
  {
    klyuch: 'plateno',
    ime: 'платено',
    vid: 'evro',
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
  },
  {
    klyuch: 'izdadeni',
    ime: 'издадени фактури (счетоводство)',
    vid: 'evro',
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
  },
  {
    klyuch: 'plateni',
    ime: 'платени фактури (счетоводство)',
    vid: 'evro',
    zadalzhitelna: false,
    zatvorena: false,
    nashaDuma: true,
  },
];

const DDS: Tablitsa = Object.freeze({
  klyuch: 'dds',
  ime: 'ДДС',
  prozorets: 'smetki',
  sashtnost: 'dds',
  koloni: DDS_KOLONI,
  nashaTablitsa: true,
});

const KESH: Tablitsa = Object.freeze({
  klyuch: 'kesh',
  ime: 'Кеш',
  prozorets: 'smetki',
  sashtnost: 'kesh',
  koloni: KESH_KOLONI,
  nashaTablitsa: true,
});

/**
 * ОБЛИКЪТ НА ЛИСТА УправлениеДелаПреписки · неговите десет глави (ред 17), с
 * подглавите им (ред 18), и откъде идва всяка клетка: от РОДИТЕЛЯ (реда на Имот ·
 * Обект · Бизнес, който е групов ред в дървото) или от ЗАДАЧАТА под него. Родителят
 * „Състояние" е състоянието на Имота, видът на Обекта (неговото C24 „апартамент")
 * или състоянието на Бизнеса; „име Имот" на Обект и Бизнес е името на Имота им.
 * След десетте идват тактовете на Ганта (K17:R17 „такт") и скритата колона „Ключ".
 */
export interface GlavaNaOblika {
  readonly glava: string;
  readonly podglava?: string;
  readonly ot: 'nomeratsiya' | 'roditel' | 'zadacha';
  /** колоната на Модела · при родител: ключът в таблицата на Имотите · при задача: в ZADACHI */
  readonly kolona?: string;
  /** същата глава при листа Сметки носи и тази колона на ДВИЖЕНИЕТО */
  readonly dvizhenie?: string;
  /** колко ФИЗИЧЕСКИ колони заема главата · неговото F15:G15 при Сметки е две */
  readonly shirina?: number;
  /** подглавата на втората физическа колона · неговото G16 „ Край" */
  readonly podglavaVtora?: string;
  /** главата е НАША · няма я в листа му, затова липсата ѝ там е бележка, не грешка */
  readonly nashaGlava?: true;
}

export const OBLIK_NA_UPRAVLENIE: readonly GlavaNaOblika[] = [
  { glava: '№', ot: 'nomeratsiya' },
  { glava: 'име Имот', ot: 'roditel', kolona: 'ime' },
  {
    glava: ' Състояние за Имот или Състояние на Обект',
    podglava:
      'За Имот и за Обект са различни Състояние. Долу ги пише. (редактират се и премахват и създават от Настройки в Нуменклатури)',
    ot: 'roditel',
    kolona: 'sastoyanie',
  },
  { glava: '№', ot: 'roditel', kolona: 'nomer' },
  {
    glava: ' Задачи(нещо като състояние за Делата, Срещите и Преписките).',
    podglava:
      'Дело, Среща, Преписка(редактират се и премахват и създават от Настройки в Нуменклатури)',
    ot: 'zadacha',
    kolona: 'vid',
  },
  { glava: 'Дата', podglava: 'Начало/Край', ot: 'zadacha', kolona: 'ot' },
  {
    glava: 'Оценка',
    podglava: 'Спешно и Важно(червн цвят в Календара(Диагарамата Хант)',
    ot: 'zadacha',
    kolona: 'otsenka',
  },
  { glava: 'площ', podglava: 'м2', ot: 'roditel', kolona: 'plosht' },
  { glava: 'цена', podglava: 'знак(Евро)', ot: 'roditel', kolona: 'tsena' },
  { glava: 'Бюджет Дела/ Бюджет Сметки', ot: 'zadacha', kolona: 'byudzhet' },
  { glava: 'Отговорник', ot: 'zadacha', kolona: 'otgovornik', nashaGlava: true },
];

/**
 * ОБЛИКЪТ НА ЛИСТА СМЕТКИ · неговите десет глави (ред 15) с подглавите (ред 16).
 * Същите десет като Управление, но с ДРУГИТЕ му думи, и всяка глава носи И
 * колоната на ДВИЖЕНИЕТО: „Състояние" държи името на реда без родител
 * („[служител 1]"), „Задачи" — функцията и състоянието на сметката, „Дата" —
 * месеца, „Бюджет" — сумата. Задачите в този лист са ПРЕПИС от Управление
 * (домът им е там); движенията се четат оттук.
 */
export const OBLIK_NA_SMETKI: readonly GlavaNaOblika[] = [
  { glava: '№', ot: 'nomeratsiya' },
  { glava: 'име Имот', ot: 'roditel', kolona: 'ime' },
  {
    glava: ' Състояние за Имот или Състояние на Обект или състояние на Бизнес',
    podglava:
      'За Имот и за Обект са различни Състояние за Управление Дела и Сметки на Стойност. Долу ги пише една част, но За Имот, Обект и Бизнес се различават.',
    ot: 'roditel',
    kolona: 'sastoyanie',
    dvizhenie: 'ime',
  },
  { glava: '№', ot: 'roditel', kolona: 'nomer' },
  {
    glava: ' Задачи',
    podglava:
      'Вид Задачи: Дело, Среща, Преписка и Вид Сметка: Сметнато, Вкарано (поле за това), Прочетено(Сверено.)',
    ot: 'zadacha',
    kolona: 'vid',
    dvizhenie: 'funktsiya',
  },
  {
    glava: 'Дата',
    podglava: 'Начало ',
    podglavaVtora: ' Край',
    shirina: 2,
    ot: 'zadacha',
    kolona: 'ot',
    dvizhenie: 'mesets',
  },
  {
    glava: 'Оценка',
    podglava: 'Спешно и Важно(червн цвят в Календара(Диагарамата Хант)',
    ot: 'zadacha',
    kolona: 'otsenka',
  },
  { glava: 'площ', podglava: 'м2', ot: 'roditel', kolona: 'plosht' },
  { glava: 'цена', podglava: 'знак(Евро)', ot: 'roditel', kolona: 'tsena' },
  {
    glava: 'Бюджет Дела/ Бюджет Сметки',
    ot: 'zadacha',
    kolona: 'byudzhet',
    dvizhenie: 'suma',
  },
];

/**
 * Физическото начало (0-базирано) на всяка глава · при Сметки „Дата" е ДВЕ
 * колони (неговото F15:G15), затова главите и колоните на листа не съвпадат.
 */
export function nachalataNaGlavite(oblik: readonly GlavaNaOblika[]): number[] {
  const nachalo: number[] = [];
  let j = 0;
  for (const g of oblik) {
    nachalo.push(j);
    j += g.shirina ?? 1;
  }
  return nachalo;
}

/** Колко ФИЗИЧЕСКИ колони заемат главите на един облик. */
export function shirinaNaOblika(oblik: readonly GlavaNaOblika[]): number {
  return oblik.reduce((a, g) => a + (g.shirina ?? 1), 0);
}

/** Неговата дума за колоните на Ганта в листа (K17:R17) · и колко са при него. */
export const TAKT_GLAVA = 'такт';
export const BROY_TAKT_KOLONI_V_KNIGATA = 8;
/** При Сметки тактовете са дванайсет (неговите L15:W15). */
export const BROY_TAKT_KOLONI_V_SMETKI = 12;

/**
 * БУТОНИТЕ на прозореца · неговите думи от ред 14–15 на Управление (същите на
 * Сметки ред 12–13), дословно · и какво прави всеки ДНЕС. Бутонът е данни, не
 * код: „идва с резен N" се казва на глас (правило 12); менюто расте само от
 * Настройки (правило 19) — затова „Добавяне на Състояние" отваря Настройки.
 * Всички са с ЕДИН малък размер, и над всеки стои поле с цифра (негово, 05.09).
 */
export type DeystvieNaButon =
  | { readonly vid: 'komanda'; readonly klyuch: string }
  | { readonly vid: 'ekran'; readonly klyuch: string }
  | { readonly vid: 'kniga' }
  | { readonly vid: 'nastroyki' }
  | { readonly vid: 'idva'; readonly rezen: number; readonly dumi?: string };

export interface ButonNaProzoretsa {
  readonly klyuch: string;
  /** неговата клетка · дословно · лицето на бутона е до първата скоба */
  readonly ime: string;
  /** втори ред при него (L15 · M15 · O15:R15) · неговите думи */
  readonly izbor?: readonly string[];
  readonly deystvie: DeystvieNaButon;
}

export const BUTONI_NA_UPRAVLENIE: readonly ButonNaProzoretsa[] = [
  {
    klyuch: 'otvori',
    ime: 'Отвори(запазен по рано модел или таблица за създаване на празна таблица и после вкарване на функционалност. Предложи начин наклрая на кода за най голяма лекота и функционалност по познат модел от ексел).)',
    deystvie: { vid: 'idva', rezen: 6 },
  },
  {
    klyuch: 'zapazi',
    ime: 'Запази(записваш експерименталния модел за периоди напред)',
    deystvie: { vid: 'idva', rezen: 6 },
  },
  {
    klyuch: 'dobavyane',
    ime: 'Добавяне(падащо меню за Имот, Обект, Кредит, Среща)',
    deystvie: { vid: 'ekran', klyuch: 'dobavyane' },
  },
  {
    klyuch: 'svali-fayl',
    ime: 'Свалифайл (различни таблици в ПДФ и в Ексел или за Никроинвест файл или за Нап)',
    deystvie: { vid: 'kniga' },
  },
  {
    klyuch: 'dobavyane-na-sastoyanie',
    ime: 'Добавяне на Състояние Дела от падащо меню се избира: Дела, Срещи, Преписки или се избира ФУнкция на парите в Приход и Разход: ВИждане, Смятане или Въвеждане.',
    deystvie: { vid: 'nastroyki' },
  },
  { klyuch: 'skriy-dela', ime: 'Скрий Дела', deystvie: { vid: 'ekran', klyuch: 'skriy-dela' } },
  // резен 3 е ТОЗИ резен · думите казват коя му половина, за да не значи „вече е тук"
  {
    klyuch: 'skriy-razhodi',
    ime: 'Скрий Разходи',
    deystvie: { vid: 'idva', rezen: 3, dumi: 'идва със Сметки · втората половина на резен 3' },
  },
  {
    klyuch: 'skriy-prihodi',
    ime: 'Скрий Приходи',
    deystvie: { vid: 'idva', rezen: 3, dumi: 'идва със Сметки · втората половина на резен 3' },
  },
  {
    klyuch: 'skriy-tablitsa',
    ime: 'Скрий Таблица',
    deystvie: { vid: 'ekran', klyuch: 'skriy-tablitsa' },
  },
  {
    klyuch: 'skriy-diagrama',
    ime: 'Скрий Диаграма',
    deystvie: { vid: 'ekran', klyuch: 'skriy-diagrama' },
  },
  { klyuch: 'obnovi', ime: 'Обнови', deystvie: { vid: 'ekran', klyuch: 'obnovi' } },
  {
    klyuch: 'period',
    ime: 'Период',
    izbor: ['начало ', 'край'],
    deystvie: { vid: 'ekran', klyuch: 'period' },
  },
  {
    klyuch: 'nachalo-sega',
    ime: 'Начало Сега',
    deystvie: { vid: 'ekran', klyuch: 'nachalo-sega' },
  },
  {
    klyuch: 'takt',
    ime: 'Времеви Такт Диаграма',
    izbor: ['ден', 'месец', 'тримесечие', 'година'],
    deystvie: { vid: 'ekran', klyuch: 'takt' },
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * СЛУЖИТЕЛИ · неговите четири блока (лист „Служители")
 *
 * Стопани (A2) и Служители (A6) са ДВЕ таблици с едни и същи колони, но с
 * НЕГОВИТЕ различни глави: B3 „Име" срещу B7 „Име Служител". Достъпът (A15) е
 * трета таблица: една Длъжност, четири оси. Програмата за Задачи (A23) е
 * ИЗГЛЕД, не таблица — задачите вече живеят в Управление.
 * ═══════════════════════════════════════════════════════════════════════════ */

function chovek(imeNaImeto: string): readonly Kolona[] {
  return [
    NOMERATSIYA_KOLONA,
    tekst('ime', imeNaImeto, true),
    tekst('telefon', 'телефон'),
    tekst('imeyl', 'Имейл'),
    tekst('adres', 'Адрес'),
    {
      klyuch: 'dlazhnost',
      ime: 'Длъжност',
      vid: 'izbor',
      nomenklatura: NOMENKLATURA.dlazhnosti,
      zadalzhitelna: false,
      zatvorena: false,
    },
  ];
}

const STOPANI: Tablitsa = Object.freeze({
  klyuch: 'stopani',
  ime: 'Стопани свързани с Coretovia',
  prozorets: 'sluzhiteli',
  sashtnost: 'stopan',
  koloni: chovek('Име'),
  nomeratsiya: nomeratsiya({ ot: 'broyach' }),
});

const SLUZHITELI: Tablitsa = Object.freeze({
  klyuch: 'sluzhiteli',
  ime: 'Служители свързани с Coretovia',
  prozorets: 'sluzhiteli',
  sashtnost: 'sluzhitel',
  koloni: chovek('Име Служител'),
  nomeratsiya: nomeratsiya({ ot: 'broyach' }),
});

export interface DostapPoPodrazbirane extends Readonly<Record<string, string>> {
  readonly dlazhnost: string;
  readonly tabove: string;
  readonly hedari: string;
  readonly redove: string;
  readonly zhurnal: string;
}

export const DOSTAP_PO_PODRAZBIRANE: readonly DostapPoPodrazbirane[] = [
  {
    dlazhnost: 'Стопанин',
    tabove: 'Редактира всичко',
    hedari: 'Редактира всичко',
    redove: 'Редактира всичко',
    zhurnal: 'Редактира всичко',
  },
  {
    dlazhnost: 'Управител',
    tabove: 'Редактира всичко',
    hedari: 'Редактира всичко',
    redove: 'Редактира всичко',
    zhurnal: 'Вижда само всичко',
  },
  {
    dlazhnost: 'Помощник Управител',
    tabove: 'Вижда всичко',
    hedari: 'Редактира  хедъри: Заплати, Фактури Кеш, Фактури Карта',
    redove: 'Вижда само всичко',
    zhurnal: 'Вижда само всичко',
  },
  {
    dlazhnost: 'Служител',
    tabove: 'Вижда само таб Служители',
    hedari: 'Вижда само хедър: Програма за Задачи на Служители',
    redove: 'Вижда само редовете с негови задачи: Личен Лист с Задачи',
    zhurnal: 'Вижда само всичко',
  },
  {
    dlazhnost: 'Наблюдател',
    tabove: 'Вижда всичко',
    hedari: 'Вижда само всичко',
    redove: 'Вижда само всичко',
    zhurnal: 'Вижда само всичко',
  },
];

/**
 * ДОСТЪПЪТ · една Длъжност, ЧЕТИРИ оси (неговите глави C16:F16) · и всяка ос е
 * НЕГОВОТО изречение, дословно. Правото се чете от ПЪРВАТА дума („Редактира" ·
 * „Вижда"), а остатъкът казва ОБХВАТА — така неговите думи остават неговите, а
 * кодът пак има решима стойност (правило 23: правото само СТЕСНЯВА).
 */
const DOSTAP_KOLONI: readonly Kolona[] = [
  NOMERATSIYA_KOLONA,
  {
    klyuch: 'dlazhnost',
    ime: 'Длъжност',
    vid: 'izbor',
    nomenklatura: NOMENKLATURA.dlazhnosti,
    zadalzhitelna: true,
    zatvorena: false,
    vKlyucha: true,
  },
  tekst('tabove', 'достъп до табове без Журнал'),
  tekst('hedari', 'достъп до хедъри'),
  tekst('redove', 'достъп до Секци Редове'),
  tekst('zhurnal', 'Таб Журнал'),
];

const DOSTAP: Tablitsa = Object.freeze({
  klyuch: 'dostap',
  ime: 'Достъп на Длъжности за Служител',
  prozorets: 'sluzhiteli',
  sashtnost: 'dostap',
  koloni: DOSTAP_KOLONI,
  nomeratsiya: nomeratsiya({ ot: 'broyach' }),
  bazovi: DOSTAP_PO_PODRAZBIRANE,
});

/** Осите на достъпа · ключът на колоната и неговата глава. */
export const OSI_NA_DOSTAPA = ['tabove', 'hedari', 'redove', 'zhurnal'] as const;
export type OsNaDostapa = (typeof OSI_NA_DOSTAPA)[number];

/**
 * БАЗОВИЯТ достъп · неговите пет реда (A17:F21), ДОСЛОВНО.
 *
 * Стоят в кода като базовите стойности на номенклатурите (ADR-003 решение 1):
 * докато няма ред в таблицата за тази Длъжност, важи този; напише ли се ред,
 * той бие. Така „Създаване на Длъжност с достъп" (неговото B14) расте от
 * събития, а началото е неговото.
 */
/* ═══════════════════════════════════════════════════════════════════════════
 * ПРОДАЖБИ · двете му таблици (A3:T58 и A60:T77), с главите му дословно.
 *
 * Всяка продажба има ДВЕ страни — по банка и в кеш — и за всяка: цена, вноски и
 * ПРОВЕРКА. В Книгата проверката е формула; тук се СМЯТА (цена − сбор на
 * вноските) и се записва като сверка, дори когато е нула (правило 7). Затова е
 * ЗАТВОРЕНА колона: сметка не се редактира от никого (правило 23).
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Купувачът · четирите му глави за човека · еднакви в двете таблици. */
const KUPUVACH: readonly Kolona[] = [
  { ...tekst('apartament', 'апартамент', true), vKlyucha: true, kratko: 'апартамент' },
  tekst('telefon', 'телефон'),
  tekst('ime', 'име'),
  tekst('imeyl', 'имейл'),
];

/** Принадлежностите и квадратурата · гараж · п. място · мазе · квадратура. */
const PRINADLEZHNOSTI: readonly Kolona[] = [
  { klyuch: 'garazh', ime: 'гараж', vid: 'chislo', zadalzhitelna: false, zatvorena: false },
  { klyuch: 'pMyasto', ime: 'п. място', vid: 'chislo', zadalzhitelna: false, zatvorena: false },
  { klyuch: 'maze', ime: 'мазе', vid: 'chislo', zadalzhitelna: false, zatvorena: false },
  {
    klyuch: 'kvadratura',
    ime: 'квадратура',
    vid: 'chislo',
    merka: 'kvsm',
    zadalzhitelna: false,
    zatvorena: false,
  },
];

/** Пари в продажба · с ролята и страната им. */
function pari(
  klyuch: string,
  ime: string,
  rolya: 'tsena' | 'vnoska' | 'proverka',
  strana: 'banka' | 'kesh',
): Kolona {
  return {
    klyuch,
    ime,
    vid: 'evro',
    zadalzhitelna: false,
    zatvorena: rolya === 'proverka',
    plashtane: { rolya, strana },
  };
}

const PRODAZHBI_KOLONI: readonly Kolona[] = [
  ...KUPUVACH,
  ...PRINADLEZHNOSTI,
  { klyuch: 'tsena', ime: 'цена', vid: 'evro', zadalzhitelna: false, zatvorena: false },
  pari('tsenaBanka', 'цена банка', 'tsena', 'banka'),
  pari('tsenaSmr', 'цена смр ', 'tsena', 'kesh'),
  pari('pdBanka', 'ПД банка', 'vnoska', 'banka'),
  pari('pdSmr', 'ПД смр', 'vnoska', 'kesh'),
  pari('nsBanka', 'НС банка', 'vnoska', 'banka'),
  pari('nsSmr', 'НС смр', 'vnoska', 'kesh'),
  pari('akt15Smr', 'Акт 15 смр', 'vnoska', 'kesh'),
  pari('akt15', 'Акт 15', 'vnoska', 'banka'),
  pari('akt16', 'АКТ 16 ', 'vnoska', 'banka'),
  pari('proverkaBanka', 'проверка банка', 'proverka', 'banka'),
  pari('proverkaKesh', 'проверка кеш', 'proverka', 'kesh'),
];

const PRODAZHBI2_KOLONI: readonly Kolona[] = [
  ...KUPUVACH,
  ...PRINADLEZHNOSTI,
  {
    klyuch: 'evroKvadrat',
    ime: 'евро/квадрат',
    vid: 'evro',
    zadalzhitelna: false,
    zatvorena: false,
  },
  { klyuch: 'tsena', ime: 'цена', vid: 'evro', zadalzhitelna: false, zatvorena: false },
  pari('tsenaBanka', 'цена банка', 'tsena', 'banka'),
  pari('tsenaSmr', 'цена смр ', 'tsena', 'kesh'),
  pari('pdBanka', 'ПД банка', 'vnoska', 'banka'),
  pari('pdKesh', 'ПД кеш', 'vnoska', 'kesh'),
  pari('nsBanka', 'НС банка', 'vnoska', 'banka'),
  pari('nsKesh', 'НС кеш', 'vnoska', 'kesh'),
  pari('akt15Banka', 'АКТ 15 банка', 'vnoska', 'banka'),
  pari('akt16Banka', 'АКТ 16 банка ', 'vnoska', 'banka'),
  pari('proverkaBanka', 'проверка банка', 'proverka', 'banka'),
  pari('proverkaKesh', 'проверка кеш', 'proverka', 'kesh'),
];

const PRODAZHBI: Tablitsa = Object.freeze({
  klyuch: 'prodazhbi',
  ime: LENTA_NA_PARVATA_SGRADA,
  prozorets: 'prodazhbi',
  sashtnost: 'prodazhba',
  koloni: PRODAZHBI_KOLONI,
});

const PRODAZHBI2: Tablitsa = Object.freeze({
  klyuch: 'prodazhbi2',
  ime: LENTA_NA_VTORATA_SGRADA,
  prozorets: 'prodazhbi',
  sashtnost: 'prodazhba2',
  koloni: PRODAZHBI2_KOLONI,
});

export const TABLITSI: readonly Tablitsa[] = Object.freeze([
  IMOTI,
  OBEKTI,
  BIZNESI,
  ZADACHI,
  DVIZHENIYA,
  KESH,
  DDS,
  STOPANI,
  SLUZHITELI,
  DOSTAP,
  PRODAZHBI,
  PRODAZHBI2,
]);

/** МОДЕЛЪТ на резен 1 · единственият екземпляр в кода. */
export const MODEL: Model = Object.freeze({
  versiya: 1,
  prozortsi: PROZORTSI,
  tablitsi: new Map(TABLITSI.map((t) => [t.klyuch, t])),
  nomenklaturi: new Map(NOMENKLATURI.map((n) => [n.klyuch, n])),
});
