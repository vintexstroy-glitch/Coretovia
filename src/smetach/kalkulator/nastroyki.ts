/**
 * НАСТРОЙКИТЕ НА КАЛКУЛАТОРА · числата, с които се смята (ADR-012).
 *
 * Пренесени от MasterBook (`src/kalkulator/nastroyki.ts`, ADR-067 · ADR-072), с
 * числата и с разликата между НЕГОВИТЕ и НАШИТЕ, защото тя се БРОИ, не се
 * оценява: списък пада на червено, когато го надживеят; изречение в коментар —
 * не.
 *
 * ВСИЧКО В ЦЕЛИ БАЗИСНИ ТОЧКИ. 1,00 = 10 000 б.т. Никакъв float: коефициент
 * 1,05 × 0,97 във float дава 1,0184999999999998, а в базисни точки — 10 185, и
 * това число не мърда (правило 3).
 */

/** Мерната единица на коефициентите · 1,00 = 10 000 базисни точки. */
export const EDINITSA_BT = 10_000;

/** Петте вида обект · пренесени дословно от MasterBook. */
export const IMENA_NA_VIDOVETE_OBEKT = Object.freeze({
  apartament: 'апартамент',
  garazh: 'гараж',
  parkomyasto: 'паркомясто',
  sklad: 'склад',
  drug: 'друго',
});
export type VidObekt = keyof typeof IMENA_NA_VIDOVETE_OBEKT;

/** Петте вида, в ред · ИЗВЕДЕНИ от имената, не преписани до тях (правило 17). */
export const VIDOVE_OBEKT: readonly VidObekt[] = Object.freeze(
  Object.keys(IMENA_NA_VIDOVETE_OBEKT) as VidObekt[],
);

/** Трите тегла на съгласуването · сборът им е точно 10 000 б.т. */
export interface Tegla {
  readonly pazaren_bt: number;
  readonly dohoden_bt: number;
  readonly razhoden_bt: number;
}

/** Сборът на трите · един дом, за да не се смята на четири места. */
export function sboratNaTeglata(t: Tegla): number {
  return t.pazaren_bt + t.dohoden_bt + t.razhoden_bt;
}

export interface NastroykiNaKalkulatora {
  readonly rayon: string;
  /** базата в цели центове за квадратен метър, по вид обект */
  readonly baza_st: Readonly<Record<VidObekt, number>>;
  /** доходността в б.т., с която се капитализира */
  readonly dohodnost_bt: number;
  /** незаетост в б.т. · колко от годината обектът стои празен */
  readonly nezaetost_bt: number;
  /** оперативни разходи в б.т. ОТ наема · поддръжка, данъци, такси */
  readonly operativni_bt: number;
  /** очакван месечен наем в центове за кв. м · втори избор след действителния */
  readonly naem_st_kvm: Readonly<Record<VidObekt, number>>;
  /** земята в центове за кв. м обща площ · тя НЕ овехтява */
  readonly zemya_st_kvm: Readonly<Record<VidObekt, number>>;
  /** строителната себестойност в центове за кв. м · тя овехтява */
  readonly stroitelna_st_kvm: Readonly<Record<VidObekt, number>>;
  readonly polezen_zhivot_g: number;
  readonly vazrast_g: number;
  readonly tegla: Tegla;
}

/**
 * КОИ БАЗИ СА НЕГОВИ · и петте (ADR-067 на MasterBook).
 *
 * Апартаментът е 3 000 €/м² (И53 · И55); за другите четири негово, 31.08:
 * „Остави ги празни или напиши 2 000 евро на всички." Изборът между двете беше
 * наш; ЧИСЛОТО е негово.
 */
export const NEGOVI_BAZI: readonly VidObekt[] = Object.freeze([
  'apartament',
  'garazh',
  'parkomyasto',
  'sklad',
  'drug',
]);

/** Откъде идва базата на един вид · за екрана и за теста, с ЕДНА дума. */
export function bazataENegova(vid: VidObekt): boolean {
  return NEGOVI_BAZI.includes(vid);
}

/**
 * КОИ ПАРАМЕТРИ НА РАЗХОДНИЯ ПОДХОД СА НЕГОВИ · днес НИТО ЕДИН.
 *
 * Празният списък не е пропуск, а СЪСТОЯНИЕ: земята, строителната себестойност,
 * полезният живот и възрастта са пазарно и техническо знание, проучено от нас
 * (ADR-072), и не стоят в нито едно негово изречение. Ново негово число значи
 * ЕДИН ред тук, и екранът го казва сам.
 */
export const NEGOVI_PARAMETRI: readonly string[] = Object.freeze([]);

/** Негово ли е това число · за екрана и за теста, с ЕДНА дума. */
export function parametaraENegov(klyuch: string): boolean {
  return NEGOVI_PARAMETRI.includes(klyuch);
}

/**
 * НАСТРОЙКИТЕ, С КОИТО ТРЪГВА КАЛКУЛАТОРЪТ · и те НЕ са от една кофа.
 *
 * Базите са негови; разходните шест числа са НАШИ и проучени (ADR-072 на
 * MasterBook): земя 600 €/м² РЗП, строителна себестойност 1 200 €/м², полезен
 * живот 100 години (поправен от 70 — масивна монолитна сграда се приема със
 * 100–150 г.), възраст 0 за нова сграда.
 *
 * ТЕГЛАТА за ново строителство са 50/10/40 и „разходният НЕ води в нито един
 * случай" е инвариант, не число.
 */
export const PO_PODRAZBIRANE: NastroykiNaKalkulatora = Object.freeze({
  rayon: 'Малинова долина',
  baza_st: Object.freeze({
    apartament: 300_000, // 3 000 €/м² · неговото число (И53 · И55)
    garazh: 200_000,
    parkomyasto: 200_000,
    sklad: 200_000,
    drug: 200_000,
  }),
  dohodnost_bt: 320, // 3,20 % · класът „пазар"
  nezaetost_bt: 800, // 8 % · един месец на година празен
  operativni_bt: 1_500, // 15 % от наема
  naem_st_kvm: Object.freeze({
    apartament: 850, // 8,50 €/м²/месец
    garazh: 120,
    parkomyasto: 80,
    sklad: 100,
    drug: 850,
  }),
  zemya_st_kvm: Object.freeze({
    apartament: 60_000, // 600 €/м² · парцелът, отнесен към площта
    garazh: 20_000,
    parkomyasto: 30_000,
    sklad: 25_000,
    drug: 60_000,
  }),
  stroitelna_st_kvm: Object.freeze({
    apartament: 120_000, // 1 200 €/м² · груб строеж + довършване
    garazh: 60_000,
    parkomyasto: 40_000,
    sklad: 70_000,
    drug: 120_000,
  }),
  polezen_zhivot_g: 100,
  vazrast_g: 0,
  tegla: Object.freeze({ pazaren_bt: 5_000, dohoden_bt: 1_000, razhoden_bt: 4_000 }),
});

/**
 * ИНВАРИАНТЪТ на теглата · разходният подход НЕ води в нито един случай.
 *
 * Пренесен като ПРАВИЛО, не като число (CLAUDE.md · ADR-105 на MasterBook):
 * пазарният подход води и при ново строителство. Тестът го брои.
 */
export function razhodniyatNeVodi(t: Tegla): boolean {
  return t.razhoden_bt < t.pazaren_bt;
}
