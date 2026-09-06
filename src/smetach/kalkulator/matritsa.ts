/**
 * МАТРИЦАТА · трите подхода за оценка и съгласуването им (ADR-012).
 *
 * Негови думи (23.08): „Проучване на методологии на калкулатори за изчисляване
 * на цената на имоти. Апартаменти, гаражи, паркоместа, по район, степен и т.н…
 * Ексел е в основата на всичко. Матрици и висша математика."
 *
 * И (09.08), което даде името на екрана: „…казва се Стойност на Състояние… и е
 * калкулатор за пресмятане на стойността на всеки обект и цялата стойност на
 * участващото и въведено състояние."
 *
 * ЯДРАТА СА ПРЕНЕСЕНИ ДОСЛОВНО от MasterBook (`src/kalkulator/matritsa.ts`):
 * `tsenaOtChasti` · `tsenaPoSastoyanie` · `tsenaPoRazhod` · `saglasuvana` ·
 * `teglataZatvaryat`. Смятат се ЦЕЛИ числа и се дели ВЕДНЪЖ, накрая: обратният
 * ред би закръглил по средата и разликата щеше да расте с всеки обект.
 */

import {
  EDINITSA_BT,
  type NastroykiNaKalkulatora,
  PO_PODRAZBIRANE,
  sboratNaTeglata,
  type Tegla,
  type VidObekt,
} from './nastroyki.js';
import { deliZakragleno } from '../../yadro/pari.js';

export class GreshkaMatritsa extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaMatritsa';
  }
}

/**
 * ЕДНАТА СМЕТКА · площ × база × коефициенти + добавка.
 *
 * КОЛКО КОЕФИЦИЕНТА · без значение. Списъкът се умножава цял, преди да се дели.
 * ДОБАВКАТА влиза НАКРАЯ и не се умножава по нищо.
 */
export function tsenaOtChasti(n: {
  readonly obshta_kvsm: number;
  /** базата в цели центове за квадратен метър */
  readonly baza_st: number;
  readonly koefitsienti_bt: readonly number[];
  /** абсолютна добавка в цели центове · гараж, паркомясто, мазе */
  readonly dobavka_st?: number;
}): number {
  if (!Number.isSafeInteger(n.obshta_kvsm) || n.obshta_kvsm < 0) {
    throw new GreshkaMatritsa(
      `Площта се дава в цели квадратни сантиметри; получено: ${n.obshta_kvsm}`,
    );
  }
  if (!Number.isSafeInteger(n.baza_st) || n.baza_st < 0) {
    throw new GreshkaMatritsa(`Базата се дава в цели центове; получено: ${n.baza_st}`);
  }
  // площ (кв. см) × база (ст./м²) → ст. × 10 000; всеки коефициент добавя още
  // един множител от 10 000. Делим ВЕДНЪЖ, накрая.
  let gore = BigInt(n.obshta_kvsm) * BigInt(n.baza_st);
  let dolu = 10_000n;
  for (const bt of n.koefitsienti_bt) {
    gore *= BigInt(bt);
    dolu *= BigInt(EDINITSA_BT);
  }
  // към най-близкото · точната среда отива нагоре, както човек смята на ръка
  const tsena = Number((gore * 2n + dolu) / (dolu * 2n));
  return tsena + (n.dobavka_st ?? 0);
}

/** А · ПАЗАРНИЯТ подход · площ × база по вид, без коефициенти на обекта. */
export function tsenaPazarno(n: {
  readonly obshta_kvsm: number;
  readonly vid: VidObekt;
  readonly nastroyki?: NastroykiNaKalkulatora;
}): number {
  const m = n.nastroyki ?? PO_PODRAZBIRANE;
  const baza_st = m.baza_st[n.vid];
  if (baza_st === undefined) {
    throw new GreshkaMatritsa(`Матрицата няма база за вид „${n.vid}".`);
  }
  return tsenaOtChasti({ obshta_kvsm: n.obshta_kvsm, baza_st, koefitsienti_bt: [] });
}

/**
 * Б · ДОХОДНИЯТ подход · стойност = ЧОД ÷ доходност.
 *
 * ЧОД = годишен наем × (1 − незаетост) − оперативни разходи. Нулев наем дава
 * нулева стойност: обект без доход не се оценява доходно, и това не е грешка, а
 * отговор.
 */
export function tsenaPoSastoyanie(n: {
  /** месечният наем в евроцента · действителен или очакван */
  readonly naem_mesechen_st: number;
  readonly nastroyki?: NastroykiNaKalkulatora;
}): number {
  const m = n.nastroyki ?? PO_PODRAZBIRANE;
  if (!Number.isSafeInteger(n.naem_mesechen_st) || n.naem_mesechen_st < 0) {
    throw new GreshkaMatritsa(`Наемът се дава в цели центове; получено: ${n.naem_mesechen_st}`);
  }
  if (m.dohodnost_bt <= 0) {
    throw new GreshkaMatritsa(
      'Доходност нула или под нула не капитализира — сметката е невъзможна.',
    );
  }
  if (n.naem_mesechen_st === 0) return 0;
  const godishen = BigInt(n.naem_mesechen_st) * 12n;
  const zaet = BigInt(EDINITSA_BT - m.nezaetost_bt);
  const chist = BigInt(EDINITSA_BT - m.operativni_bt);
  const gore = godishen * zaet * chist * BigInt(EDINITSA_BT);
  const dolu = BigInt(EDINITSA_BT) * BigInt(EDINITSA_BT) * BigInt(m.dohodnost_bt);
  return Number((gore * 2n + dolu) / (dolu * 2n));
}

/**
 * В · РАЗХОДНИЯТ подход · земя + строителна стойност − овехтяване.
 *
 * ЗЕМЯТА НЕ ОВЕХТЯВА, и това е ЦЯЛАТА мисъл на подхода. Овехтява СГРАДАТА.
 * Приложено върху сбора, овехтяването щеше да яде и земята, и оценката на стара
 * сграда щеше да клони към нула, каквото никога не става: най-старите сгради в
 * центъра струват най-скъпо ЗАРАДИ земята.
 *
 * ЕДНО ЛИПСВАЩО ЧИСЛО значи, че подходът НЕ ражда число: нулата тук е СЕНТИНЕЛ
 * за „не е дадено", не цена. При едно липсващо се смяташе наполовина и излизаше
 * число, което ИЗГЛЕЖДА сметнато — и влизаше в съгласуването, дърпайки крайното
 * надолу без нито една дума.
 */
export function tsenaPoRazhod(n: {
  readonly obshta_kvsm: number;
  readonly vid: VidObekt;
  readonly nastroyki?: NastroykiNaKalkulatora;
  /** САМО ЗЕМЯ · Имот със статут „земя" · тогава сграда няма да овехтява */
  readonly samoZemya?: boolean;
}): number {
  const m = n.nastroyki ?? PO_PODRAZBIRANE;
  const zemya_st_kvm = m.zemya_st_kvm[n.vid];
  const stroitelna_st_kvm = m.stroitelna_st_kvm[n.vid];
  if (zemya_st_kvm === undefined || stroitelna_st_kvm === undefined) {
    throw new GreshkaMatritsa(`Матрицата няма разходни числа за вид „${n.vid}".`);
  }
  if (!Number.isSafeInteger(n.obshta_kvsm) || n.obshta_kvsm < 0) {
    throw new GreshkaMatritsa(`Площта е в цели кв. см от нула нагоре; получено: ${n.obshta_kvsm}`);
  }
  if (m.polezen_zhivot_g <= 0) {
    throw new GreshkaMatritsa('Полезен живот нула не дели — овехтяването е невъзможно.');
  }
  if (n.obshta_kvsm === 0) return 0;
  if (n.samoZemya === true) {
    if (zemya_st_kvm === 0) return 0;
    return Number((BigInt(n.obshta_kvsm) * BigInt(zemya_st_kvm) * 2n + 10_000n) / (10_000n * 2n));
  }
  if (zemya_st_kvm === 0 || stroitelna_st_kvm === 0) return 0;
  const ostavashti = ostavashtiOtSgradata_bt(m);
  const zaKvadrat =
    BigInt(zemya_st_kvm) * BigInt(EDINITSA_BT) + BigInt(stroitelna_st_kvm) * BigInt(ostavashti);
  const gore = BigInt(n.obshta_kvsm) * zaKvadrat;
  const dolu = 10_000n * BigInt(EDINITSA_BT);
  return Number((gore * 2n + dolu) / (dolu * 2n));
}

/** Колко от сградата ОСТАВА, в базисни точки · един дом за екрана и за теста. */
export function ostavashtiOtSgradata_bt(nastroyki?: NastroykiNaKalkulatora): number {
  const m = nastroyki ?? PO_PODRAZBIRANE;
  if (m.polezen_zhivot_g <= 0) return 0;
  const iztekli = Math.min(Math.max(m.vazrast_g, 0), m.polezen_zhivot_g);
  return EDINITSA_BT - deliZakragleno(iztekli * EDINITSA_BT, m.polezen_zhivot_g);
}

export interface Saglasuvane {
  /** претеглената цена в цели центове, БЕЗ закръгляне */
  readonly tochno_st: number;
  /** теглата СЛЕД пренормирането · сборът им е точно 10 000 */
  readonly deystvashti: Tegla;
  /** имената на подходите, отпаднали заради нулева стойност */
  readonly otpadnali: readonly string[];
}

/**
 * ЗАТВАРЯТ ЛИ ТЕГЛАТА · питат ГО, преди да викнат `saglasuvana`.
 *
 * Строгостта на `saglasuvana` е правилна и остава: сбор, различен от 100 %, не
 * бива да ражда число. Но ЕКРАНЪТ не бива да пада заради нея — отказът е
 * СЪОБЩЕНИЕ (правило 15), не срив.
 */
export function teglataZatvaryat(tegla: Tegla): boolean {
  return sboratNaTeglata(tegla) === EDINITSA_BT;
}

/**
 * СЪГЛАСУВАНЕТО · претеглената цена от трите подхода.
 *
 * НУЛЕВИЯТ ПОДХОД СЕ ИЗКЛЮЧВА, НЕ СЕ СМЯТА. Влезе ли нулата в претеглената сума
 * с теглото си, съгласуваната пада с толкова процента, колкото е теглото — без
 * някой да е решавал и без нищо на екрана да го казва. Затова нулевите отпадат,
 * теглата на останалите се ПРЕНОРМИРАТ до 10 000, а кой е отпаднал се ВРЪЩА.
 *
 * ОСТАТЪКЪТ ОТ ПРЕНОРМИРАНЕТО отива на НАЙ-ГОЛЯМОТО от оцелелите тегла: остатък,
 * който изчезва, се появява по-късно като „сметката не затваря с един цент".
 */
export function saglasuvana(n: {
  readonly pazaren_st: number;
  readonly dohoden_st: number;
  readonly razhoden_st: number;
  readonly tegla: Tegla;
}): Saglasuvane {
  const sbor = sboratNaTeglata(n.tegla);
  if (sbor !== EDINITSA_BT) {
    throw new GreshkaMatritsa(
      `Трите тегла дават ${sbor} б.т., а трябва точно ${EDINITSA_BT}. ` +
        'Тегло, което не затваря, е тихо изгубено число.',
    );
  }
  const podhodi = [
    { ime: 'пазарен', st: n.pazaren_st, bt: n.tegla.pazaren_bt },
    { ime: 'доходен', st: n.dohoden_st, bt: n.tegla.dohoden_bt },
    { ime: 'разходен', st: n.razhoden_st, bt: n.tegla.razhoden_bt },
  ];
  for (const p of podhodi) {
    if (!Number.isSafeInteger(p.st) || p.st < 0) {
      throw new GreshkaMatritsa(`Стойността по „${p.ime}" е в цели центове от нула нагоре.`);
    }
  }
  const zhivi = podhodi.filter((p) => p.st > 0 && p.bt > 0);
  const otpadnali = podhodi.filter((p) => p.st === 0 && p.bt > 0).map((p) => p.ime);
  if (zhivi.length === 0) {
    return Object.freeze({
      tochno_st: 0,
      deystvashti: Object.freeze({ pazaren_bt: 0, dohoden_bt: 0, razhoden_bt: 0 }),
      otpadnali: Object.freeze(otpadnali),
    });
  }
  const sborZhivi = zhivi.reduce((s, p) => s + p.bt, 0);
  const novi = zhivi.map((p) => ({ ...p, novo_bt: Math.floor((p.bt * EDINITSA_BT) / sborZhivi) }));
  const nay = novi.reduce((a, b) => (b.novo_bt > a.novo_bt ? b : a), novi[0]!);
  nay.novo_bt += EDINITSA_BT - novi.reduce((s, p) => s + p.novo_bt, 0);
  const gore = novi.reduce((s, p) => s + BigInt(p.novo_bt) * BigInt(p.st), 0n);
  const dolu = BigInt(EDINITSA_BT);
  const bt = (ime: string): number => novi.find((p) => p.ime === ime)?.novo_bt ?? 0;
  return Object.freeze({
    tochno_st: Number((gore * 2n + dolu) / (dolu * 2n)),
    deystvashti: Object.freeze({
      pazaren_bt: bt('пазарен'),
      dohoden_bt: bt('доходен'),
      razhoden_bt: bt('разходен'),
    }),
    otpadnali: Object.freeze(otpadnali),
  });
}

/** Очакваният месечен наем за обект без наем в Журнала · от матрицата. */
export function ochakvanNaem_st(
  obshta_kvsm: number,
  vid: VidObekt,
  nastroyki?: NastroykiNaKalkulatora,
): number {
  const m = nastroyki ?? PO_PODRAZBIRANE;
  const naem_st_kvm = m.naem_st_kvm[vid];
  if (naem_st_kvm === undefined) return 0;
  return deliZakragleno(obshta_kvsm * naem_st_kvm, 10_000);
}
