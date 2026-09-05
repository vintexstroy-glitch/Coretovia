/**
 * ПИСАНЕТО НА КНИГАТА · от Огледалото към листовете, в НЕГОВИЯ ред (ADR-003).
 *
 * Изнесената Книга се отваря КАТО НЕГОВАТА: инструкциите му в колони A/B,
 * лента (слята), глава, данни — три пъти на ИмотиОбектиБизнеси; груповите
 * редове `2.1 · Гара Яна · Сграда`; номерацията като ТЕКСТ; парите с
 * `#,##0.00`; падащите менюта, сочещи подтаблиците на Настройки(Стопанин);
 * колоната „Ключ" скрита и заключена; листът защитен без парола, с данните
 * ОТКЛЮЧЕНИ. Служебният лист `_coretovia` носи версията, отпечатъка на Модела,
 * курсора и къде стои всяка таблица, за да може резен 2 да чете обратно.
 *
 * Тук не се пише в Журнала и не се вика команда (`knigata-e-adapter`): екранът
 * взима резултата, сваля файла и ЧАК тогава записва разписката през Портата.
 *
 * Сверката (правило 7): за всеки лист, служебния включително · инструкции +
 * празни + ленти + глави + данни + групови = редове на листа; и живите редове
 * по таблица за разписката.
 */

import { AGENTI, GLAVI_NA_AGENTITE, statusNaAgenta } from '../model/agenti.js';
import type { Kolona } from '../model/kolona.js';
import { DUMI_OT_KNIGATA, type DumaOtKnigata } from '../model/dumi-ot-knigata.js';
import { blokoveNaDumite } from '../model/dumite.js';
import type { Kletka } from '../model/kletka.js';
import type { KlyuchNaProzorets, ProzoretsVOsnovata } from '../model/klyuchove.js';
import { tablitsaNaId, tablitsata } from '../model/model.js';
import {
  type StoynostNaNomenklatura,
  type ZhivaNomenklatura,
  zhivite,
} from '../model/nomenklatura.js';
import {
  BROY_TAKT_KOLONI_V_KNIGATA,
  BUTONI_NA_UPRAVLENIE,
  OBLIK_NA_UPRAVLENIE,
  PROZORTSI,
  SLUZHEBEN_LIST,
  TAKT_GLAVA,
  type GlavaNaOblika,
  BROY_TAKT_KOLONI_V_SMETKI,
  OBLIK_NA_SMETKI,
  nachalataNaGlavite,
  shirinaNaOblika,
} from '../model/osnova.js';
import { otpechatakNaModela } from '../model/otpechatak.js';
import { kolonaNa, koloniNaReda, slyataNa, type Tablitsa } from '../model/tablitsa.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { type Red as RedNaOgledaloto, redKato, zhiviteRedove } from '../ogledalo/tablitsa.js';
import type { Kursor } from '../sabitiya/tovari.js';
import { darvoto } from '../smetach/darvo.js';
import { lentaNa, sboroveVKolonite } from '../smetach/gant.js';
import { dumiNaKletka, imeNaReda, imeNaVrazkata, tekstNaIzbora } from '../smetach/kletki.js';
import { type KolonaNaTakta, koloniNaTakta } from '../smetach/vreme.js';
import {
  grupiPoImotIKategoriya,
  nomerNaRed,
  podrediPoNomer,
  tekstNaNomera,
} from '../smetach/nomeratsiya.js';
import { IMENA_NA_STRANITE, smetkite } from '../smetach/smetki.js';
import { sverka, type Sverka } from '../yadro/sverka.js';
import {
  bukvaNaKolona,
  type KletkaZaPisane,
  type OpisNaList,
  type ValidatsiyaOtSpisak,
} from './ooxml.js';
import {
  FILTAR,
  GLAVI_NA_NOMENKLATURITE,
  GRUPA,
  KLYUCH,
  KLYUCH_KOLONA_IMOTI,
  KLYUCH_KOLONA_NASTROYKI,
  KLYUCH_KOLONA_UPRAVLENIE,
  SBOR,
  TAKT_ZNAK,
  NOMENKLATURI,
  RAZDELITEL_NA_GRUPATA,
  SLUZHEBNO,
  SPRYANA,
  KLYUCH_KOLONA_SMETKI,
  SEKTSIYA,
  DUMI_ZA_OTCHETITE,
} from './dumi.js';

export interface KnigaZaIznos {
  readonly listove: readonly OpisNaList[];
  /** живи редове по таблица · същото число иска `kniga.iznesi` */
  readonly redove: Readonly<Record<string, number>>;
  readonly sverki: readonly Sverka[];
}

type Red = KletkaZaPisane[];

const glava = (tekst: string): KletkaZaPisane => ({ tekst, glava: true });

/** Броячът на редовете по вид · за сверката на всеки лист. */
class Broyach {
  instruktsii = 0;
  prazni = 0;
  lenti = 0;
  glavi = 0;
  danni = 0;
  grupovi = 0;
  /** редът „филтър" под главите · неговата дума */
  filtri = 0;
  /** редът СБОР отдолу · наша дума (негово, 05.09) */
  sborove = 0;
  get sbor(): number {
    return (
      this.instruktsii +
      this.prazni +
      this.lenti +
      this.glavi +
      this.danni +
      this.grupovi +
      this.filtri +
      this.sborove
    );
  }
}

/** Инструкцията му · номерът като число, ако е цяло, иначе текст. */
function redNaDumata(d: DumaOtKnigata): Red {
  return [/^\d+$/.test(d.nomer) ? Number(d.nomer) : d.nomer, d.tekst];
}

/** Лист само с думите му, на неговите редове · за прозорците, които още не са построени. */
function listSamoSDumi(
  klyuch: KlyuchNaProzorets,
  ime: string,
  kogato: string,
): { list: OpisNaList; sverka: Sverka } {
  const redove: Red[] = [];
  const b = new Broyach();
  for (const d of DUMI_OT_KNIGATA[klyuch]) {
    while (redove.length < d.red - 1) {
      redove.push([]);
      b.prazni += 1;
    }
    redove.push(redNaDumata(d));
    b.instruktsii += 1;
  }
  return {
    list: { ime, redove },
    sverka: sverka(`износ · ${ime}`, b.sbor, redove.length, kogato),
  };
}

/** ИИ · инструкциите му + „Активни агенти" (петте му реда, със статус) + „Неактивни агенти" (празна, както е при него). */
function listII(
  ime: string,
  lenti: readonly string[],
  kogato: string,
): { list: OpisNaList; sverka: Sverka } {
  const redove: Red[] = [];
  const b = new Broyach();
  const slivaniya: string[] = [];
  for (const d of DUMI_OT_KNIGATA.ii) {
    while (redove.length < d.red - 1) {
      redove.push([]);
      b.prazni += 1;
    }
    redove.push(redNaDumata(d));
    b.instruktsii += 1;
  }
  const posledna = bukvaNaKolona(GLAVI_NA_AGENTITE.length);
  const lenta = (tekst: string): void => {
    redove.push([glava(tekst)]);
    slivaniya.push(`A${redove.length}:${posledna}${redove.length}`);
    b.lenti += 1;
    redove.push(GLAVI_NA_AGENTITE.map(glava));
    b.glavi += 1;
  };
  lenta(lenti[0] ?? '');
  for (const a of AGENTI) {
    redove.push([a.nomer, a.agent, a.dlazhnost, a.zadacha, statusNaAgenta(a)]);
    b.danni += 1;
  }
  lenta(lenti[1] ?? '');
  return {
    list: {
      ime,
      redove,
      slivaniya,
      shirini: { 1: 4, 2: 22, 3: 14, 4: 80, 5: 26, 6: 10, 7: 12 },
    },
    sverka: sverka(`износ · ${ime}`, b.sbor, redove.length, kogato),
  };
}

/**
 * Клетката за Excel · числото, не думите: пари → st/100, площ → кв. м, избор →
 * ТЕКСТЪТ на стойността (спряното се вижда в листа Настройки, не като суфикс),
 * връзка → името на реда.
 */
function kletkaZaExcel(
  o: Ogledalo,
  tablitsa: string,
  kolona: string,
  k: Kletka | null,
  red: Readonly<Record<string, Kletka>>,
): KletkaZaPisane {
  if (k === null) return null;
  const opis = tablitsata(o.model, tablitsa).koloni.find((c) => c.klyuch === kolona);
  if (opis === undefined) return null;
  switch (opis.vid) {
    case 'evro':
      return 'stoynost_st' in k ? k.stoynost_st / 100 : null;
    case 'chislo':
    case 'protsent':
      if (!('chislo' in k)) return null;
      return opis.merka === 'kvsm' ? k.chislo / 10000 : k.chislo;
    case 'izbor':
      return tekstNaIzbora(o, tablitsa, kolona, k, red);
    case 'vrazka':
      return 'tekst' in k ? imeNaVrazkata(o, opis, k.tekst) : null;
    case 'tekst':
    case 'data':
      return 'tekst' in k ? k.tekst : null;
    case 'nomeratsiya':
      return null;
  }
}

interface Podtablitsa {
  readonly klyuch: string;
  /** обхватът на ЖИВИТЕ стойности в колоната „Стойност" · за валидациите · празен без живи */
  readonly zhivi: string;
  /** целият обхват на подтаблицата · от главата ѝ до празния ред · за четенето обратно */
  readonly obhvat: string;
}

/** Настройки(Стопанин) · думите му + номенклатурите като ЕДНА таблица с подтаблици. */
function listNastroyki(
  o: Ogledalo,
  ime: string,
  kogato: string,
): { list: OpisNaList; podtablitsi: Map<string, Podtablitsa>; sverka: Sverka } {
  const redove: Red[] = [];
  const b = new Broyach();
  const slivaniya: string[] = [];
  const otklyucheni: string[] = [];
  const podtablitsi = new Map<string, Podtablitsa>();
  // ред 1 · неговата глава „№" · после инструкциите му на местата им
  redove.push([glava(GLAVI_NA_NOMENKLATURITE[1])]);
  b.glavi += 1;
  for (const d of DUMI_OT_KNIGATA.nastroyki) {
    while (redove.length < d.red - 1) {
      redove.push([]);
      b.prazni += 1;
    }
    redove.push(redNaDumata(d));
    b.instruktsii += 1;
  }
  redove.push([]);
  b.prazni += 1;
  const shirina = GLAVI_NA_NOMENKLATURITE.length;
  const posledna = bukvaNaKolona(shirina);
  redove.push([glava(NOMENKLATURI)]);
  slivaniya.push(`A${redove.length}:${posledna}${redove.length}`);
  b.lenti += 1;
  redove.push([...GLAVI_NA_NOMENKLATURITE.map(glava), glava(KLYUCH)]);
  b.glavi += 1;
  const kolonaStoynost = bukvaNaKolona(3);
  const kolonaSpryana = bukvaNaKolona(5);
  for (const n of o.nomenklaturi.values()) {
    redove.push([glava(n.ime)]);
    const glavaNaPodtablitsata = redove.length;
    slivaniya.push(`A${redove.length}:${posledna}${redove.length}`);
    b.glavi += 1;
    const zhiviStoynosti = zhivite(n);
    const spreni = n.stoynosti.filter((s) => s.spryana);
    const parviZhiv = redove.length + 1;
    for (const s of [...zhiviStoynosti, ...spreni]) {
      redove.push(redNaStoynost(n, s));
      // Стойността и „Спряна" са негови за писане; номерът, белегът и ключът — не
      otklyucheni.push(`${kolonaStoynost}${redove.length}`, `${kolonaSpryana}${redove.length}`);
      b.danni += 1;
    }
    const posledenZhiv = parviZhiv + zhiviStoynosti.length - 1;
    // празният ред след подтаблицата · там се пише нова стойност (резен 2 го чете)
    redove.push([]);
    otklyucheni.push(`A${redove.length}:${posledna}${redove.length}`);
    b.prazni += 1;
    podtablitsi.set(n.klyuch, {
      klyuch: n.klyuch,
      zhivi:
        zhiviStoynosti.length === 0
          ? ''
          : `$${kolonaStoynost}$${parviZhiv}:$${kolonaStoynost}$${posledenZhiv}`,
      obhvat: `A${glavaNaPodtablitsata}:${bukvaNaKolona(KLYUCH_KOLONA_NASTROYKI)}${redove.length}`,
    });
  }
  return {
    list: {
      ime,
      redove,
      slivaniya,
      otklyucheni,
      zashtita: true,
      skritiKoloni: [KLYUCH_KOLONA_NASTROYKI],
      shirini: { 1: 26, 2: 6, 3: 28, 4: 14, 5: 10 },
      formati: { 2: '0' },
    },
    podtablitsi,
    sverka: sverka(`износ · ${ime}`, b.sbor, redove.length, kogato),
  };
}

function redNaStoynost(n: ZhivaNomenklatura, s: StoynostNaNomenklatura): Red {
  const beleg = n.podredbaPo === undefined ? null : String(s.belezi[n.podredbaPo] ?? '');
  return [
    null,
    s.nomer,
    s.tekst,
    beleg,
    s.spryana ? SPRYANA : null,
    `${n.klyuch}#${beleg ?? ''}#${s.nomer}`,
  ];
}

/** Празният лист за писане · броячът и списъците, които всеки лист пълни. */
function novList(): {
  redove: Red[];
  b: Broyach;
  slivaniya: string[];
  validatsii: ValidatsiyaOtSpisak[];
  otklyucheni: string[];
  otklyucheniRedove: number[];
} {
  return {
    redove: [],
    b: new Broyach(),
    slivaniya: [],
    validatsii: [],
    otklyucheni: [],
    otklyucheniRedove: [],
  };
}

interface MyastoNaTablitsa {
  readonly klyuch: string;
  readonly list: string;
  readonly obhvat: string;
  readonly klyuchKolona: number;
  readonly redove: number;
}

/** ИмотиОбектиБизнеси · трите таблици в неговия ред · инструкции · лента · глава · данни. */
function listImoti(
  o: Ogledalo,
  ime: string,
  imeNaNastroykite: string,
  podtablitsi: Map<string, Podtablitsa>,
  kogato: string,
): { list: OpisNaList; mesta: MyastoNaTablitsa[]; sverka: Sverka } {
  const { redove, b, slivaniya, validatsii, otklyucheni, otklyucheniRedove } = novList();
  const mesta: MyastoNaTablitsa[] = [];
  const blokove = blokoveNaDumite('imoti');
  let zamraziPod: number | undefined;
  let avtofiltar: string | undefined;

  const izvorNa = (nomenklatura: string | undefined): string | undefined => {
    const p = nomenklatura === undefined ? undefined : podtablitsi.get(nomenklatura);
    return p === undefined || p.zhivi === '' ? undefined : `'${imeNaNastroykite}'!${p.zhivi}`;
  };

  const tablitsi = [...o.model.tablitsi.values()].filter((t) => t.prozorets === 'imoti');
  for (const [ti, t] of tablitsi.entries()) {
    for (const d of blokove[ti] ?? []) {
      redove.push(redNaDumata(d));
      b.instruktsii += 1;
    }
    // празен ред след инструкциите има само първият блок (неговите A3 · A15 · A53)
    if (ti === 0) {
      redove.push([]);
      b.prazni += 1;
    }
    const koloni = koloniNaReda(t);
    const posledna = bukvaNaKolona(koloni.length);
    redove.push([glava(t.ime)]);
    slivaniya.push(`A${redove.length}:${posledna}${redove.length}`);
    b.lenti += 1;
    const redNaGlavata = redove.length + 1;
    const glavaRed: Red = koloni.map((k) => glava(k.ime));
    glavaRed[KLYUCH_KOLONA_IMOTI - 1] = glava(KLYUCH);
    redove.push(glavaRed);
    b.glavi += 1;
    if (ti === 0) zamraziPod = redNaGlavata;
    const parviRed = redove.length + 1;
    const tv = o.tablitsi.get(t.klyuch);
    if (tv === undefined) continue;
    const nomerNa = new Map(podrediPoNomer(o, t.klyuch).map((r) => [r.i, r.nomer]));

    const redNaDanni = (i: number, bezKoloni: readonly string[] = []): void => {
      const r = redKato(tv, i);
      const red: Red = koloni.map((k) => {
        if (k.vid === 'nomeratsiya') return tekstNaNomera(nomerNa.get(i) ?? []);
        if (bezKoloni.includes(k.klyuch)) return null;
        return kletkaZaExcel(o, t.klyuch, k.klyuch, r.kletki[k.klyuch] ?? null, r.kletki);
      });
      red[KLYUCH_KOLONA_IMOTI - 1] = r.id;
      redove.push(red);
      b.danni += 1;
      // целият ред · и клетките извън деветте колони (K..XFD, като стил на реда): Excel трие
      // ред само когато нито една негова клетка не е заключена
      otklyucheni.push(`A${redove.length}:${bukvaNaKolona(KLYUCH_KOLONA_IMOTI)}${redove.length}`);
      otklyucheniRedove.push(redove.length);
      for (const [ki, k] of koloni.entries()) {
        if (k.vid !== 'izbor') continue;
        const izvor = izvorNa(k.nomenklatura);
        if (izvor !== undefined) {
          validatsii.push({ obhvat: `${bukvaNaKolona(ki + 1)}${redove.length}`, izvor });
        }
      }
    };

    if (t.grupirane?.some((g) => g.vKletkataNa !== undefined)) {
      // Обекти · групови редове `2.1 · Гара Яна · Сграда`, както в листа му
      const vKletkataNa = t.grupirane.find((g) => g.vKletkataNa !== undefined)!;
      const kolonaNaGrupata = koloni.findIndex((k) => k.klyuch === vKletkataNa.vKletkataNa);
      const kolonaNaImota = koloni.findIndex((k) => k.klyuch === t.roditel?.kolona);
      for (const g of grupiPoImotIKategoriya(o, [t.klyuch])) {
        const red: Red = koloni.map(() => null);
        red[0] = `${tekstNaNomera(g.imotNomer)}.${g.kategoriya}`;
        if (kolonaNaImota >= 0) red[kolonaNaImota] = g.imotIme;
        if (kolonaNaGrupata >= 0) red[kolonaNaGrupata] = g.kategoriyaTekst;
        red[KLYUCH_KOLONA_IMOTI - 1] = `${GRUPA}${g.imotId}${RAZDELITEL_NA_GRUPATA}${g.kategoriya}`;
        redove.push(red);
        b.grupovi += 1;
        for (const r of g.redove) redNaDanni(r.i, [t.roditel!.kolona]);
      }
    } else if (t.roditel !== undefined) {
      // Бизнеси · името на Имота само на първия ред от групата, слято надолу (неговото B55:B56)
      const kolonaNaImota = koloni.findIndex((k) => k.klyuch === t.roditel?.kolona);
      const bukva = bukvaNaKolona(kolonaNaImota + 1);
      let predishenImot = '';
      let nachaloNaGrupata = 0;
      for (const r of podrediPoNomer(o, t.klyuch)) {
        const imotKl = redKato(tv, r.i).kletki[t.roditel.kolona];
        const imot = imotKl !== undefined && 'tekst' in imotKl ? imotKl.tekst : '';
        const sashtiyat = imot === predishenImot && predishenImot !== '';
        redNaDanni(r.i, sashtiyat ? [t.roditel.kolona] : []);
        if (sashtiyat && kolonaNaImota >= 0) {
          const slivane = `${bukva}${nachaloNaGrupata}:${bukva}${redove.length}`;
          if (redove.length - nachaloNaGrupata === 1) slivaniya.push(slivane);
          else slivaniya[slivaniya.length - 1] = slivane;
        } else {
          predishenImot = imot;
          nachaloNaGrupata = redove.length;
        }
      }
    } else {
      // Имоти · плосък списък по номер
      for (const r of podrediPoNomer(o, t.klyuch)) redNaDanni(r.i);
      if (ti === 0 && redove.length >= parviRed) {
        avtofiltar = `A${redNaGlavata}:${posledna}${redove.length}`;
      }
    }
    // празният ред след таблицата е ОТКЛЮЧЕН · там се дописва (четенето спира на инструкция)
    otklyucheni.push(
      `A${redove.length + 1}:${bukvaNaKolona(KLYUCH_KOLONA_IMOTI)}${redove.length + 1}`,
    );
    otklyucheniRedove.push(redove.length + 1);
    mesta.push({
      klyuch: t.klyuch,
      list: ime,
      klyuchKolona: KLYUCH_KOLONA_IMOTI,
      obhvat:
        redove.length >= parviRed
          ? `A${parviRed}:${bukvaNaKolona(KLYUCH_KOLONA_IMOTI)}${redove.length}`
          : '',
      redove: zhiviteRedove(tv).length,
    });
    redove.push([]);
    b.prazni += 1;
  }

  const list: OpisNaList = {
    ime,
    redove,
    slivaniya,
    validatsii,
    otklyucheni,
    otklyucheniRedove,
    zashtita: true,
    skritiKoloni: [KLYUCH_KOLONA_IMOTI],
    tekstoviKoloni: [1],
    formati: { 5: '0.00', 6: '#,##0.00' },
    shirini: { 1: 10, 2: 22, 3: 22, 4: 8, 5: 10, 6: 14, 7: 22, 8: 26, 9: 18 },
    ...(zamraziPod === undefined ? {} : { zamraziPod }),
    ...(avtofiltar === undefined ? {} : { avtofiltar }),
  };
  return { list, mesta, sverka: sverka(`износ · ${ime}`, b.sbor, redove.length, kogato) };
}

/**
 * Слятата клетка в Книгата · `‹колона›‹разделител›‹опашка›` (неговото E20 „Дело / Сондаж",
 * F18 „Начало/Край") · празната опашка не оставя разделител.
 */
function slyataKletkaZaExcel(
  o: Ogledalo,
  t: Tablitsa,
  kol: Kolona,
  red: RedNaOgledaloto,
): KletkaZaPisane {
  const sl = slyataNa(t, kol.klyuch);
  if (sl === undefined)
    return kletkaZaExcel(o, t.klyuch, kol.klyuch, red.kletki[kol.klyuch] ?? null, red.kletki);
  const lyavo = dumiNaKletka(o, t.klyuch, kol.klyuch, red.kletki[kol.klyuch] ?? null, red.kletki);
  const dyasno = dumiNaKletka(o, t.klyuch, sl.opashka, red.kletki[sl.opashka] ?? null, red.kletki);
  if (lyavo === '' && dyasno === '') return null;
  return dyasno === '' ? lyavo : `${lyavo}${sl.razdelitel}${dyasno}`;
}

/** Месечните колони на такта в Книгата · от предишния месец нататък · колкото са при него. */
function koloniteNaTaktaVKnigata(kogato: string, broy: number) {
  const dnes = kogato.slice(0, 10);
  const vsichki = koloniNaTakta('godina', dnes);
  const tekusht = Math.max(
    1,
    vsichki.findIndex((k) => k.dnes),
  );
  return vsichki.slice(tekusht - 1, tekusht - 1 + broy);
}

/**
 * Описът на лист с дърво (Управление · Сметки) · защитен, с една скрита колона
 * „Ключ", текстова номерация в A и замразена шапка над данните.
 */
function opisNaListSDarvo(
  l: ReturnType<typeof novList>,
  ime: string,
  KL: number,
  shirini: Record<number, number>,
  zamraziPod: number,
  formati: Record<number, string>,
): OpisNaList {
  return {
    ime,
    redove: l.redove,
    slivaniya: l.slivaniya,
    validatsii: l.validatsii,
    otklyucheni: l.otklyucheni,
    otklyucheniRedove: l.otklyucheniRedove,
    zashtita: true,
    skritiKoloni: [KL],
    tekstoviKoloni: [1],
    formati,
    shirini,
    zamraziPod,
  };
}

/** Какво връща общата шапка на листовете с дърво (Управление и Сметки). */
interface Shapka {
  /** 1-базираната физическа колона на първия такт */
  readonly parvaTakt: number;
  readonly zamraziPod: number;
  readonly nachalo: readonly number[];
  readonly posledna: string;
}

/**
 * ОБЩАТА ШАПКА на Управление и Сметки · дословно неговата: инструкциите му ·
 * лентата „Бутони" с четиринайсетте бутона и сливанията им · лентите ОБЕКТИ и
 * Диаграма Гант · двете глави с подглавите и надписите на тактовете · редът
 * „филтър". Двата листа се различават по думите и по броя такт-колони, не по
 * строежа — затова тук е един дом (правило 14).
 */
function shapkaNaLista(
  l: ReturnType<typeof novList>,
  p: ProzoretsVOsnovata,
  dumi: readonly DumaOtKnigata[],
  oblik: readonly GlavaNaOblika[],
  KL: number,
  taktove: readonly KolonaNaTakta[],
): Shapka {
  const { redove, b, slivaniya } = l;
  const nachalo = nachalataNaGlavite(oblik);
  const shirinaNaGlavite = shirinaNaOblika(oblik);
  const parvaTakt = shirinaNaGlavite + 1;
  for (const d of dumi) {
    while (redove.length < d.red - 1) {
      redove.push([]);
      b.prazni += 1;
    }
    redove.push(redNaDumata(d));
    b.instruktsii += 1;
  }
  // Бутони · неговите думи и сливания (A13:R13 · A14:A15 … · L14:M14 · O14:R14)
  redove.push([glava(p.lenti[0] ?? '')]);
  const rLenta = redove.length;
  b.lenti += 1;
  const redGore: Red = [];
  const redDolu: Red = [];
  const rButoni = redove.length + 1;
  let kol = 1;
  for (const bt of BUTONI_NA_UPRAVLENIE) {
    redGore[kol - 1] = glava(bt.ime);
    if (bt.izbor === undefined) {
      slivaniya.push(`${bukvaNaKolona(kol)}${rButoni}:${bukvaNaKolona(kol)}${rButoni + 1}`);
      kol += 1;
    } else {
      for (const [i, d] of bt.izbor.entries()) redDolu[kol - 1 + i] = d;
      if (bt.izbor.length > 1)
        slivaniya.push(
          `${bukvaNaKolona(kol)}${rButoni}:${bukvaNaKolona(kol + bt.izbor.length - 1)}${rButoni}`,
        );
      kol += bt.izbor.length;
    }
  }
  slivaniya.push(`A${rLenta}:${bukvaNaKolona(kol - 1)}${rLenta}`);
  redove.push(redGore);
  redove.push(redDolu);
  b.glavi += 2;
  // ОБЕКТИ · Диаграма Гант (Календар)
  const redLenti: Red = [glava(p.lenti[1] ?? '')];
  redLenti[shirinaNaGlavite - 1] = glava(p.lenti[2] ?? '');
  redove.push(redLenti);
  const rLenti = redove.length;
  slivaniya.push(`A${rLenti}:${bukvaNaKolona(shirinaNaGlavite - 1)}${rLenti}`);
  slivaniya.push(
    `${bukvaNaKolona(shirinaNaGlavite)}${rLenti}:${bukvaNaKolona(parvaTakt + taktove.length - 1)}${rLenti}`,
  );
  b.lenti += 1;
  // двете глави · неговите · подглавите му и надписите на тактовете
  const redGlavi: Red = [];
  const redPodglavi: Red = [];
  for (const [j, g] of oblik.entries()) {
    redGlavi[nachalo[j]!] = glava(g.glava);
    redPodglavi[nachalo[j]!] = g.podglava ?? null;
    if ((g.shirina ?? 1) > 1) redPodglavi[nachalo[j]! + 1] = g.podglavaVtora ?? null;
  }
  for (const [i, tk] of taktove.entries()) {
    redGlavi[parvaTakt - 1 + i] = glava(TAKT_GLAVA);
    redPodglavi[parvaTakt - 1 + i] = tk.nadpis;
  }
  redGlavi[KL - 1] = glava(KLYUCH);
  redove.push(redGlavi);
  const rGlavi = redove.length;
  redove.push(redPodglavi);
  b.glavi += 2;
  for (const [j, g] of oblik.entries()) {
    const bukva = bukvaNaKolona(nachalo[j]! + 1);
    if ((g.shirina ?? 1) > 1) {
      slivaniya.push(`${bukva}${rGlavi}:${bukvaNaKolona(nachalo[j]! + (g.shirina ?? 1))}${rGlavi}`);
      continue;
    }
    if (g.podglava === undefined) slivaniya.push(`${bukva}${rGlavi}:${bukva}${rGlavi + 1}`);
  }
  // редът „филтър" · неговата дума под всяка колона освен A
  const redFiltar: Red = [];
  for (let j = 1; j < parvaTakt - 1 + taktove.length; j += 1) redFiltar[j] = FILTAR;
  redove.push(redFiltar);
  b.filtri += 1;
  return { parvaTakt, zamraziPod: redove.length, nachalo, posledna: bukvaNaKolona(KL) };
}

/** Изворът на валидацията за една номенклатура · обхватът ѝ в листа Настройки. */
function izvorNaValidatsiya(
  imeNaNastroykite: string,
  podtablitsi: Map<string, Podtablitsa>,
): (nomenklatura: string | undefined) => string | undefined {
  return (nomenklatura) => {
    const pt = nomenklatura === undefined ? undefined : podtablitsi.get(nomenklatura);
    return pt === undefined || pt.zhivi === '' ? undefined : `'${imeNaNastroykite}'!${pt.zhivi}`;
  };
}

/** Клетката на РОДИТЕЛЯ (груповия ред) под една негова глава. */
function roditelKletka(
  o: Ogledalo,
  g: GlavaNaOblika,
  tablitsa: string,
  red: RedNaOgledaloto,
): KletkaZaPisane {
  const opis = tablitsata(o.model, tablitsa);
  switch (g.kolona) {
    case 'ime': {
      if (tablitsa === 'imoti')
        return kletkaZaExcel(o, 'imoti', 'ime', red.kletki['ime'] ?? null, red.kletki);
      const imot = opis.roditel === undefined ? null : (red.kletki[opis.roditel.kolona] ?? null);
      return imot !== null && 'tekst' in imot ? imeNaReda(o, 'imoti', imot.tekst) : null;
    }
    case 'sastoyanie': {
      const k = tablitsa === 'obekti' ? 'vid' : 'sastoyanie';
      return tekstNaIzbora(o, tablitsa, k, red.kletki[k] ?? null, red.kletki) || null;
    }
    case 'nomer':
    case 'plosht':
    case 'tsena':
      return kletkaZaExcel(o, tablitsa, g.kolona, red.kletki[g.kolona] ?? null, red.kletki);
    default:
      return null;
  }
}

/**
 * Клетките на един ред по ОБЛИКА · `koya` казва коя колона на Модела стои под
 * всяка глава (задачата при Управление, движението при Сметки). Слятата клетка
 * се пише слята; изборът получава валидация към подтаблицата на Настройки.
 */
function pishiPoOblik(
  o: Ogledalo,
  t: Tablitsa,
  z: RedNaOgledaloto,
  red: Red,
  oblik: readonly GlavaNaOblika[],
  sh: Shapka,
  koya: (g: GlavaNaOblika) => string | undefined,
  oshte: {
    validatsii: ValidatsiyaOtSpisak[];
    naRed: number;
    izvorNa: (nomenklatura: string | undefined) => string | undefined;
    bezPrazni?: boolean;
  },
): void {
  for (const [j, g] of oblik.entries()) {
    const ime = koya(g);
    if (ime === undefined) continue;
    const k = kolonaNa(t, ime);
    if (k === undefined) continue;
    const stoynost = slyataKletkaZaExcel(o, t, k, z);
    if (stoynost !== null || oshte.bezPrazni !== true) red[sh.nachalo[j]!] = stoynost;
    if (k.vid === 'izbor' && slyataNa(t, k.klyuch) === undefined) {
      const izvor = oshte.izvorNa(k.nomenklatura);
      if (izvor !== undefined)
        oshte.validatsii.push({
          obhvat: `${bukvaNaKolona(sh.nachalo[j]! + 1)}${oshte.naRed}`,
          izvor,
        });
    }
  }
}

/**
 * ДЪРВОТО в листа · родителите като групови редове с ключ `grupa:`, задачите под
 * тях със слетите клетки и „■" в покритите тактове. Пише се И в двата листа:
 * при Управление е домът му, при Сметки е ПРЕПИС (неговите редове 18–35), който
 * се чете от Управление, за да не даде една задача две предложения.
 */
function redoveNaDarvoto(
  l: ReturnType<typeof novList>,
  o: Ogledalo,
  oblik: readonly GlavaNaOblika[],
  sh: Shapka,
  KL: number,
  taktove: readonly KolonaNaTakta[],
  izvorNa: (nomenklatura: string | undefined) => string | undefined,
): {
  readonly darvo: ReturnType<typeof darvoto>;
  readonly chislaPoData: readonly { data: string; chislo: number }[];
  readonly sborNaByudzheta: number;
  readonly parviRed: number;
  readonly posledenRed: number;
} {
  const { redove, b, validatsii, otklyucheni, otklyucheniRedove } = l;
  const t = tablitsata(o.model, 'zadachi');
  const tvZ = o.tablitsi.get('zadachi');
  const darvo = darvoto(o);
  const chislaPoData: { data: string; chislo: number }[] = [];
  const parviRed = redove.length + 1;
  let sborNaByudzheta = 0;
  for (const r of darvo.redove) {
    const red: Red = [];
    if (r.vid === 'roditel') {
      red[0] = tekstNaNomera(r.nomer);
      const tv = o.tablitsi.get(r.tablitsa)!;
      const negov = redKato(tv, r.i);
      for (const [j, g] of oblik.entries())
        if (g.ot === 'roditel') red[sh.nachalo[j]!] = roditelKletka(o, g, r.tablitsa, negov);
      red[KL - 1] = `${GRUPA}${r.id}`;
      redove.push(red);
      b.grupovi += 1;
      continue;
    }
    const z = redKato(tvZ!, r.i);
    pishiPoOblik(o, t, z, red, oblik, sh, (g) => (g.ot === 'zadacha' ? g.kolona : undefined), {
      validatsii,
      naRed: redove.length + 1,
      izvorNa,
    });
    const ot = z.kletki['ot'];
    const doo = z.kletki['do'];
    const lenta = lentaNa(
      {
        id: r.id,
        ot: ot !== undefined && 'tekst' in ot ? ot.tekst : '',
        do: doo !== undefined && 'tekst' in doo ? doo.tekst : '',
      },
      taktove,
    );
    if (lenta !== null)
      for (let i = lenta.ot; i < lenta.ot + lenta.broy; i += 1)
        red[sh.parvaTakt - 1 + i] = TAKT_ZNAK;
    const byudzhet = z.kletki['byudzhet'];
    if (byudzhet !== undefined && 'stoynost_st' in byudzhet) {
      sborNaByudzheta += byudzhet.stoynost_st;
      if (ot !== undefined && 'tekst' in ot)
        chislaPoData.push({ data: ot.tekst, chislo: byudzhet.stoynost_st });
    }
    red[KL - 1] = r.id;
    redove.push(red);
    b.danni += 1;
    const jE = oblik.findIndex((g) => g.ot === 'zadacha');
    otklyucheni.push(
      `${bukvaNaKolona(sh.nachalo[jE]! + 1)}${redove.length}:${sh.posledna}${redove.length}`,
    );
    otklyucheniRedove.push(redove.length);
  }
  return { darvo, chislaPoData, sborNaByudzheta, parviRed, posledenRed: redove.length };
}

/**
 * УправлениеДелаПреписки · листът му, дословно: инструкциите (1–12) · лентата Бутони с
 * неговите бутони (14–15, със сливанията му) · ОБЕКТИ + Диаграма Гант (16) · двете глави
 * (17–18, подглавите му) · редът „филтър" (19) · дървото Имот → Обект/Бизнес → Задача
 * (родителите като групови редове с ключ, задачите под тях, тактовете като клетки) · и
 * редът СБОР отдолу (негово, 05.09: „С опции за различни сметки отдолу").
 */
function listUpravlenie(
  o: Ogledalo,
  p: ProzoretsVOsnovata,
  imeNaNastroykite: string,
  podtablitsi: Map<string, Podtablitsa>,
  kogato: string,
): { list: OpisNaList; myasto: MyastoNaTablitsa; sverka: Sverka } {
  const l = novList();
  const { redove, b, otklyucheni, otklyucheniRedove } = l;
  const KL = KLYUCH_KOLONA_UPRAVLENIE;
  const oblik = OBLIK_NA_UPRAVLENIE;
  const taktove = koloniteNaTaktaVKnigata(kogato, BROY_TAKT_KOLONI_V_KNIGATA);
  const izvorNa = izvorNaValidatsiya(imeNaNastroykite, podtablitsi);
  const sh = shapkaNaLista(l, p, DUMI_OT_KNIGATA.upravlenie, oblik, KL, taktove);
  const d = redoveNaDarvoto(l, o, oblik, sh, KL, taktove, izvorNa);
  const jNa = (kolona: string): number =>
    sh.nachalo[oblik.findIndex((g) => g.kolona === kolona)] ?? 0;
  // празният ред след дървото е отключен · там се дописва задача под последния родител
  otklyucheni.push(`A${redove.length + 1}:${sh.posledna}${redove.length + 1}`);
  otklyucheniRedove.push(redove.length + 1);
  redove.push([]);
  b.prazni += 1;
  // СБОР · брой задачи · сборът на бюджета · и по такт, по началото на задачата
  const redSbor: Red = [SBOR, d.darvo.broyZadachi];
  redSbor[jNa('byudzhet')] = d.sborNaByudzheta / 100;
  for (const [i, sv] of sboroveVKolonite(taktove, d.chislaPoData).entries()) {
    if (sv.obhvat > 0 && sv.sbor !== 0) redSbor[sh.parvaTakt - 1 + i] = sv.sbor / 100;
  }
  redove.push(redSbor);
  b.sborove += 1;

  const shirini: Record<number, number> = {
    1: 10,
    2: 22,
    3: 22,
    4: 6,
    5: 28,
    6: 24,
    7: 16,
    8: 10,
    9: 14,
    10: 16,
  };
  for (let i = 0; i < taktove.length; i += 1) shirini[sh.parvaTakt + i] = 8;
  const list = opisNaListSDarvo(l, p.list, KL, shirini, sh.zamraziPod, {
    8: '0.00',
    9: '#,##0.00',
    10: '#,##0.00',
  });
  return {
    list,
    myasto: {
      klyuch: 'zadachi',
      list: p.list,
      klyuchKolona: KL,
      obhvat: d.posledenRed >= d.parviRed ? `A${d.parviRed}:${sh.posledna}${d.posledenRed}` : '',
      redove: d.darvo.broyZadachi,
    },
    sverka: sverka(`износ · ${p.list}`, b.sbor, redove.length, kogato),
  };
}

/**
 * СМЕТКИ · листът му, дословно: инструкциите (2–10) · Бутони (11–13) · ОБЕКТИ и
 * Диаграма Гант (14) · двете глави (15–16) · филтър (17) · дървото на ДЕЛАТА
 * (18–35, ПРЕПИС от Управление — домът на задачите е там) · ПРИХОД (36) със
 * секциите му · Разходи (74) със секциите му · „Финансови Отчети за избрания
 * период" (93) с думите кога идва · и накрая КЕШЪТ (наш блок, негова дума от
 * 05.09), сложен ПОД неговите редове, за да не мръдне нито един негов адрес.
 *
 * Подсборовете му по Имот вътре в секция (A38 „2.1 · ОБЩ Бюджет Сметки") не се
 * пишат: сборът е на СЕКЦИЯТА, а сборът по Имот идва с формулите (резен 6).
 */
function listSmetki(
  o: Ogledalo,
  p: ProzoretsVOsnovata,
  imeNaNastroykite: string,
  podtablitsi: Map<string, Podtablitsa>,
  kogato: string,
): { list: OpisNaList; mesta: MyastoNaTablitsa[]; sverka: Sverka } {
  const l = novList();
  const { redove, b, slivaniya, validatsii, otklyucheni, otklyucheniRedove } = l;
  const KL = KLYUCH_KOLONA_SMETKI;
  const oblik = OBLIK_NA_SMETKI;
  const t = tablitsata(o.model, 'dvizheniya');
  const tvD = o.tablitsi.get('dvizheniya');
  const taktove = koloniteNaTaktaVKnigata(kogato, BROY_TAKT_KOLONI_V_SMETKI);
  const izvorNa = izvorNaValidatsiya(imeNaNastroykite, podtablitsi);
  const sh = shapkaNaLista(l, p, DUMI_OT_KNIGATA.smetki, oblik, KL, taktove);
  const shirinaNaGlavite = sh.parvaTakt - 1;
  const jNa = (kolona: string): number =>
    sh.nachalo[oblik.findIndex((g) => g.dvizhenie === kolona)] ?? 0;
  redoveNaDarvoto(l, o, oblik, sh, KL, taktove, izvorNa);
  redove.push([]);
  b.prazni += 1;

  /** Един ред с пари · родителят пълни A–D · I · J, движението — C · E · F · K. */
  const redNaDvizhenie = (i: number): Red => {
    const red: Red = [];
    const z = redKato(tvD!, i);
    const kam = z.kletki['kam'];
    const idNaRoditelya = kam !== undefined && 'tekst' in kam ? kam.tekst : '';
    const opisNaRoditelya = idNaRoditelya === '' ? undefined : tablitsaNaId(o.model, idNaRoditelya);
    if (opisNaRoditelya !== undefined) {
      const tvR = o.tablitsi.get(opisNaRoditelya.klyuch);
      const ir = tvR?.indeks.get(idNaRoditelya);
      if (tvR !== undefined && ir !== undefined) {
        const negov = redKato(tvR, ir);
        red[0] = tekstNaNomera(nomerNaRed(o, opisNaRoditelya.klyuch, ir));
        for (const [j, g] of oblik.entries())
          if (g.ot === 'roditel')
            red[sh.nachalo[j]!] = roditelKletka(o, g, opisNaRoditelya.klyuch, negov);
      }
    }
    // името на реда бие състоянието на родителя (неговите „[служител 1]")
    pishiPoOblik(o, t, z, red, oblik, sh, (g) => g.dvizhenie, {
      validatsii,
      naRed: redove.length + 1,
      izvorNa,
      bezPrazni: true,
    });
    const mesets = z.kletki['mesets'];
    if (mesets !== undefined && 'tekst' in mesets) {
      const iT = taktove.findIndex((tk) => tk.ot.slice(0, 7) === mesets.tekst);
      if (iT >= 0) red[sh.parvaTakt - 1 + iT] = TAKT_ZNAK;
    }
    red[KL - 1] = z.id;
    return red;
  };

  const s = smetkite(o, kogato);
  const parviRed = redove.length + 1;
  for (const strana of ['prihod', 'razhod'] as const) {
    const rLenta = redove.length + 1;
    redove.push([glava(IMENA_NA_STRANITE[strana])]);
    slivaniya.push(`A${rLenta}:${bukvaNaKolona(shirinaNaGlavite)}${rLenta}`);
    b.lenti += 1;
    for (const sek of strana === 'prihod' ? s.prihod : s.razhod) {
      const redSek: Red = [glava(sek.tekst)];
      redSek[jNa('suma')] = sek.sbor / 100;
      redSek[KL - 1] = `${GRUPA}${SEKTSIYA}${strana}${RAZDELITEL_NA_GRUPATA}${sek.nomer}`;
      redove.push(redSek);
      b.grupovi += 1;
      for (const r of sek.redove) {
        redove.push(redNaDvizhenie(r.i));
        b.danni += 1;
        const otKolona = bukvaNaKolona(jNa('ime') + 1);
        otklyucheni.push(`${otKolona}${redove.length}:${sh.posledna}${redove.length}`);
        otklyucheniRedove.push(redove.length);
      }
    }
  }
  const posledenRed = redove.length;
  // празният ред след секциите е отключен · там се дописва движение под последната
  otklyucheni.push(`A${redove.length + 1}:${sh.posledna}${redove.length + 1}`);
  otklyucheniRedove.push(redove.length + 1);
  redove.push([]);
  b.prazni += 1;
  // неговата лента „Финансови Отчети…" · коефициентите и диаграмите идват с резен 6
  const rOtcheti = redove.length + 1;
  redove.push([glava(p.lenti[5] ?? '')]);
  slivaniya.push(`A${rOtcheti}:${bukvaNaKolona(shirinaNaGlavite)}${rOtcheti}`);
  b.lenti += 1;
  redove.push([DUMI_ZA_OTCHETITE]);
  b.instruktsii += 1;
  redove.push([]);
  b.prazni += 1;

  // КЕШЪТ · наш блок с негова дума (05.09) · лента · глава · ред на месец
  const tK = tablitsata(o.model, 'kesh');
  const tvK = o.tablitsi.get('kesh');
  const rKesh = redove.length + 1;
  redove.push([glava(tK.ime)]);
  slivaniya.push(`A${rKesh}:${bukvaNaKolona(koloniNaReda(tK).length)}${rKesh}`);
  b.lenti += 1;
  const glaviKesh: Red = koloniNaReda(tK).map((k) => glava(k.ime));
  glaviKesh[KL - 1] = glava(KLYUCH);
  redove.push(glaviKesh);
  b.glavi += 1;
  const parviKesh = redove.length + 1;
  let posledenKesh = redove.length;
  if (tvK !== undefined) {
    for (const i of zhiviteRedove(tvK)) {
      const z = redKato(tvK, i);
      const red: Red = koloniNaReda(tK).map((k) =>
        kletkaZaExcel(o, 'kesh', k.klyuch, z.kletki[k.klyuch] ?? null, z.kletki),
      );
      red[KL - 1] = z.id;
      redove.push(red);
      b.danni += 1;
      otklyucheni.push(`A${redove.length}:${sh.posledna}${redove.length}`);
      otklyucheniRedove.push(redove.length);
      posledenKesh = redove.length;
    }
  }
  otklyucheni.push(`A${redove.length + 1}:${sh.posledna}${redove.length + 1}`);
  otklyucheniRedove.push(redove.length + 1);
  redove.push([]);
  b.prazni += 1;

  const shirini: Record<number, number> = {
    1: 10,
    2: 22,
    3: 26,
    4: 6,
    5: 24,
    6: 12,
    7: 12,
    8: 16,
    9: 10,
    10: 14,
    11: 16,
  };
  for (let i = 0; i < taktove.length; i += 1) shirini[sh.parvaTakt + i] = 8;
  const list = opisNaListSDarvo(l, p.list, KL, shirini, sh.zamraziPod, {
    9: '0.00',
    10: '#,##0.00',
    11: '#,##0.00',
  });
  return {
    list,
    mesta: [
      {
        klyuch: 'dvizheniya',
        list: p.list,
        klyuchKolona: KL,
        obhvat: posledenRed >= parviRed ? `A${parviRed}:${sh.posledna}${posledenRed}` : '',
        redove: s.broyDvizheniya,
      },
      {
        klyuch: 'kesh',
        list: p.list,
        klyuchKolona: KL,
        obhvat: posledenKesh >= parviKesh ? `A${parviKesh}:${sh.posledna}${posledenKesh}` : '',
        redove: tvK === undefined ? 0 : zhiviteRedove(tvK).length,
      },
    ],
    sverka: sverka(`износ · ${p.list}`, b.sbor, redove.length, kogato),
  };
}

/** Служебният лист · какво трябва на резен 2, за да чете обратно без да гадае. */
function listSluzheben(
  o: Ogledalo,
  kursor: Kursor,
  kogato: string,
  mesta: readonly MyastoNaTablitsa[],
  listNastroyki: string,
  podtablitsi: Map<string, Podtablitsa>,
): { list: OpisNaList; sverka: Sverka } {
  const redove: Red[] = [
    [SLUZHEBNO.versiya, o.model.versiya],
    [SLUZHEBNO.otpechatak, otpechatakNaModela(o.model)],
    [SLUZHEBNO.kursor, kursor.naematel, kursor.seq, kursor.hash],
    [SLUZHEBNO.iznesenoNa, kogato],
    [SLUZHEBNO.stopanin, o.stopanin],
  ];
  // върхът на ВСЯКА верига, не само на пишещата: сблъсъкът се мери по веригата на реда
  for (const k of o.kursori.values()) redove.push([SLUZHEBNO.veriga, k.naematel, k.seq, k.hash]);
  for (const m of mesta) {
    redove.push([SLUZHEBNO.tablitsa, m.klyuch, m.list, m.obhvat, m.klyuchKolona, m.redove]);
  }
  for (const p of podtablitsi.values()) {
    redove.push([
      SLUZHEBNO.nomenklatura,
      p.klyuch,
      listNastroyki,
      p.obhvat,
      p.zhivi,
      KLYUCH_KOLONA_NASTROYKI,
    ]);
  }
  return {
    list: { ime: SLUZHEBEN_LIST, redove, skrit: true },
    sverka: sverka(
      `износ · ${SLUZHEBEN_LIST}`,
      5 + o.kursori.size + mesta.length + podtablitsi.size,
      redove.length,
      kogato,
    ),
  };
}

/** Книгата от Огледалото · осемте листа + служебният · в реда на Книгата му. */
export function knigataOtOgledaloto(o: Ogledalo, kursor: Kursor, kogato: string): KnigaZaIznos {
  const listove: OpisNaList[] = [];
  const sverki: Sverka[] = [];
  const nastroyki = PROZORTSI.find((p) => p.klyuch === 'nastroyki')!;
  const n = listNastroyki(o, nastroyki.list, kogato);
  const mesta: MyastoNaTablitsa[] = [];
  for (const p of PROZORTSI) {
    if (p.klyuch === 'nastroyki') {
      listove.push(n.list);
      sverki.push(n.sverka);
    } else if (p.klyuch === 'imoti') {
      const i = listImoti(o, p.list, nastroyki.list, n.podtablitsi, kogato);
      listove.push(i.list);
      sverki.push(i.sverka);
      mesta.push(...i.mesta);
    } else if (p.klyuch === 'upravlenie') {
      const u = listUpravlenie(o, p, nastroyki.list, n.podtablitsi, kogato);
      listove.push(u.list);
      sverki.push(u.sverka);
      mesta.push(u.myasto);
    } else if (p.klyuch === 'smetki') {
      const sm = listSmetki(o, p, nastroyki.list, n.podtablitsi, kogato);
      listove.push(sm.list);
      sverki.push(sm.sverka);
      mesta.push(...sm.mesta);
    } else if (p.klyuch === 'ii') {
      const s = listII(p.list, p.lenti, kogato);
      listove.push(s.list);
      sverki.push(s.sverka);
    } else {
      const s = listSamoSDumi(p.klyuch, p.list, kogato);
      listove.push(s.list);
      sverki.push(s.sverka);
    }
  }
  const sl = listSluzheben(o, kursor, kogato, mesta, nastroyki.list, n.podtablitsi);
  listove.push(sl.list);
  sverki.push(sl.sverka);
  const redove: Record<string, number> = {};
  for (const [klyuch, t] of o.tablitsi) redove[klyuch] = zhiviteRedove(t).length;
  return { listove, redove, sverki };
}
