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
import { DUMI_OT_KNIGATA, type DumaOtKnigata } from '../model/dumi-ot-knigata.js';
import { blokoveNaDumite } from '../model/dumite.js';
import type { Kletka } from '../model/kletka.js';
import type { KlyuchNaProzorets } from '../model/klyuchove.js';
import { tablitsata } from '../model/model.js';
import {
  type StoynostNaNomenklatura,
  type ZhivaNomenklatura,
  zhivite,
} from '../model/nomenklatura.js';
import { PROZORTSI, SLUZHEBEN_LIST } from '../model/osnova.js';
import { otpechatakNaModela } from '../model/otpechatak.js';
import { koloniNaReda } from '../model/tablitsa.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { redKato, zhiviteRedove } from '../ogledalo/tablitsa.js';
import type { Kursor } from '../sabitiya/tovari.js';
import { imeNaReda, tekstNaIzbora } from '../smetach/kletki.js';
import { grupiPoImotIKategoriya, podrediPoNomer, tekstNaNomera } from '../smetach/nomeratsiya.js';
import { sverka, type Sverka } from '../yadro/sverka.js';
import {
  bukvaNaKolona,
  type KletkaZaPisane,
  type OpisNaList,
  type ValidatsiyaOtSpisak,
} from './ooxml.js';
import {
  GLAVI_NA_NOMENKLATURITE,
  GRUPA,
  KLYUCH,
  KLYUCH_KOLONA_IMOTI,
  KLYUCH_KOLONA_NASTROYKI,
  NOMENKLATURI,
  RAZDELITEL_NA_GRUPATA,
  SLUZHEBNO,
  SPRYANA,
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
  get sbor(): number {
    return this.instruktsii + this.prazni + this.lenti + this.glavi + this.danni + this.grupovi;
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
      return 'tekst' in k && opis.vrazka !== undefined ? imeNaReda(o, opis.vrazka, k.tekst) : null;
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

interface MyastoNaTablitsa {
  readonly klyuch: string;
  readonly obhvat: string;
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
  const redove: Red[] = [];
  const b = new Broyach();
  const slivaniya: string[] = [];
  const validatsii: ValidatsiyaOtSpisak[] = [];
  const otklyucheni: string[] = [];
  const otklyucheniRedove: number[] = [];
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

/** Служебният лист · какво трябва на резен 2, за да чете обратно без да гадае. */
function listSluzheben(
  o: Ogledalo,
  kursor: Kursor,
  kogato: string,
  listImoti: string,
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
    redove.push([SLUZHEBNO.tablitsa, m.klyuch, listImoti, m.obhvat, KLYUCH_KOLONA_IMOTI, m.redove]);
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
  let mesta: MyastoNaTablitsa[] = [];
  let imeNaImotite = '';
  for (const p of PROZORTSI) {
    if (p.klyuch === 'nastroyki') {
      listove.push(n.list);
      sverki.push(n.sverka);
    } else if (p.klyuch === 'imoti') {
      const i = listImoti(o, p.list, nastroyki.list, n.podtablitsi, kogato);
      listove.push(i.list);
      sverki.push(i.sverka);
      mesta = i.mesta;
      imeNaImotite = p.list;
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
  const sl = listSluzheben(o, kursor, kogato, imeNaImotite, mesta, nastroyki.list, n.podtablitsi);
  listove.push(sl.list);
  sverki.push(sl.sverka);
  const redove: Record<string, number> = {};
  for (const [klyuch, t] of o.tablitsi) redove[klyuch] = zhiviteRedove(t).length;
  return { listove, redove, sverki };
}
