/**
 * РЕГИСТЪРЪТ НА СЪБИТИЯТА · типовете на резен 1 (`TIP`) и проверката на товара им.
 *
 * ЕДНА проверка, ДВА входа: командата я вика ПРЕДИ Вратата (отказ с думи,
 * правило 12), а Огледалото — при четене от Журнала (Журналът може да е пипан
 * отвън; каквото не минава, се брои като непрочетено, не се гадае).
 *
 * `SABITIYA` е ТИПИЗИРАН литерал върху `TipSabitie`: нов тип без проверка не
 * се компилира. Същото важи за четците (`ogledalo/chettsi.ts`).
 */

import { slotNaKolonata } from '../model/kolona.js';
import type { Model } from '../model/model.js';
import { eKletka, slotNaKletka } from '../model/kletka.js';

export const TIP = Object.freeze({
  stopaninZapisan: 'СтопанинЗаписан',
  stoynostZapisana: 'СтойностНаНоменклатураЗаписана',
  stoynostSpryana: 'СтойностНаНоменклатураСпряна',
  redZapisan: 'РедЗаписан',
  redIzklyuchen: 'РедИзключен',
  knigaIznesena: 'КнигаИзнесена',
  knigaVnesena: 'КнигаВнесена',
  storno: 'Сторно',
} as const);

export type TipSabitie = (typeof TIP)[keyof typeof TIP];

type Tovar = Readonly<Record<string, unknown>>;

/** Проверка на товар · връща думи; празно = минава. */
export type Proverka = (p: Tovar, model: Model) => readonly string[];

const eTsyalo = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x);
const eNeprazenTekst = (x: unknown): x is string => typeof x === 'string' && x.trim() !== '';

function proveriNomenklatura(p: Tovar, model: Model, n: string[]): void {
  if (!eNeprazenTekst(p['nomenklatura'])) n.push('Липсва „nomenklatura".');
  else if (!model.nomenklaturi.has(p['nomenklatura'])) {
    n.push(`Няма номенклатура „${p['nomenklatura']}" в Модела.`);
  }
  if (!eTsyalo(p['nomer']) || p['nomer'] < 1) n.push('„nomer" трябва да е цяло число ≥ 1.');
}

function proveriAdresNaRed(p: Tovar, model: Model, n: string[]): void {
  const t = eNeprazenTekst(p['tablitsa']) ? model.tablitsi.get(p['tablitsa']) : undefined;
  if (t === undefined) n.push(`Няма таблица „${String(p['tablitsa'])}" в Модела.`);
  if (!eNeprazenTekst(p['id'])) n.push('Липсва „id".');
  else if (t !== undefined && !p['id'].startsWith(`${t.sashtnost}:`)) {
    n.push(`Редът „${p['id']}" не е от вида „${t.sashtnost}".`);
  }
}

/** Белезите · прост обект · при номенклатура по белег белегът е задължителен. */
function proveriBelezi(p: Tovar, model: Model, n: string[]): void {
  const belezi = p['belezi'];
  if (typeof belezi !== 'object' || belezi === null || Array.isArray(belezi)) {
    n.push('„belezi" трябва да е обект.');
    return;
  }
  for (const [k, v] of Object.entries(belezi)) {
    if (!['string', 'number', 'boolean'].includes(typeof v)) n.push(`Белегът „${k}" не е прост.`);
  }
  const nom = eNeprazenTekst(p['nomenklatura'])
    ? model.nomenklaturi.get(p['nomenklatura'])
    : undefined;
  if (nom?.podredbaPo !== undefined && (belezi as Tovar)[nom.podredbaPo] === undefined) {
    n.push(`„${nom.ime}" се номерира по „${nom.podredbaPo}" — белегът липсва.`);
  }
}

export const SABITIYA: Readonly<Record<TipSabitie, Proverka>> = Object.freeze({
  [TIP.stopaninZapisan]: (p) =>
    eNeprazenTekst(p['imeyl']) && p['imeyl'].includes('@')
      ? []
      : ['Стопанинът се записва с имейл.'],

  [TIP.stoynostZapisana]: (p, model) => {
    const n: string[] = [];
    proveriNomenklatura(p, model, n);
    if (!eNeprazenTekst(p['tekst'])) n.push('Стойността не може да е празна.');
    proveriBelezi(p, model, n);
    return n;
  },

  [TIP.stoynostSpryana]: (p, model) => {
    const n: string[] = [];
    proveriNomenklatura(p, model, n);
    if (typeof p['spryana'] !== 'boolean') n.push('„spryana" трябва да е да/не.');
    proveriBelezi(p, model, n);
    return n;
  },

  [TIP.redZapisan]: (p, model) => {
    const n: string[] = [];
    proveriAdresNaRed(p, model, n);
    const t = eNeprazenTekst(p['tablitsa']) ? model.tablitsi.get(p['tablitsa']) : undefined;
    const kletki = p['kletki'];
    if (typeof kletki !== 'object' || kletki === null || Array.isArray(kletki)) {
      n.push('„kletki" трябва да е обект по ключ на колона.');
      return n;
    }
    if (t === undefined) return n;
    for (const [klyuch, kletka] of Object.entries(kletki)) {
      const kolona = t.koloni.find((k) => k.klyuch === klyuch);
      if (kolona === undefined) {
        n.push(`Таблица „${t.klyuch}" няма колона „${klyuch}".`);
        continue;
      }
      const slot = slotNaKolonata(kolona);
      if (slot === undefined) {
        n.push(`Колона „${kolona.ime}" е затворена — никой не я пише (правило 18).`);
        continue;
      }
      if (kletka === null) continue;
      if (!eKletka(kletka)) {
        n.push(`Клетката „${klyuch}" трябва да носи точно един слот с правилна стойност.`);
        continue;
      }
      if (slotNaKletka(kletka) !== slot) {
        n.push(`Колона „${kolona.ime}" носи „${slot}", а клетката е „${slotNaKletka(kletka)}".`);
        continue;
      }
      if (kolona.vid === 'vrazka' && 'tekst' in kletka && kletka.tekst !== '') {
        const pozvoleni = (kolona.vrazka ?? [])
          .map((v) => model.tablitsi.get(v))
          .filter((t) => t !== undefined);
        if (!pozvoleni.some((t) => kletka.tekst.startsWith(`${t.sashtnost}:`))) {
          n.push(
            `Връзката „${kolona.ime}" трябва да сочи ред от „${pozvoleni.map((t) => t.klyuch).join('" или „')}".`,
          );
        }
      }
    }
    return n;
  },

  [TIP.redIzklyuchen]: (p, model) => {
    const n: string[] = [];
    proveriAdresNaRed(p, model, n);
    if (typeof p['izklyuchen'] !== 'boolean') n.push('„izklyuchen" трябва да е да/не.');
    return n;
  },

  [TIP.knigaIznesena]: (p) => {
    const n: string[] = [];
    if (!eNeprazenTekst(p['otpechatak'])) n.push('Липсва отпечатъкът на Модела.');
    const k = p['kursor'];
    if (typeof k !== 'object' || k === null) n.push('Липсва курсорът.');
    else {
      const kur = k as Tovar;
      if (
        !eNeprazenTekst(kur['naematel']) ||
        !eTsyalo(kur['seq']) ||
        typeof kur['hash'] !== 'string'
      ) {
        n.push('Курсорът носи naematel · seq · hash.');
      }
    }
    const redove = p['redove'];
    if (typeof redove !== 'object' || redove === null) n.push('Липсват редовете по таблица.');
    else if (!Object.values(redove).every((v) => eTsyalo(v) && v >= 0)) {
      n.push('Редовете по таблица са цели числа ≥ 0.');
    }
    if (!eNeprazenTekst(p['iznesenoNa'])) n.push('Липсва кога е изнесена.');
    return n;
  },

  [TIP.knigaVnesena]: (p) => {
    const n: string[] = [];
    if (!eNeprazenTekst(p['otpechatakNaFayla'])) n.push('Липсва отпечатъкът на файла.');
    if (typeof p['iznesenoNa'] !== 'string') n.push('„iznesenoNa" е текст (може празен).');
    for (const k of [
      'kursorSeqNaIznosa',
      'predlozheni',
      'izbrani',
      'prieti',
      'otkazani',
      'nahodki',
    ]) {
      if (!eTsyalo(p[k]) || (p[k] as number) < 0) n.push(`„${k}" е цяло число ≥ 0.`);
    }
    if (!eNeprazenTekst(p['vnesenoNa'])) n.push('Липсва кога е внесена.');
    return n;
  },

  [TIP.storno]: (p) => {
    const n: string[] = [];
    if (!eTsyalo(p['pogasyavaSeq']) || p['pogasyavaSeq'] < 1) n.push('Сторното сочи seq ≥ 1.');
    if (p['pogasyavaVeriga'] !== undefined && !eNeprazenTekst(p['pogasyavaVeriga'])) {
      n.push('Веригата на сторното е текст, когато е дадена.');
    }
    if (!eNeprazenTekst(p['prichina'])) n.push('Сторното иска причина.');
    return n;
  },
});

function eTipSabitie(tip: string): tip is TipSabitie {
  return Object.hasOwn(SABITIYA, tip);
}

/** Проверката по тип · непознат тип е сам по себе си находка. */
export function proveriTovar(tip: string, p: unknown, model: Model): readonly string[] {
  if (!eTipSabitie(tip)) return [`Непознат тип събитие „${tip}".`];
  if (typeof p !== 'object' || p === null || Array.isArray(p))
    return ['Товарът трябва да е обект.'];
  return SABITIYA[tip](p as Tovar, model);
}
