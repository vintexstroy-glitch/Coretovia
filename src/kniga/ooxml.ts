/**
 * OOXML · ЕДИНСТВЕНОТО място, където живее чуждата библиотека (ADR-002).
 *
 * ExcelJS 4.4.0 · MIT · решава проблем, който не сме решили: стилове, слети
 * клетки, валидации от списък, формули с кеш, замразени редове, автофилтър —
 * и на четене, И на писане. Собственият четец на MasterBook четеше стойности
 * и формули, но не и това; собственият писач пишеше числа и текст без нито
 * един стил. Книгата на Стопанина трябва да се отваря в Excel КАТО НЕГОВАТА.
 *
 * ═══ ГРАНИЦАТА ═══
 *
 * Оттук навън минава САМО нашият договор: `OpisNaList` навътре,
 * `ProchetenList` навън. Никой друг файл не внася `exceljs` — dependency-cruiser
 * го брои (`chuzhdo-samo-poimenno`). Парите не минават оттук като сметка: една
 * клетка с пари е ЧИСЛО за Excel (`st / 100`), и точно това число се проверява
 * при кръга (`Math.round(v * 100) === st`), а сметките четат само цели центове.
 *
 * Ако библиотеката падне (замразена е от 2023), се сменя тук и само тук —
 * тестовете на Книгата минават през този файл, не през нея.
 */

import ExcelJS from 'exceljs';

/** Една клетка за писане · текст, число, или формула с кеширан резултат. */
export type KletkaZaPisane =
  | string
  | number
  | null
  | { readonly formula: string; readonly rezultat: number }
  | { readonly tekst: string; readonly glava: true };

export interface ValidatsiyaOtSpisak {
  /** адрес или обхват · `C6:C56` */
  readonly obhvat: string;
  readonly spisak: readonly string[];
}

export interface OpisNaList {
  readonly ime: string;
  readonly redove: readonly (readonly KletkaZaPisane[])[];
  /** слети клетки · `A4:H4` */
  readonly slivaniya?: readonly string[];
  readonly validatsii?: readonly ValidatsiyaOtSpisak[];
  /** ред, под който прозорецът се замразява · 1-базиран */
  readonly zamraziPod?: number;
  /** обхват на автофилтъра · `B5:H10` */
  readonly avtofiltar?: string;
  /** колони с формат за пари `#,##0.00` · 1-базирани номера */
  readonly parichniKoloni?: readonly number[];
  /** колони, които Excel НЕ бива да превръща в число или дата · формат `@` */
  readonly tekstoviKoloni?: readonly number[];
}

export type ProchetenaStoynost = string | number | null;

export interface ProchetenList {
  readonly ime: string;
  readonly broyRedove: number;
  readonly broyKoloni: number;
  readonly slivaniya: readonly string[];
  /** стойностите · формулата се чете през КЕША ѝ, както Excel я е оставил */
  readonly kletki: readonly (readonly ProchetenaStoynost[])[];
  /** формулите по адрес · `H77 → SUM(H62:H76)` */
  readonly formuli: ReadonlyMap<string, string>;
}

export interface ProchetenaKniga {
  readonly listove: readonly ProchetenList[];
}

/** Пише работна книга · връща байтовете на .xlsx. */
export async function napishiKniga(listove: readonly OpisNaList[]): Promise<Uint8Array> {
  const kniga = new ExcelJS.Workbook();
  kniga.creator = 'Coretovia';
  for (const opis of listove) {
    const list = kniga.addWorksheet(opis.ime);
    for (const [i, red] of opis.redove.entries()) {
      const r = list.getRow(i + 1);
      for (const [j, k] of red.entries()) {
        if (k === null) continue;
        const kl = r.getCell(j + 1);
        if (typeof k === 'string' || typeof k === 'number') kl.value = k;
        else if ('formula' in k) kl.value = { formula: k.formula, result: k.rezultat };
        else {
          kl.value = k.tekst;
          kl.font = { bold: true };
        }
      }
      r.commit();
    }
    for (const s of opis.slivaniya ?? []) list.mergeCells(s);
    for (const v of opis.validatsii ?? []) {
      const [ot, doo = ot] = v.obhvat.split(':');
      const { red: r1, kolona: k1 } = razlozhiAdres(ot!);
      const { red: r2, kolona: k2 } = razlozhiAdres(doo!);
      for (let r = r1; r <= r2; r += 1) {
        for (let k = k1; k <= k2; k += 1) {
          list.getCell(r, k).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`"${v.spisak.join(',')}"`],
          };
        }
      }
    }
    if (opis.zamraziPod !== undefined) list.views = [{ state: 'frozen', ySplit: opis.zamraziPod }];
    if (opis.avtofiltar !== undefined) list.autoFilter = opis.avtofiltar;
    for (const k of opis.parichniKoloni ?? []) list.getColumn(k).numFmt = '#,##0.00';
    for (const k of opis.tekstoviKoloni ?? []) list.getColumn(k).numFmt = '@';
  }
  const bufer = await kniga.xlsx.writeBuffer();
  return new Uint8Array(bufer as ArrayBuffer);
}

/** Чете работна книга · всеки лист с всичките си клетки, слети обхвати и формули. */
export async function prochetiKniga(danni: Uint8Array | ArrayBuffer): Promise<ProchetenaKniga> {
  const kniga = new ExcelJS.Workbook();
  const baytove = danni instanceof Uint8Array ? danni : new Uint8Array(danni);
  // ExcelJS иска Buffer-подобно · Uint8Array минава и в браузъра, и в Node.
  await kniga.xlsx.load(baytove as unknown as ArrayBuffer);
  const listove: ProchetenList[] = [];
  kniga.eachSheet((list) => {
    const kletki: ProchetenaStoynost[][] = [];
    const formuli = new Map<string, string>();
    let broyKoloni = 0;
    list.eachRow({ includeEmpty: true }, (red, nomer) => {
      const stoynosti: ProchetenaStoynost[] = [];
      red.eachCell({ includeEmpty: true }, (kl, k) => {
        stoynosti[k - 1] = stoynostNaKletka(kl.value);
        const f = formulaNaKletka(kl.value);
        if (f !== undefined) formuli.set(kl.address, f);
      });
      kletki[nomer - 1] = stoynosti;
      if (stoynosti.length > broyKoloni) broyKoloni = stoynosti.length;
    });
    // Празните редове между два пълни идват като дупки · запълват се с празни.
    for (let i = 0; i < kletki.length; i += 1) if (kletki[i] === undefined) kletki[i] = [];
    // Слетите обхвати ExcelJS ги дава в модела на листа като `A4:H4`.
    const slivaniya = [...((list.model as { merges?: readonly string[] }).merges ?? [])];
    listove.push({
      ime: list.name,
      broyRedove: kletki.length,
      broyKoloni,
      slivaniya,
      kletki,
      formuli,
    });
  });
  return { listove };
}

function stoynostNaKletka(v: ExcelJS.CellValue): ProchetenaStoynost {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' || typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((ch) => ch.text).join('');
    if ('formula' in v || 'sharedFormula' in v) {
      const r = (v as { result?: unknown }).result;
      return typeof r === 'number' || typeof r === 'string' ? r : null;
    }
    if ('text' in v) return typeof v.text === 'string' ? v.text : String(v.text);
    if ('error' in v) return String(v.error);
  }
  return String(v);
}

function formulaNaKletka(v: ExcelJS.CellValue): string | undefined {
  if (v !== null && typeof v === 'object' && 'formula' in v && typeof v.formula === 'string')
    return v.formula;
  return undefined;
}

/** `C12` → ред 12, колона 3. */
function razlozhiAdres(adres: string): { red: number; kolona: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(adres.trim().toUpperCase());
  if (!m) throw new Error(`Не е адрес на клетка: „${adres}"`);
  let kolona = 0;
  for (const ch of m[1]!) kolona = kolona * 26 + (ch.charCodeAt(0) - 64);
  return { red: Number(m[2]), kolona };
}
