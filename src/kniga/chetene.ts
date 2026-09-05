/**
 * ЧЕТЕНЕТО НА КНИГАТА · от листовете към клетки на Модела (ADR-004).
 *
 * Разпознаването е по ЛЕНТА + ГЛАВА, не по записан обхват: таблицата се намира
 * по слятата лента с името ѝ (`Tablitsa.ime`) и реда с главите под нея, и се
 * чете надолу до празен ред. Вмъкнат или дописан ред в Excel мести всичко, а
 * обхватът в служебния лист остарява в мига на вмъкването — той е подсказка.
 *
 * Ключът на реда е в скритата колона „Ключ"; без ключ редът е НОВ. Груповите
 * редове (`grupa:‹imot›·‹категория›`, или `2.1 · Гара Яна · Сграда` в Книга без
 * служебен лист) дават Имот и Категория на редовете под тях.
 *
 * Клетката се чете ПО ВИДА на колоната (правило 3): пари → цели центове, площ →
 * цели кв. см, избор → стойност от живата номенклатура (точно · без главни ·
 * префикс — второто и третото са бележки, не грешки), връзка → жив Имот по име.
 * Непрочетимото е НАХОДКА с адрес (правило 12) и клетката липсва; какво става
 * с реда решава Сверчикът (`sverchik.ts`), не четенето.
 *
 * Сверката (правило 7): за всяка таблица · обходени редове = с ключ + без ключ +
 * групови + нечетими; за всяка номенклатура · обходени = познати + нови + нечетими +
 * празни. Двете страни се броят по различни пътища, за да може да не затвори.
 */

import type { Kletka } from '../model/kletka.js';
import { type Kolona, slotNaKolonata } from '../model/kolona.js';
import { tablitsaNaId, tablitsata } from '../model/model.js';
import { type Belezi, podravni, type ZhivaNomenklatura } from '../model/nomenklatura.js';
import { DUMI_OT_KNIGATA } from '../model/dumi-ot-knigata.js';
import {
  type GlavaNaOblika,
  NOMENKLATURA,
  OBLIK_NA_UPRAVLENIE,
  PROZORTSI,
  SLUZHEBEN_LIST,
  nachalataNaGlavite,
  OBLIK_NA_SMETKI,
} from '../model/osnova.js';
import { kolonaNa, koloniNaReda, slyataNa, type Tablitsa } from '../model/tablitsa.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { kletkaNa, zhiviteRedove } from '../ogledalo/tablitsa.js';
import type { Kursor } from '../sabitiya/tovari.js';
import { otSuma } from '../yadro/pari.js';
import {
  IMENA_NA_STRANITE,
  KOLONA_NA_SEKTSIYATA,
  NOMENKLATURA_NA_STRANATA,
  type Strana,
} from '../smetach/smetki.js';
import { sverka, type Sverka } from '../yadro/sverka.js';
import {
  FILTAR,
  GLAVI_NA_NOMENKLATURITE,
  GRUPA,
  KLYUCH,
  OBSHTO_EVRO,
  SBOR,
  NOMENKLATURI,
  RAZDELITEL_NA_GRUPATA,
  SLUZHEBNO,
  SPRYANA,
  SEKTSIYA,
} from './dumi.js';
import {
  bukvaNaKolona,
  type ProchetenaKniga,
  type ProchetenaStoynost,
  type ProchetenList,
} from './ooxml.js';

export interface Nahodka {
  readonly list: string;
  /** адресът на клетката или реда · `C6` · `ред 12` */
  readonly adres: string;
  readonly kakvo: string;
  /** грешка = не се чете · бележка = прочетено, но не дословно */
  readonly stepen: 'greshka' | 'beleshka';
}

export interface ProchetenaKletka {
  readonly kolona: string;
  readonly adres: string;
  /** клетката · `null` = празна · `undefined` = не се чете или чака Сверчика */
  readonly stoynost: Kletka | null | undefined;
  /** избор, който го няма в номенклатурата · текстът, както е в листа */
  readonly nepoznatIzbor?: string;
  /** връзка към Имот, който го няма сред живите · името, както е в листа */
  readonly nepoznatRoditel?: string;
  /** името е на ПОВЕЧЕ от един жив Имот · по име не се знае кой */
  readonly dvusmislen?: number;
}

export interface ProchetenaGrupa {
  readonly red: number;
  readonly imotId: string | null;
  /** номерът на Имота в Книгата · първият сегмент на `2.1` */
  readonly imotNomer: number | null;
  readonly imotIme: string;
  readonly kategoriya: number | null;
  readonly kategoriyaTekst: string;
  /** родителят на редовете под групата · жив id (от ключа или по име) · `null` = не е жив */
  readonly roditelId: string | null;
  readonly roditelTablitsa: string | null;
  /** текстът в A на груповия ред · `2.1` · `3.1.1.27` · за родител, роден в същата Книга */
  readonly nomerVKnigata: string;
}

export interface ProchetenRed {
  readonly red: number;
  readonly adres: string;
  readonly klyuch: string | null;
  readonly nomeratsiya: string;
  readonly grupa: ProchetenaGrupa | null;
  readonly kletki: readonly ProchetenaKletka[];
}

export interface ProchetenaTablitsa {
  readonly klyuch: string;
  readonly list: string;
  readonly redNaGlavata: number;
  /** има колона „Ключ" · Книга, изнесена оттук */
  readonly sKlyuchove: boolean;
  readonly redove: readonly ProchetenRed[];
  readonly grupi: readonly ProchetenaGrupa[];
}

export interface ProchetenaStoynostNaNomenklatura {
  readonly red: number;
  readonly adres: string;
  readonly nomenklatura: string;
  readonly klyuch: string | null;
  readonly nomer: number | null;
  readonly tekst: string;
  readonly beleg: string;
  readonly belezi: Belezi;
  /** `null` = непрочетима дума в „Спряна" · находката я казва */
  readonly spryana: boolean | null;
}

export interface ProchetenaNomenklatura {
  readonly klyuch: string;
  readonly list: string;
  readonly redNaGlavata: number;
  readonly stoynosti: readonly ProchetenaStoynostNaNomenklatura[];
}

export interface Sluzhebno {
  readonly versiya: number | null;
  readonly otpechatak: string;
  readonly kursor: Kursor | null;
  readonly iznesenoNa: string;
  /** Стопанинът, който я е изнесъл · празно в стара Книга */
  readonly stopanin: string;
  /** върхът на всяка верига при износа · стара Книга носи само `kursor` */
  readonly kursori: ReadonlyMap<string, Kursor>;
}

export interface ProchetenaKnigaVKletki {
  readonly tablitsi: ReadonlyMap<string, ProchetenaTablitsa>;
  readonly nomenklaturi: ReadonlyMap<string, ProchetenaNomenklatura>;
  readonly sluzhebno: Sluzhebno | null;
  readonly nahodki: readonly Nahodka[];
  readonly sverki: readonly Sverka[];
}

const tekstNa = (v: ProchetenaStoynost | undefined): string =>
  v === null || v === undefined ? '' : podravni(String(v));

const ePrazen = (red: readonly ProchetenaStoynost[] | undefined): boolean =>
  red === undefined || red.every((v) => v === null || v === undefined || String(v).trim() === '');

/** Търсене на стойност по текст · точно · без главни · префикс · всяка неточност е бележка. */
export function namerIzbor(
  n: ZhivaNomenklatura,
  tekst: string,
  belezi: Belezi,
): {
  readonly nomer: number;
  readonly tekst: string;
  readonly spryana: boolean;
  readonly beleshka: string;
} | null {
  const t = podravni(tekst);
  if (t === '') return null;
  const po = n.podredbaPo;
  const vObhvata = n.stoynosti.filter((s) => po === undefined || s.belezi[po] === belezi[po]);
  const tochno = vObhvata.find((s) => podravni(s.tekst) === t);
  if (tochno)
    return { nomer: tochno.nomer, tekst: tochno.tekst, spryana: tochno.spryana, beleshka: '' };
  const bezGlavni = vObhvata.find((s) => podravni(s.tekst).toLowerCase() === t.toLowerCase());
  if (bezGlavni) {
    return {
      nomer: bezGlavni.nomer,
      tekst: bezGlavni.tekst,
      spryana: bezGlavni.spryana,
      beleshka: `„${t}" → „${bezGlavni.tekst}" (главните се различават)`,
    };
  }
  // най-дългото начало печели · „Сграда Б (стара)" е „Сграда Б", не „Сграда"
  const prefiks = [...vObhvata]
    .sort((a, b) => podravni(b.tekst).length - podravni(a.tekst).length)
    .find((s) => {
      const st = podravni(s.tekst);
      return t.startsWith(st) && /[\s(]/.test(t.charAt(st.length));
    });
  if (prefiks) {
    return {
      nomer: prefiks.nomer,
      tekst: prefiks.tekst,
      spryana: prefiks.spryana,
      beleshka: `„${t}" → „${prefiks.tekst}" (по началото)`,
    };
  }
  return null;
}

/** Броят на сегментите в номерация като текст · `3.1.1.27` → 4 · не-номерация → 0. */
function segmenti(tekst: string): number[] {
  const t = tekst.trim();
  if (!/^\d+(\.\d+)*$/.test(t)) return [];
  return t.split('.').map(Number);
}

/** Датата като ГГГГ-ММ-ДД · приема и неговото ДД.ММ.ГГГГ · иначе `null`. */
function dataOt(v: string): string | null {
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return Number.isNaN(Date.parse(`${t}T00:00:00Z`)) ? null : t;
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  if (m === null) return null;
  const iso = `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  return Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) ? null : iso;
}

/** Слятата клетка · дели се по ПЪРВИЯ разделител (интервалите около него не се броят). */
function razdeli(
  v: ProchetenaStoynost | undefined,
  razdelitel: string,
): [ProchetenaStoynost, ProchetenaStoynost] {
  const t = v === null || v === undefined ? '' : String(v);
  const r = razdelitel.trim();
  const i = t.indexOf(r);
  if (r === '' || i < 0) return [t.trim() === '' ? null : t.trim(), null];
  const lyavo = t.slice(0, i).trim();
  const dyasno = t.slice(i + r.length).trim();
  return [lyavo === '' ? null : lyavo, dyasno === '' ? null : dyasno];
}

function chislo(v: ProchetenaStoynost): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Коя негова лента коя страна отваря · за четеца на Сметки. */
const STRANA_NA_LENTATA: Readonly<Record<string, Strana | undefined>> = {
  [podravni(IMENA_NA_STRANITE.prihod)]: 'prihod',
  [podravni(IMENA_NA_STRANITE.razhod)]: 'razhod',
};

class Chetets {
  readonly nahodki: Nahodka[] = [];
  readonly sverki: Sverka[] = [];
  constructor(
    readonly o: Ogledalo,
    readonly kogato: string,
  ) {}

  nahodka(list: string, adres: string, kakvo: string, stepen: Nahodka['stepen'] = 'greshka'): void {
    this.nahodki.push({ list, adres, kakvo, stepen });
  }

  /** Живите Имоти по име · за връзките · нула, един или повече (тогава по име не се знае кой). */
  imotiPoIme(ime: string): readonly string[] {
    const t = this.o.tablitsi.get('imoti');
    if (t === undefined) return [];
    const tarseno = podravni(ime);
    const nameren: string[] = [];
    for (const i of zhiviteRedove(t)) {
      const k = kletkaNa(t, i, 'ime');
      if (k !== null && 'tekst' in k && podravni(k.tekst) === tarseno) nameren.push(t.id[i] ?? '');
    }
    return nameren;
  }

  /** Една клетка по вида на колоната. */
  kletka(
    list: string,
    red: number,
    kol: Kolona,
    j: number,
    v: ProchetenaStoynost | undefined,
    belezi: Belezi,
  ): ProchetenaKletka {
    const adres = `${bukvaNaKolona(j + 1)}${red}`;
    const osnova = { kolona: kol.klyuch, adres };
    if (v === null || v === undefined || String(v).trim() === '')
      return { ...osnova, stoynost: null };
    switch (kol.vid) {
      case 'evro': {
        if (typeof v === 'number') {
          // точната обратна проверка на записа (`st / 100`), без допуск: 1,15 и 0,29 минават,
          // 12,345 — не (правило 3: пази се точно)
          const st = Math.round(v * 100);
          if (st / 100 !== v) {
            this.nahodka(list, adres, `„${v}" не е цели центове.`);
            return { ...osnova, stoynost: undefined };
          }
          return { ...osnova, stoynost: { stoynost_st: st } };
        }
        try {
          return { ...osnova, stoynost: { stoynost_st: otSuma(String(v)) } };
        } catch {
          this.nahodka(list, adres, `„${v}" не е сума.`);
          return { ...osnova, stoynost: undefined };
        }
      }
      case 'chislo':
      case 'protsent': {
        const n = chislo(v);
        if (n === null) {
          this.nahodka(list, adres, `„${v}" не е число.`);
          return { ...osnova, stoynost: undefined };
        }
        if (kol.merka === 'kvsm') {
          const kvsm = Math.round(n * 10000);
          if (kvsm / 10000 !== n) {
            this.nahodka(list, adres, `„${v}" не е цели кв. см.`);
            return { ...osnova, stoynost: undefined };
          }
          return { ...osnova, stoynost: { chislo: kvsm } };
        }
        if (!Number.isInteger(n)) {
          this.nahodka(list, adres, `„${v}" не е цяло число.`);
          return { ...osnova, stoynost: undefined };
        }
        return { ...osnova, stoynost: { chislo: n } };
      }
      case 'izbor': {
        const n =
          kol.nomenklatura === undefined ? undefined : this.o.nomenklaturi.get(kol.nomenklatura);
        const tekst = String(v);
        const nameren = n === undefined ? null : namerIzbor(n, tekst, belezi);
        if (nameren === null)
          return { ...osnova, stoynost: undefined, nepoznatIzbor: podravni(tekst) };
        if (nameren.beleshka !== '') this.nahodka(list, adres, nameren.beleshka, 'beleshka');
        if (nameren.spryana) {
          this.nahodka(
            list,
            adres,
            `„${nameren.tekst}" е спряна от Настройки — върни я, преди да я избираш.`,
            'beleshka',
          );
        }
        return { ...osnova, stoynost: { nomer: nameren.nomer } };
      }
      case 'vrazka': {
        const ime = String(v);
        const imoti = this.imotiPoIme(ime);
        if (imoti.length === 1) return { ...osnova, stoynost: { tekst: imoti[0]! } };
        // няма или са повече · какво става с реда решава Сверчикът (той знае има ли ключ)
        return {
          ...osnova,
          stoynost: undefined,
          nepoznatRoditel: podravni(ime),
          ...(imoti.length > 1 ? { dvusmislen: imoti.length } : {}),
        };
      }
      case 'data': {
        const d = dataOt(String(v));
        if (d === null) {
          this.nahodka(list, adres, `„${v}" не е дата (ГГГГ-ММ-ДД или ДД.ММ.ГГГГ).`);
          return { ...osnova, stoynost: undefined };
        }
        return { ...osnova, stoynost: { tekst: d } };
      }
      case 'tekst':
        // NFC още тук (правило 11): NFD „й" от друга клавиатура не е промяна
        return { ...osnova, stoynost: { tekst: String(v).normalize('NFC').trim() } };
      case 'nomeratsiya':
        return { ...osnova, stoynost: null };
    }
  }

  /** Групов ред · от ключа или от A · B · C. */
  grupa(
    list: string,
    red: number,
    kletki: readonly ProchetenaStoynost[],
    klyuch: string | null,
    koloni: readonly Kolona[],
    t: Tablitsa,
  ): ProchetenaGrupa {
    const kategorii = this.o.nomenklaturi.get(NOMENKLATURA.kategoriya);
    const vKletkataNa = t.grupirane?.find((g) => g.vKletkataNa !== undefined);
    const jKat = koloni.findIndex((k) => k.klyuch === vKletkataNa?.vKletkataNa);
    const jImot = koloni.findIndex((k) => k.klyuch === t.roditel?.kolona);
    const kategoriyaTekst = jKat >= 0 ? tekstNa(kletki[jKat]) : '';
    const imotIme = jImot >= 0 ? tekstNa(kletki[jImot]) : '';
    if (klyuch?.startsWith(GRUPA) === true) {
      const [imotId = '', kat = ''] = klyuch.slice(GRUPA.length).split(RAZDELITEL_NA_GRUPATA);
      return {
        red,
        imotId,
        imotNomer: null,
        imotIme,
        kategoriya: Number(kat) || null,
        kategoriyaTekst,
        roditelId: imotId,
        roditelTablitsa: 'imoti',
        nomerVKnigata: tekstNa(kletki[0]),
      };
    }
    const seg = segmenti(tekstNa(kletki[0]));
    const nameren = kategorii === undefined ? null : namerIzbor(kategorii, kategoriyaTekst, {});
    if (nameren !== null && nameren.beleshka !== '')
      this.nahodka(list, `C${red}`, nameren.beleshka, 'beleshka');
    if (nameren === null && kategoriyaTekst !== '') {
      this.nahodka(
        list,
        `C${red}`,
        `Групата „${kategoriyaTekst}" не е категория от „${kategorii?.ime ?? ''}" — редовете под нея не влизат.`,
      );
    }
    const imoti = imotIme === '' ? [] : this.imotiPoIme(imotIme);
    if (imoti.length > 1) {
      this.nahodka(
        list,
        `B${red}`,
        `„${imotIme}" е име на ${imoti.length} живи Имота — по име не се знае кой; групата се чете по номера, ако и той съвпада.`,
        'beleshka',
      );
    }
    const imotId = imoti.length === 1 ? (imoti[0] ?? null) : null;
    return {
      red,
      imotId,
      imotNomer: seg[0] ?? null,
      imotIme,
      // непозната дума в C не се замества от числото в A · групата води само когато е четима
      kategoriya: nameren?.nomer ?? (kategoriyaTekst === '' ? (seg[1] ?? null) : null),
      kategoriyaTekst,
      roditelId: imotId,
      roditelTablitsa: 'imoti',
      nomerVKnigata: tekstNa(kletki[0]),
    };
  }

  /**
   * Лентата и главата на таблица · по МЯСТО · `null` в списъка = главата не се сравнява
   * (колона A) · `null` като резултат = не е разпозната, и находката е казана.
   */
  lentaIGlava(
    t: Tablitsa,
    l: ProchetenList,
    glavi: readonly (string | null)[],
    lenta?: string,
  ): { redNaGlavata: number; jKlyuch: number } | null {
    const imeNaLentata = podravni(lenta ?? t.ime);
    const redNaLentata = l.kletki.findIndex((r) => tekstNa(r[0]) === imeNaLentata);
    if (redNaLentata < 0) {
      this.nahodka(
        l.ime,
        'лист',
        t.nashaTablitsa === true
          ? `Няма лента „${t.ime}" — нашият блок още го няма в тази Книга; ще се появи при следващия износ.`
          : `Няма лента „${lenta ?? t.ime}" — таблицата не е разпозната.`,
        t.nashaTablitsa === true ? 'beleshka' : 'greshka',
      );
      return null;
    }
    const redNaGlavata = redNaLentata + 1;
    const glava = l.kletki[redNaGlavata] ?? [];
    // главите по МЯСТО · разминаването е находка, не пренареждане
    let razminati = 0;
    for (const [j, g] of glavi.entries()) {
      if (g === null || g === undefined) continue;
      if (tekstNa(glava[j]) !== podravni(g)) razminati += 1;
    }
    const broyNaGlavite = glavi.filter((g) => g !== null && g !== undefined).length;
    if (razminati * 2 > broyNaGlavite) {
      this.nahodka(
        l.ime,
        `ред ${redNaGlavata + 1}`,
        `Главата под „${t.ime}" не е неговата — таблицата не е разпозната.`,
      );
      return null;
    }
    if (razminati > 0)
      this.nahodka(
        l.ime,
        `ред ${redNaGlavata + 1}`,
        `${razminati} глави под „${t.ime}" са сменени · чета по място.`,
        'beleshka',
      );
    return { redNaGlavata, jKlyuch: glava.findIndex((g) => tekstNa(g) === KLYUCH) };
  }

  /**
   * Краят на таблицата: празен ред, лента на друга таблица или негова инструкция —
   * дописаното в празния ред не превръща инструкциите на следващата таблица в данни.
   */
  krayatNaTablitsata(t: Tablitsa): { lenti: Set<string>; instruktsii: Set<string> } {
    const lenti = new Set<string>();
    for (const dr of this.o.model.tablitsi.values())
      if (dr.prozorets === t.prozorets) lenti.add(podravni(dr.ime));
    for (const lenta of PROZORTSI.find((p) => p.klyuch === t.prozorets)?.lenti ?? [])
      lenti.add(podravni(lenta));
    const instruktsii = new Set(DUMI_OT_KNIGATA[t.prozorets].map((d) => podravni(d.tekst)));
    return { lenti, instruktsii };
  }

  /**
   * БАЗОВ ли е този ред · картината на неговите начални редове (ADR-008).
   *
   * Пишат се без ключ; ако човекът не ги е пипал, четенето ги подминава — иначе
   * всеки внос би предлагал пет „нови" реда, а неподвижната точка би паднала.
   */
  eBazov(t: Tablitsa, koloni: readonly Kolona[], kletki: readonly ProchetenaStoynost[]): boolean {
    if (t.bazovi === undefined) return false;
    return t.bazovi.some((bazov) =>
      koloni.every((k, j) => {
        if (k.vid === 'nomeratsiya') return true;
        return podravni(String(kletki[j] ?? '')) === podravni(bazov[k.klyuch] ?? '');
      }),
    );
  }

  /** Една таблица от Модела · намерена по лента и глава. */
  tablitsa(t: Tablitsa, l: ProchetenList): ProchetenaTablitsa | null {
    const koloni = koloniNaReda(t);
    const lg = this.lentaIGlava(
      t,
      l,
      koloni.map((k) => (k.vid === 'nomeratsiya' ? null : k.ime)),
    );
    if (lg === null) return null;
    const { redNaGlavata, jKlyuch } = lg;
    const sKlyuchove = jKlyuch >= 0;
    const redove: ProchetenRed[] = [];
    const grupi: ProchetenaGrupa[] = [];
    let tekushtaGrupa: ProchetenaGrupa | null = null;
    let nechetimi = 0;
    // сверката брои по ДВА пътя: обходените редове срещу класифицираните (правило 7)
    let obhodeni = 0;
    let bazovi = 0;
    let sKlyuch = 0;
    let bezKlyuch = 0;
    // суровите клетки на предишния ред с данни · за слетите връзки (неговото B55:B56)
    let predishni: readonly (ProchetenaStoynost | undefined)[] | null = null;
    const eSGrupi = t.grupirane?.some((g) => g.vKletkataNa !== undefined) === true;
    const jKat = eSGrupi
      ? koloni.findIndex((k) => k.klyuch === t.grupirane?.find((g) => g.vKletkataNa)?.vKletkataNa)
      : -1;
    // краят на таблицата: празен ред, лента на друга таблица или негова инструкция —
    // дописаното в празния ред не превръща инструкциите на следващата таблица в данни
    const { lenti, instruktsii } = this.krayatNaTablitsata(t);
    for (let i = redNaGlavata + 1; i < l.kletki.length; i += 1) {
      const kletki = l.kletki[i] ?? [];
      if (ePrazen(kletki.slice(0, Math.max(koloni.length, jKlyuch + 1)))) break;
      if (lenti.has(tekstNa(kletki[0])) || instruktsii.has(tekstNa(kletki[1]))) break;
      // неговият ред „ОБЩО евро" под всяка таблица с продажби е СБОР, не данни:
      // слятата клетка го повтаря в B..G и всяко число там би било „не е число"
      if (tekstNa(kletki[0]) === OBSHTO_EVRO) break;
      obhodeni += 1;
      const red = i + 1;
      if (this.eBazov(t, koloni, kletki)) {
        bazovi += 1;
        continue;
      }
      const klyuch = sKlyuchove ? tekstNa(kletki[jKlyuch]) || null : null;
      const nomeratsiya = tekstNa(kletki[0]);
      const seg = segmenti(nomeratsiya);
      const eGrupov =
        eSGrupi &&
        (klyuch?.startsWith(GRUPA) === true ||
          (klyuch === null && seg.length === 2 && tekstNa(kletki[jKat]) !== ''));
      if (eGrupov) {
        tekushtaGrupa = this.grupa(l.ime, red, kletki, klyuch, koloni, t);
        grupi.push(tekushtaGrupa);
        predishni = null;
        continue;
      }
      if (eSGrupi && tekushtaGrupa === null) {
        this.nahodka(
          l.ime,
          `ред ${red}`,
          'Редът не е под група (Имот · Категория) и не може да се прочете.',
        );
        nechetimi += 1;
        continue;
      }
      // номерът в A срещу групата · неговата Книга има `5.1.1.x` под `5.2` · групата води
      if (tekushtaGrupa !== null && seg.length >= 2) {
        const poImota = tekushtaGrupa.imotNomer !== null && seg[0] !== tekushtaGrupa.imotNomer;
        const poKategoriya =
          tekushtaGrupa.kategoriya !== null && seg[1] !== tekushtaGrupa.kategoriya;
        if (poImota || poKategoriya) {
          this.nahodka(
            l.ime,
            `A${red}`,
            `Номерът „${nomeratsiya}" не е под групата си (${tekushtaGrupa.imotNomer ?? '…'}.${tekushtaGrupa.kategoriya ?? '…'}) — чета го по групата.`,
            'beleshka',
          );
        }
      }
      const belezi: Belezi =
        tekushtaGrupa?.kategoriya != null ? { kategoriya: tekushtaGrupa.kategoriya } : {};
      // слята клетка · Excel пази текста само в горната · празна връзка под пълна наследява
      // горната, за да не се пише Имотът ред по ред · ИЗПРАЗНЕН ред (само ключ) не наследява:
      // той е махнат, не преместен под Имота отгоре
      const izprazen = ePrazen(kletki.slice(0, koloni.length));
      const surovi: (ProchetenaStoynost | undefined)[] = [...kletki];
      if (!izprazen) {
        for (const [j, kol] of koloni.entries()) {
          if (kol.vid === 'vrazka' && tekstNa(surovi[j]) === '' && predishni !== null)
            surovi[j] = predishni[j];
        }
      }
      const procheteni: ProchetenaKletka[] = [];
      for (const [j, kol] of koloni.entries()) {
        if (slotNaKolonata(kol) === undefined) continue;
        const adresNaKletkata = `${bukvaNaKolona(j + 1)}${red}`;
        const formula = l.formuli.get(adresNaKletkata);
        if (formula !== undefined && tekstNa(surovi[j]) === '') {
          // формула без кеширан резултат не е празна клетка · не бива да „изпразни"
          this.nahodka(
            l.ime,
            adresNaKletkata,
            `Формула без резултат (=${formula}) — отвори и запази файла в Excel, за да се сметне.`,
          );
          procheteni.push({ kolona: kol.klyuch, adres: adresNaKletkata, stoynost: undefined });
          continue;
        }
        const sl = slyataNa(t, kol.klyuch);
        if (sl !== undefined) {
          const [lyavo, dyasno] = razdeli(surovi[j], sl.razdelitel);
          procheteni.push(this.kletka(l.ime, red, kol, j, lyavo, belezi));
          const opashka = kolonaNa(t, sl.opashka);
          if (opashka !== undefined)
            procheteni.push(this.kletka(l.ime, red, opashka, j, dyasno, belezi));
          continue;
        }
        procheteni.push(this.kletka(l.ime, red, kol, j, surovi[j], belezi));
      }
      predishni = izprazen ? predishni : surovi;
      if (klyuch !== null && !klyuch.startsWith(GRUPA)) sKlyuch += 1;
      else bezKlyuch += 1;
      redove.push({
        red,
        adres: `A${red}`,
        klyuch: klyuch?.startsWith(GRUPA) === true ? null : klyuch,
        nomeratsiya,
        grupa: tekushtaGrupa,
        kletki: procheteni,
      });
    }
    this.sverki.push(
      sverka(
        `четене · ${l.ime} · ${t.klyuch}`,
        obhodeni,
        sKlyuch + bezKlyuch + grupi.length + bazovi + nechetimi,
        this.kogato,
        'обходени = с ключ + без ключ + групови + базови + нечетими',
      ),
    );
    return {
      klyuch: t.klyuch,
      list: l.ime,
      redNaGlavata: redNaGlavata + 1,
      sKlyuchove,
      redove,
      grupi,
    };
  }

  /** Първият ред с данни · под главата, подглавата и реда „филтър". */
  parviyatRed(t: Tablitsa, l: ProchetenList, redNaGlavata: number): number {
    let i = redNaGlavata + 1;
    if (t.podglava !== undefined) i += 1;
    if (
      t.redFiltar === true &&
      (l.kletki[i] ?? []).some((c) => tekstNa(c).toLowerCase() === FILTAR)
    )
      i += 1;
    return i;
  }

  /** Груповият ред на РОДИТЕЛ (Имот · Обект · Бизнес) · от ключа или от номера в A. */
  grupaNaRoditel(
    red: number,
    klyuch: string | null,
    nomerVKnigata: string,
    imeIme: string,
  ): ProchetenaGrupa {
    const roditelId = klyuch?.startsWith(GRUPA) === true ? klyuch.slice(GRUPA.length) : null;
    const roditelTablitsa =
      roditelId === null ? null : (tablitsaNaId(this.o.model, roditelId)?.klyuch ?? null);
    return {
      red,
      imotId: roditelTablitsa === 'imoti' ? roditelId : null,
      imotNomer: null,
      imotIme: imeIme,
      kategoriya: null,
      kategoriyaTekst: '',
      roditelId: roditelTablitsa === null ? null : roditelId,
      roditelTablitsa,
      nomerVKnigata,
    };
  }

  /**
   * Клетките на един ред по ОБЛИКА · `koya` казва коя колона на Модела стои под
   * всяка глава (задачата при Управление, движението при Сметки); слятата клетка
   * се дели по разделителя си. `nachalo` мести главите, когато една е широка две.
   */
  kletkiPoOblik(
    t: Tablitsa,
    l: ProchetenList,
    red: number,
    kletki: readonly ProchetenaStoynost[],
    oblik: readonly GlavaNaOblika[],
    koya: (g: GlavaNaOblika) => string | undefined,
    nachalo?: readonly number[],
  ): ProchetenaKletka[] {
    const procheteni: ProchetenaKletka[] = [];
    for (const [j, g] of oblik.entries()) {
      const ime = koya(g);
      if (ime === undefined) continue;
      const kol = kolonaNa(t, ime);
      if (kol === undefined) continue;
      const jj = nachalo?.[j] ?? j;
      const sl = slyataNa(t, kol.klyuch);
      if (sl !== undefined) {
        const [lyavo, dyasno] = razdeli(kletki[jj], sl.razdelitel);
        procheteni.push(this.kletka(l.ime, red, kol, jj, lyavo, {}));
        const opashka = kolonaNa(t, sl.opashka);
        if (opashka !== undefined)
          procheteni.push(this.kletka(l.ime, red, opashka, jj, dyasno, {}));
      } else procheteni.push(this.kletka(l.ime, red, kol, jj, kletki[jj], {}));
    }
    return procheteni;
  }

  /**
   * ДЪРВОТО на Управление · родители (групови редове от трите таблици на Имоти) и
   * задачи под тях · по неговия облик (десетте глави · подглавите · ред „филтър").
   * Родител: ред с номер в A (с ключ `grupa:` — по ключа); задача: ред с текст в
   * колоната на задачата под текущия родител; неговият ред 20 („1 Герман ПИ 1 Дело /
   * Сондаж") носи и двете. Другите клетки на родителя (C · D · H · I) са преписи от
   * листа ИмотиОбектиБизнеси и не се четат — изворът им е там.
   */
  darvo(t: Tablitsa, l: ProchetenList, oblik: readonly GlavaNaOblika[]): ProchetenaTablitsa | null {
    const lg = this.lentaIGlava(
      t,
      l,
      oblik.map((g) => (g.ot === 'nomeratsiya' ? null : g.glava)),
    );
    if (lg === null) return null;
    const { redNaGlavata, jKlyuch } = lg;
    const sKlyuchove = jKlyuch >= 0;
    const jZadacha = oblik.findIndex((g) => g.ot === 'zadacha');
    const jIme = oblik.findIndex((g) => g.ot === 'roditel' && g.kolona === 'ime');
    let i = this.parviyatRed(t, l, redNaGlavata);
    const { lenti, instruktsii } = this.krayatNaTablitsata(t);
    const redove: ProchetenRed[] = [];
    const grupi: ProchetenaGrupa[] = [];
    let tekushta: ProchetenaGrupa | null = null;
    let obhodeni = 0;
    let samoGrupovi = 0;
    let sKlyuch = 0;
    let bezKlyuch = 0;
    let drugi = 0;
    let nechetimi = 0;
    for (; i < l.kletki.length; i += 1) {
      const kletki = l.kletki[i] ?? [];
      if (ePrazen(kletki.slice(0, Math.max(oblik.length, jKlyuch + 1)))) break;
      if (lenti.has(tekstNa(kletki[0])) || instruktsii.has(tekstNa(kletki[1]))) break;
      // редът СБОР затваря дървото · той е сметка, не ред с данни
      if (tekstNa(kletki[0]).toLowerCase() === SBOR) break;
      obhodeni += 1;
      const red = i + 1;
      const klyuch = sKlyuchove ? tekstNa(kletki[jKlyuch]) || null : null;
      const nomeratsiya = tekstNa(kletki[0]);
      const eGrupov = klyuch?.startsWith(GRUPA) === true || (klyuch === null && nomeratsiya !== '');
      if (eGrupov) {
        tekushta = this.grupaNaRoditel(
          red,
          klyuch,
          nomeratsiya,
          jIme >= 0 ? tekstNa(kletki[jIme]) : '',
        );
        grupi.push(tekushta);
      }
      const eZadacha =
        tekstNa(kletki[jZadacha]) !== '' || (klyuch !== null && !klyuch.startsWith(GRUPA));
      if (!eZadacha) {
        if (eGrupov) samoGrupovi += 1;
        else drugi += 1;
        continue;
      }
      if (tekushta === null) {
        this.nahodka(
          l.ime,
          `ред ${red}`,
          'Задачата не е под Имот, Обект или Бизнес — не може да се прочете.',
        );
        nechetimi += 1;
        continue;
      }
      const procheteni = this.kletkiPoOblik(t, l, red, kletki, oblik, (g) =>
        g.ot === 'zadacha' ? g.kolona : undefined,
      );
      // връзката към родителя не е клетка · идва от групата · Сверчикът я разрешава
      const klyuchNaZadachata = klyuch?.startsWith(GRUPA) === true ? null : klyuch;
      redove.push({
        red,
        adres: `A${red}`,
        klyuch: klyuchNaZadachata,
        nomeratsiya: '',
        grupa: tekushta,
        kletki: procheteni,
      });
      if (klyuchNaZadachata !== null) sKlyuch += 1;
      else bezKlyuch += 1;
    }
    this.sverki.push(
      sverka(
        `четене · ${l.ime} · ${t.klyuch}`,
        obhodeni,
        samoGrupovi + sKlyuch + bezKlyuch + drugi + nechetimi,
        this.kogato,
        'обходени = само групови + задачи с ключ + без ключ + други + нечетими',
      ),
    );
    return {
      klyuch: t.klyuch,
      list: l.ime,
      redNaGlavata: redNaGlavata + 1,
      sKlyuchove,
      redove,
      grupi,
    };
  }

  /**
   * СЕКЦИИТЕ на Сметки · движенията под неговите ленти ПРИХОД и Разходи.
   *
   * Главите са ОБЩИ за листа (ред 15–16, под лентата „ОБЕКТИ"), затова се търсят
   * по нея. Оттам надолу: лентата казва СТРАНАТА, редът със секция (ключ
   * `grupa:sektsiya:‹страна›·‹номер›` или неговата дума в A) казва секцията, а
   * редовете под нея са движения. Ред с номер в A и без клетки на движение е
   * РОДИТЕЛ (неговите подсборови редове 38 · 44 · 56): дава родителя на редовете
   * под себе си, точно както в дървото. Блокът свършва на „Финансови Отчети…"
   * или на лентата „Кеш".
   */
  sektsii(
    t: Tablitsa,
    l: ProchetenList,
    oblik: readonly GlavaNaOblika[],
  ): ProchetenaTablitsa | null {
    const lenti = PROZORTSI.find((p) => p.klyuch === t.prozorets)?.lenti ?? [];
    const nachalo = nachalataNaGlavite(oblik);
    // главите се сверяват по ФИЗИЧЕСКАТА си колона · „Дата" при него е две (F15:G15)
    const glaviPoKolona: (string | null)[] = [];
    for (const [j, g] of oblik.entries())
      glaviPoKolona[nachalo[j]!] = g.ot === 'nomeratsiya' ? null : g.glava;
    const lg = this.lentaIGlava(t, l, glaviPoKolona, lenti[1]);
    if (lg === null) return null;
    const { redNaGlavata, jKlyuch } = lg;
    const sKlyuchove = jKlyuch >= 0;
    const jNa = (kolona: string): number =>
      nachalo[oblik.findIndex((g) => g.dvizhenie === kolona)] ?? -1;
    const jIme = nachalo[oblik.findIndex((g) => g.ot === 'roditel' && g.kolona === 'ime')] ?? 1;
    const krayat = new Set([
      podravni(lenti[5] ?? ''),
      podravni(tablitsata(this.o.model, 'kesh').ime),
    ]);
    const poStrana = new Map<string, Map<string, number>>();
    for (const strana of ['prihod', 'razhod'] as const) {
      const n = this.o.nomenklaturi.get(NOMENKLATURA_NA_STRANATA[strana]);
      const po = new Map<string, number>();
      for (const st of n?.stoynosti ?? []) po.set(podravni(st.tekst), st.nomer);
      poStrana.set(strana, po);
    }
    const redove: ProchetenRed[] = [];
    const grupi: ProchetenaGrupa[] = [];
    let strana: 'prihod' | 'razhod' | null = null;
    let sektsiya: number | null = null;
    let redNaSektsiyata = 0;
    let tekushta: ProchetenaGrupa | null = null;
    let obhodeni = 0;
    let sluzhebni = 0;
    let samoGrupovi = 0;
    let sKlyuch = 0;
    let bezKlyuch = 0;
    let nechetimi = 0;
    let i = this.parviyatRed(t, l, redNaGlavata);
    for (; i < l.kletki.length; i += 1) {
      const kletki = l.kletki[i] ?? [];
      const parva = tekstNa(kletki[0]);
      if (krayat.has(parva)) break;
      const kakvoE = STRANA_NA_LENTATA[parva];
      // лентата не е ред от таблицата · тя само отваря страната
      if (kakvoE !== undefined) {
        strana = kakvoE;
        sektsiya = null;
        tekushta = null;
        continue;
      }
      if (strana === null) continue;
      obhodeni += 1;
      const red = i + 1;
      const klyuch = sKlyuchove ? tekstNa(kletki[jKlyuch]) || null : null;
      const klyuchNaSektsiya =
        klyuch?.startsWith(`${GRUPA}${SEKTSIYA}`) === true
          ? klyuch.slice(GRUPA.length + SEKTSIYA.length)
          : null;
      if (klyuchNaSektsiya !== null) {
        const [imeNaStranata, nomer] = klyuchNaSektsiya.split(RAZDELITEL_NA_GRUPATA);
        if (imeNaStranata === 'prihod' || imeNaStranata === 'razhod') strana = imeNaStranata;
        sektsiya = Number(nomer);
        redNaSektsiyata = red;
        tekushta = null;
        sluzhebni += 1;
        continue;
      }
      // в Книга без ключове секцията се познава по ДУМАТА му · при ПРИХОД е в A
      // (A37 „Наем Банка"), при Разходи — в B (B75 „Заплати Кеш"); неговите B80 · B81
      // носят и функцията на секцията, затова думата бие функцията
      const poIme =
        poStrana.get(strana)?.get(parva) ?? poStrana.get(strana)?.get(tekstNa(kletki[1]));
      if (klyuch === null && poIme !== undefined) {
        sektsiya = poIme;
        redNaSektsiyata = red;
        tekushta = null;
        sluzhebni += 1;
        continue;
      }
      const eGrupov = klyuch?.startsWith(GRUPA) === true || (klyuch === null && parva !== '');
      if (eGrupov) {
        tekushta = this.grupaNaRoditel(red, klyuch, parva, tekstNa(kletki[jIme]));
        grupi.push(tekushta);
      }
      // движението се познава по ФУНКЦИЯТА (задължителна) или по своя ключ · сумата
      // не върши работа: в неговия лист K носи ДУМИ („ОБЩ Бюджет Сметки"), не числа
      const eDvizhenie =
        tekstNa(kletki[jNa('funktsiya')]) !== '' || (klyuch !== null && !klyuch.startsWith(GRUPA));
      if (!eDvizhenie) {
        if (eGrupov) samoGrupovi += 1;
        else sluzhebni += 1;
        continue;
      }
      if (sektsiya === null) {
        this.nahodka(l.ime, `ред ${red}`, 'Редът с пари не е под секция — не може да се прочете.');
        nechetimi += 1;
        continue;
      }
      const procheteni: ProchetenaKletka[] = [];
      const kolonaNaSektsiyata = kolonaNa(t, KOLONA_NA_SEKTSIYATA[strana]);
      if (kolonaNaSektsiyata !== undefined)
        procheteni.push({
          kolona: kolonaNaSektsiyata.klyuch,
          adres: `A${redNaSektsiyata}`,
          stoynost: { nomer: sektsiya },
        });
      procheteni.push(...this.kletkiPoOblik(t, l, red, kletki, oblik, (g) => g.dvizhenie, nachalo));
      const klyuchNaReda = klyuch?.startsWith(GRUPA) === true ? null : klyuch;
      redove.push({
        red,
        adres: `A${red}`,
        klyuch: klyuchNaReda,
        nomeratsiya: '',
        grupa: tekushta,
        kletki: procheteni,
      });
      if (klyuchNaReda !== null) sKlyuch += 1;
      else bezKlyuch += 1;
    }
    this.sverki.push(
      sverka(
        `четене · ${l.ime} · ${t.klyuch}`,
        obhodeni,
        sluzhebni + samoGrupovi + sKlyuch + bezKlyuch + nechetimi,
        this.kogato,
        'обходени = празни и секции + само родители + движения с ключ + без ключ + нечетими',
      ),
    );
    return {
      klyuch: t.klyuch,
      list: l.ime,
      redNaGlavata: redNaGlavata + 1,
      sKlyuchove,
      redove,
      grupi,
    };
  }

  /** Номенклатурите от Настройки(Стопанин) · една таблица с подтаблици. */
  nomenklaturi(l: ProchetenList): Map<string, ProchetenaNomenklatura> {
    const rezultat = new Map<string, ProchetenaNomenklatura>();
    const redNaLentata = l.kletki.findIndex((r) => tekstNa(r[0]) === NOMENKLATURI);
    if (redNaLentata < 0) {
      this.nahodka(
        l.ime,
        'лист',
        `Няма лента „${NOMENKLATURI}" — номенклатурите не се четат от този лист.`,
        'beleshka' /* неговата Книга няма такива · не е грешка */,
      );
      return rezultat;
    }
    const glava = l.kletki[redNaLentata + 1] ?? [];
    if (tekstNa(glava[2]) !== GLAVI_NA_NOMENKLATURITE[2]) {
      this.nahodka(
        l.ime,
        `ред ${redNaLentata + 2}`,
        'Главите на номенклатурите не са нашите — не се четат.',
      );
      return rezultat;
    }
    const jKlyuch = glava.findIndex((g) => tekstNa(g) === KLYUCH);
    const poIme = new Map<string, ZhivaNomenklatura>();
    for (const n of this.o.nomenklaturi.values()) poIme.set(podravni(n.ime), n);
    const kategorii = this.o.nomenklaturi.get(NOMENKLATURA.kategoriya);
    let i = redNaLentata + 2;
    while (i < l.kletki.length) {
      const zaglavie = l.kletki[i] ?? [];
      const n = poIme.get(tekstNa(zaglavie[0]));
      const slyata = tekstNa(zaglavie[2]) === '' || tekstNa(zaglavie[2]) === tekstNa(zaglavie[0]);
      if (n === undefined || !slyata) {
        i += 1;
        continue;
      }
      const redNaGlavata = i + 1;
      const stoynosti: ProchetenaStoynostNaNomenklatura[] = [];
      let poznati = 0;
      let novi = 0;
      let nechetimi = 0;
      let prazni = 0;
      let obhodeni = 0;
      i += 1;
      for (; i < l.kletki.length; i += 1) {
        const r = l.kletki[i] ?? [];
        const red = i + 1;
        const tekst = tekstNa(r[2]);
        const klyuch = jKlyuch >= 0 ? tekstNa(r[jKlyuch]) || null : null;
        if (ePrazen(r.slice(0, 5)) && klyuch === null) {
          // празният ред затваря подтаблицата · текст в него е нова стойност (виж горе)
          i += 1;
          break;
        }
        // заглавието на СЛЕДВАЩА подтаблица затваря тази · без празен ред помежду им,
        // когато новата стойност е написана точно в него
        const sledvashta = poIme.get(tekstNa(r[0]));
        if (sledvashta !== undefined && sledvashta.klyuch !== n.klyuch && klyuch === null) break;
        obhodeni += 1;
        const beleg = tekstNa(r[3]);
        let belezi: Belezi = {};
        if (n.podredbaPo !== undefined) {
          const kat = /^\d+$/.test(beleg)
            ? Number(beleg)
            : kategorii === undefined
              ? null
              : (namerIzbor(kategorii, beleg, {})?.nomer ?? null);
          if (kat === null) {
            this.nahodka(
              l.ime,
              `D${red}`,
              `„${beleg}" не е категория — стойността в „${n.ime}" иска белег.`,
            );
            nechetimi += 1;
            continue;
          }
          belezi = { [n.podredbaPo]: kat };
        }
        const nomerOtKlyucha = klyuch === null ? null : Number(klyuch.split('#')[2] ?? '');
        const nomer = klyuch !== null && Number.isInteger(nomerOtKlyucha) ? nomerOtKlyucha : null;
        if (klyuch === null && tekst === '') {
          // празна клетка без ключ · нищо за четене
          if (ePrazen(r.slice(0, 5))) {
            i += 1;
            break;
          }
          prazni += 1;
          continue;
        }
        if (nomer === null) novi += 1;
        else poznati += 1;
        // „Спряна" се чете по една дума · друга дума е грешка, не тиха посока
        const spryanaTekst = tekstNa(r[4]);
        const spryana =
          spryanaTekst === '' ? false : spryanaTekst.toLowerCase() === SPRYANA ? true : null;
        if (spryana === null) {
          this.nahodka(
            l.ime,
            `E${red}`,
            `„${spryanaTekst}" в „Спряна" не е дума, която чета — пиши „${SPRYANA}" или остави празно.`,
          );
        }
        stoynosti.push({
          red,
          adres: `C${red}`,
          nomenklatura: n.klyuch,
          klyuch,
          nomer,
          tekst,
          beleg,
          belezi,
          spryana,
        });
      }
      this.sverki.push(
        sverka(
          `четене · ${l.ime} · ${n.klyuch}`,
          obhodeni,
          poznati + novi + nechetimi + prazni,
          this.kogato,
          'обходени = познати + нови + нечетими + празни',
        ),
      );
      rezultat.set(n.klyuch, { klyuch: n.klyuch, list: l.ime, redNaGlavata, stoynosti });
    }
    return rezultat;
  }

  sluzhebno(l: ProchetenList): Sluzhebno {
    const po = new Map<string, readonly ProchetenaStoynost[]>();
    for (const r of l.kletki) if (typeof r[0] === 'string') po.set(r[0], r);
    const versiya = po.get(SLUZHEBNO.versiya)?.[1];
    const kursorOt = (r: readonly ProchetenaStoynost[] | undefined): Kursor | null =>
      r !== undefined && typeof r[1] === 'string' && typeof r[2] === 'number'
        ? { naematel: r[1], seq: r[2], hash: String(r[3] ?? '') }
        : null;
    const kursori = new Map<string, Kursor>();
    for (const r of l.kletki) {
      if (r[0] !== SLUZHEBNO.veriga) continue;
      const k = kursorOt(r);
      if (k !== null) kursori.set(k.naematel, k);
    }
    const kursor = kursorOt(po.get(SLUZHEBNO.kursor));
    if (kursor !== null && !kursori.has(kursor.naematel)) kursori.set(kursor.naematel, kursor);
    return {
      versiya: typeof versiya === 'number' ? versiya : null,
      otpechatak: String(po.get(SLUZHEBNO.otpechatak)?.[1] ?? ''),
      kursor,
      iznesenoNa: String(po.get(SLUZHEBNO.iznesenoNa)?.[1] ?? ''),
      stopanin: String(po.get(SLUZHEBNO.stopanin)?.[1] ?? ''),
      kursori,
    };
  }
}

/** Разпознава Книгата срещу Модела и живото Огледало · клетки, групи, номенклатури, служебно. */
export function razpoznayKnigata(
  kniga: ProchetenaKniga,
  o: Ogledalo,
  kogato: string,
): ProchetenaKnigaVKletki {
  const ch = new Chetets(o, kogato);
  const poList = new Map<string, ProchetenList>();
  for (const l of kniga.listove) poList.set(podravni(l.ime), l);
  const tablitsi = new Map<string, ProchetenaTablitsa>();
  const nomenklaturi = new Map<string, ProchetenaNomenklatura>();

  const sluzhebenList = poList.get(SLUZHEBEN_LIST);
  const sluzhebno = sluzhebenList === undefined ? null : ch.sluzhebno(sluzhebenList);

  for (const p of PROZORTSI) {
    const l = poList.get(podravni(p.list));
    if (l === undefined) {
      if (p.klyuch === 'imoti' || p.klyuch === 'nastroyki')
        ch.nahodka(p.list, 'лист', `Няма лист „${p.list}".`);
      continue;
    }
    if (p.klyuch === 'nastroyki') {
      for (const [k, v] of ch.nomenklaturi(l)) nomenklaturi.set(k, v);
      continue;
    }
    for (const t of o.model.tablitsi.values()) {
      if (t.prozorets !== p.klyuch) continue;
      const opis = tablitsata(o.model, t.klyuch);
      const pt =
        p.klyuch === 'upravlenie'
          ? ch.darvo(opis, l, OBLIK_NA_UPRAVLENIE)
          : t.klyuch === 'dvizheniya'
            ? ch.sektsii(opis, l, OBLIK_NA_SMETKI)
            : ch.tablitsa(opis, l);
      if (pt !== null) tablitsi.set(t.klyuch, pt);
    }
  }
  return { tablitsi, nomenklaturi, sluzhebno, nahodki: ch.nahodki, sverki: ch.sverki };
}
