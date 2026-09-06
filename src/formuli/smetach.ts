/**
 * СМЕТАЧЪТ · смята дървото на израза ТОЧНО, с дроби от цели числа (ADR-013).
 *
 * ЗАЩО ДРОБИ, А НЕ ЧИСЛА С ПЛАВАЩА ЗАПЕТАЯ. Неговата клетка S5 е
 * `=0.1+0.2-0.3`; Excel дава там 5,551115123125783×10⁻¹⁷, а не нула. Числото
 * изглежда като нула на екрана и НЕ Е нула в сметката — точно затова той я е
 * оставил в листа си като проверка.
 *
 * Тук всяко число е дроб от два `BigInt` (0.1 е 1/10, не 0,1000000000000000055),
 * четирите действия са точни, а закръгляването става ВЕДНЪЖ — накрая, когато
 * резултатът се иска в цели центове (правило 3).
 *
 * СТОЙНОСТИТЕ НА КЛЕТКИТЕ идват отвън, защото сметачът не знае нищо за листове:
 * подава му се четец `(адрес) → число или нищо`. Празната клетка е НИЩО, не
 * нула — и разликата личи при `COUNT` и при `AVERAGE`.
 */

import { GreshkaIzraz, razcheti, type Vazel } from './izraz.js';

/** Точна дроб · знаменателят е винаги положителен. */
export interface Drob {
  readonly n: bigint;
  readonly d: bigint;
}

export function drob(n: bigint, d = 1n): Drob {
  if (d === 0n) throw new GreshkaIzraz('Деление на нула.');
  const znak = d < 0n ? -1n : 1n;
  const nn = n * znak;
  const dd = d * znak;
  const g = nod(nn < 0n ? -nn : nn, dd);
  return g === 0n ? { n: 0n, d: 1n } : { n: nn / g, d: dd / g };
}

function nod(a: bigint, b: bigint): bigint {
  let x = a;
  let y = b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

const NULA: Drob = Object.freeze({ n: 0n, d: 1n });

function sabery(a: Drob, b: Drob): Drob {
  return drob(a.n * b.d + b.n * a.d, a.d * b.d);
}
export function izvadi(a: Drob, b: Drob): Drob {
  return drob(a.n * b.d - b.n * a.d, a.d * b.d);
}
export function umnozhi(a: Drob, b: Drob): Drob {
  return drob(a.n * b.n, a.d * b.d);
}
export function razdeli(a: Drob, b: Drob): Drob {
  if (b.n === 0n) throw new GreshkaIzraz('Деление на нула.');
  return drob(a.n * b.d, a.d * b.n);
}

/** Дробта като ЦЯЛО число · към най-близкото, точната среда нагоре. */
export function kamTsyalo(x: Drob): number {
  const znak = x.n < 0n ? -1n : 1n;
  const n = x.n * znak;
  const tsyalo = (n * 2n + x.d) / (x.d * 2n);
  return Number(tsyalo * znak);
}

/** Числото като дроб · за подаване на стойности отвън (цели центове). */
export function otTsyalo(x: number): Drob {
  if (!Number.isSafeInteger(x)) throw new GreshkaIzraz(`Стойността ${x} не е цяло число.`);
  return { n: BigInt(x), d: 1n };
}

/** Четецът на клетки · `undefined` значи ПРАЗНА клетка, не нула. */
export type ChetetsNaKletki = (adres: string) => Drob | undefined;

/**
 * Числото като ТОЧНА дроб · по ДЕСЕТИЧНИЯ му запис, не по двоичния.
 *
 * `84.5` става 845/10, а не 84,5000000000000000000. Числата в един лист идват
 * така, както Excel ги е записал; тук се четат както ги чете човек.
 */
export function otChislo(x: number): Drob {
  if (!Number.isFinite(x)) throw new GreshkaIzraz(`„${x}" не е число.`);
  if (Number.isInteger(x)) return { n: BigInt(x), d: 1n };
  const zapis = String(x);
  if (zapis.includes('e') || zapis.includes('E')) {
    // много малко или много голямо · минава през дробта на записа му
    const [mantisa = '0', stepen = '0'] = zapis.toLowerCase().split('e');
    const st = Number(stepen);
    const bezTochka = mantisa.replace('.', '');
    const drobni = (mantisa.split('.')[1] ?? '').length;
    const n = BigInt(bezTochka);
    return st >= 0
      ? drob(n * 10n ** BigInt(st), 10n ** BigInt(drobni))
      : drob(n, 10n ** BigInt(drobni - st));
  }
  const [tsyala = '0', drobna = ''] = zapis.split('.');
  const znak = tsyala.startsWith('-') ? -1n : 1n;
  const bezZnak = tsyala.replace('-', '');
  return drob(znak * BigInt(bezZnak + drobna), 10n ** BigInt(drobna.length));
}

/** Колоната като число · `A` е 1, `AA` е 27 (нужно за обхватите). */
export function kolonaOtBukvi(bukvi: string): number {
  let n = 0;
  for (const b of bukvi.toUpperCase()) n = n * 26 + (b.charCodeAt(0) - 64);
  return n;
}

export function bukviOtKolona(n: number): string {
  let ost = n;
  let rez = '';
  while (ost > 0) {
    const o = (ost - 1) % 26;
    rez = String.fromCharCode(65 + o) + rez;
    ost = Math.floor((ost - 1) / 26);
  }
  return rez;
}

/** Адресите в един обхват · по редове, отляво надясно. */
export function adresiteV(ot: string, doo: string): string[] {
  const a = /^([A-Z]{1,3})(\d{1,7})$/.exec(ot.toUpperCase());
  const b = /^([A-Z]{1,3})(\d{1,7})$/.exec(doo.toUpperCase());
  if (a === null || b === null) throw new GreshkaIzraz(`„${ot}:${doo}" не е обхват от клетки.`);
  const k1 = kolonaOtBukvi(a[1]!);
  const k2 = kolonaOtBukvi(b[1]!);
  const r1 = Number(a[2]);
  const r2 = Number(b[2]);
  const rez: string[] = [];
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r += 1) {
    for (let k = Math.min(k1, k2); k <= Math.max(k1, k2); k += 1) {
      rez.push(`${bukviOtKolona(k)}${r}`);
    }
  }
  return rez;
}

/** Стойностите на един довод · обхватът дава много, останалите — по едно. */
function stoynostite(v: Vazel, chetets: ChetetsNaKletki): Drob[] {
  if (v.vid === 'obhvat') {
    const rez: Drob[] = [];
    for (const adres of adresiteV(v.ot, v.do)) {
      const x = chetets(adres);
      // ПРАЗНАТА клетка не влиза · нула би повлякла AVERAGE и COUNT надолу
      if (x !== undefined) rez.push(x);
    }
    return rez;
  }
  if (v.vid === 'adres') {
    const x = chetets(v.adres);
    return x === undefined ? [] : [x];
  }
  return [smetni(v, chetets)];
}

/** Смята дървото · връща ТОЧНА дроб. */
export function smetni(v: Vazel, chetets: ChetetsNaKletki): Drob {
  switch (v.vid) {
    case 'chislo':
      return drob(v.tsyalo, v.znamenatel);
    case 'adres': {
      const x = chetets(v.adres);
      return x === undefined ? NULA : x;
    }
    case 'obhvat':
      throw new GreshkaIzraz(
        `Обхватът ${v.ot}:${v.do} стои сам; той влиза само в SUM · MIN · MAX · AVERAGE · COUNT.`,
      );
    case 'minus':
      return izvadi(NULA, smetni(v.pod, chetets));
    case 'protsent':
      return razdeli(smetni(v.pod, chetets), otTsyalo(100));
    case 'deystvie': {
      const a = smetni(v.lyavo, chetets);
      const b = smetni(v.dyasno, chetets);
      if (v.znak === '+') return sabery(a, b);
      if (v.znak === '-') return izvadi(a, b);
      if (v.znak === '*') return umnozhi(a, b);
      return razdeli(a, b);
    }
    case 'funktsiya': {
      const vsichki = v.dovodi.flatMap((d) => stoynostite(d, chetets));
      switch (v.ime) {
        case 'SUM':
          return vsichki.reduce(sabery, NULA);
        case 'COUNT':
          return otTsyalo(vsichki.length);
        case 'MIN':
          return vsichki.reduce((a, b) => (sravni(b, a) < 0 ? b : a), vsichki[0] ?? NULA);
        case 'MAX':
          return vsichki.reduce((a, b) => (sravni(b, a) > 0 ? b : a), vsichki[0] ?? NULA);
        case 'AVERAGE':
          if (vsichki.length === 0) return NULA;
          return razdeli(vsichki.reduce(sabery, NULA), otTsyalo(vsichki.length));
        case 'ABS': {
          const x = vsichki[0] ?? NULA;
          return x.n < 0n ? izvadi(NULA, x) : x;
        }
        case 'ROUND': {
          const x = vsichki[0] ?? NULA;
          const znaka = vsichki[1] === undefined ? 0 : kamTsyalo(vsichki[1]);
          const mnozhitel = 10n ** BigInt(Math.max(0, znaka));
          const vdignato = umnozhi(x, { n: mnozhitel, d: 1n });
          return drob(BigInt(kamTsyalo(vdignato)), mnozhitel);
        }
      }
    }
  }
}

function sravni(a: Drob, b: Drob): number {
  const l = a.n * b.d;
  const d = b.n * a.d;
  return l < d ? -1 : l > d ? 1 : 0;
}

/**
 * ФОРМУЛАТА като ТОЧНА ДРОБ · за сверката срещу кеша на Excel.
 *
 * Не закръгля: `=0.1+0.2-0.3` дава ТОЧНА нула, а кешът на Excel носи там
 * 5,55×10⁻¹⁷. Разликата се вижда само ако никой не я е закръглил преди това.
 */
export function smetniFormulaTochno(izraz: string, chetets: ChetetsNaKletki): Drob {
  return smetni(razcheti(izraz), chetets);
}

/**
 * ФОРМУЛАТА като ЦЯЛО ЧИСЛО · за сметките в центове.
 *
 * Стойностите се подават като дроби и се връщат в цели центове; закръгляването
 * е ЕДНО и е тук, накрая (правило 3).
 */
export function smetniFormula(izraz: string, chetets: ChetetsNaKletki): number {
  return kamTsyalo(smetniFormulaTochno(izraz, chetets));
}

/** Равни ли са две дроби · ТОЧНО, без праг. */
export function ravni(a: Drob, b: Drob): boolean {
  return a.n * b.d === b.n * a.d;
}
