/**
 * ИЗРАЗЪТ · лексер и парсер за формулите на неговата Книга (ADR-013).
 *
 * Негово (чрез Заданието): в листа му стоят `=SUM(H5:H57)` и `=0.1+0.2-0.3`.
 * Първата е сбор на колона, втората е негова проверка — и точно тя показва защо
 * Excel не е сметач: там тя дава 5,55×10⁻¹⁷ вместо нула.
 *
 * ЗАЩО СВОЙ ПАРСЕР, а не чужд: правило 10. Чужда библиотека за формули влиза
 * само ако решава проблем, който не сме решили — а тук проблемът е ОБРАТНИЯТ:
 * искаме МАЛЪК, изброим набор и точна аритметика, не пълния език на Excel.
 * `eval` е взрив и на обхвата, и на сигурността.
 *
 * НАБОРЪТ, ПОИМЕННО: числа · адреси (`H5`) · обхвати (`H5:H57`) · седемте
 * функции (SUM · MIN · MAX · AVERAGE · COUNT · ROUND · ABS) · четирите действия
 * със скоби и унарен минус · процент отзад (`5%`). Всичко друго се ОТКАЗВА с
 * думи, вместо да се гадае (правило 12).
 */

export class GreshkaIzraz extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaIzraz';
  }
}

/** Седемте функции, поименно · нова функция е нов ред тук, не нов код. */
export const FUNKTSII = ['SUM', 'MIN', 'MAX', 'AVERAGE', 'COUNT', 'ROUND', 'ABS'] as const;
export type Funktsiya = (typeof FUNKTSII)[number];

export type Vazel =
  | { readonly vid: 'chislo'; readonly tsyalo: bigint; readonly znamenatel: bigint }
  | { readonly vid: 'adres'; readonly adres: string }
  | { readonly vid: 'obhvat'; readonly ot: string; readonly do: string }
  | {
      readonly vid: 'deystvie';
      readonly znak: '+' | '-' | '*' | '/';
      readonly lyavo: Vazel;
      readonly dyasno: Vazel;
    }
  | { readonly vid: 'minus'; readonly pod: Vazel }
  | { readonly vid: 'protsent'; readonly pod: Vazel }
  | { readonly vid: 'funktsiya'; readonly ime: Funktsiya; readonly dovodi: readonly Vazel[] };

type Leksema =
  | { readonly vid: 'chislo'; readonly tekst: string }
  | { readonly vid: 'ime'; readonly tekst: string }
  | { readonly vid: 'znak'; readonly tekst: string };

const ZNATSI = new Set(['+', '-', '*', '/', '(', ')', ',', ';', ':', '%']);

/** Лексемите на един израз · без знака за равно отпред. */
export function leksemi(izraz: string): Leksema[] {
  const rez: Leksema[] = [];
  let i = 0;
  const s = izraz.trim();
  while (i < s.length) {
    const z = s[i]!;
    if (z === ' ' || z === '\t' || z === '\n' || z === '\r') {
      i += 1;
      continue;
    }
    if (z >= '0' && z <= '9') {
      let j = i;
      while (j < s.length && ((s[j]! >= '0' && s[j]! <= '9') || s[j] === '.')) j += 1;
      rez.push({ vid: 'chislo', tekst: s.slice(i, j) });
      i = j;
      continue;
    }
    if ((z >= 'A' && z <= 'Z') || (z >= 'a' && z <= 'z') || z === '$') {
      let j = i;
      while (
        j < s.length &&
        ((s[j]! >= 'A' && s[j]! <= 'Z') ||
          (s[j]! >= 'a' && s[j]! <= 'z') ||
          (s[j]! >= '0' && s[j]! <= '9') ||
          s[j] === '$')
      )
        j += 1;
      rez.push({ vid: 'ime', tekst: s.slice(i, j) });
      i = j;
      continue;
    }
    if (ZNATSI.has(z)) {
      rez.push({ vid: 'znak', tekst: z });
      i += 1;
      continue;
    }
    throw new GreshkaIzraz(`Непознат знак „${z}" в „${izraz}".`);
  }
  return rez;
}

/** Адрес на клетка · `H5` или `$H$5`; знаците за долар се махат. */
const ADRES = /^\$?[A-Z]{1,3}\$?\d{1,7}$/;

function bezDolari(t: string): string {
  return t.replaceAll('$', '').toUpperCase();
}

/** Числото като ТОЧНА дроб · `0.1` е 1/10, не 0,1000000000000000055. */
function drob(tekst: string): { tsyalo: bigint; znamenatel: bigint } {
  const tochka = tekst.indexOf('.');
  if (tochka < 0) return { tsyalo: BigInt(tekst), znamenatel: 1n };
  const tsyala = tekst.slice(0, tochka) || '0';
  const drobna = tekst.slice(tochka + 1);
  if (drobna.includes('.')) throw new GreshkaIzraz(`Числото „${tekst}" има две точки.`);
  return {
    tsyalo: BigInt(tsyala + drobna),
    znamenatel: 10n ** BigInt(drobna.length),
  };
}

class Chetets {
  private i = 0;
  constructor(
    private readonly l: readonly Leksema[],
    private readonly izraz: string,
  ) {}

  private vizh(): Leksema | undefined {
    return this.l[this.i];
  }

  private vzemi(): Leksema {
    const t = this.l[this.i];
    if (t === undefined) throw new GreshkaIzraz(`Изразът „${this.izraz}" свършва по средата.`);
    this.i += 1;
    return t;
  }

  private ochakvay(znak: string): void {
    const t = this.vzemi();
    if (t.vid !== 'znak' || t.tekst !== znak) {
      throw new GreshkaIzraz(`Очаква се „${znak}" в „${this.izraz}", а стои „${t.tekst}".`);
    }
  }

  /** Целият израз · и нищо след него. */
  vsichko(): Vazel {
    const v = this.sabirane();
    if (this.i < this.l.length) {
      throw new GreshkaIzraz(`В „${this.izraz}" остава непрочетено: „${this.l[this.i]?.tekst}".`);
    }
    return v;
  }

  private sabirane(): Vazel {
    let lyavo = this.umnozhenie();
    for (;;) {
      const t = this.vizh();
      if (t?.vid !== 'znak' || (t.tekst !== '+' && t.tekst !== '-')) return lyavo;
      this.i += 1;
      lyavo = { vid: 'deystvie', znak: t.tekst, lyavo, dyasno: this.umnozhenie() };
    }
  }

  private umnozhenie(): Vazel {
    let lyavo = this.edinichno();
    for (;;) {
      const t = this.vizh();
      if (t?.vid !== 'znak' || (t.tekst !== '*' && t.tekst !== '/')) return lyavo;
      this.i += 1;
      lyavo = { vid: 'deystvie', znak: t.tekst, lyavo, dyasno: this.edinichno() };
    }
  }

  private edinichno(): Vazel {
    const t = this.vizh();
    if (t?.vid === 'znak' && t.tekst === '-') {
      this.i += 1;
      return { vid: 'minus', pod: this.edinichno() };
    }
    if (t?.vid === 'znak' && t.tekst === '+') {
      this.i += 1;
      return this.edinichno();
    }
    return this.sledProtsent(this.osnovno());
  }

  private sledProtsent(v: Vazel): Vazel {
    const t = this.vizh();
    if (t?.vid === 'znak' && t.tekst === '%') {
      this.i += 1;
      return this.sledProtsent({ vid: 'protsent', pod: v });
    }
    return v;
  }

  private osnovno(): Vazel {
    const t = this.vzemi();
    if (t.vid === 'chislo') {
      const d = drob(t.tekst);
      return { vid: 'chislo', tsyalo: d.tsyalo, znamenatel: d.znamenatel };
    }
    if (t.vid === 'znak' && t.tekst === '(') {
      const v = this.sabirane();
      this.ochakvay(')');
      return v;
    }
    if (t.vid === 'ime') {
      const goliamo = t.tekst.toUpperCase();
      const sled = this.vizh();
      // функция · името е следвано от скоба
      if (sled?.vid === 'znak' && sled.tekst === '(') {
        if (!(FUNKTSII as readonly string[]).includes(goliamo)) {
          throw new GreshkaIzraz(
            `Функцията „${t.tekst}" не е сред познатите: ${FUNKTSII.join(' · ')}.`,
          );
        }
        this.i += 1;
        const dovodi: Vazel[] = [];
        if (!(this.vizh()?.vid === 'znak' && this.vizh()?.tekst === ')')) {
          for (;;) {
            dovodi.push(this.sabirane());
            const r = this.vizh();
            if (r?.vid === 'znak' && (r.tekst === ',' || r.tekst === ';')) {
              this.i += 1;
              continue;
            }
            break;
          }
        }
        this.ochakvay(')');
        return { vid: 'funktsiya', ime: goliamo as Funktsiya, dovodi };
      }
      // обхват · адрес двоеточие адрес
      if (sled?.vid === 'znak' && sled.tekst === ':') {
        const ot = bezDolari(t.tekst);
        this.i += 1;
        const vtori = this.vzemi();
        if (vtori.vid !== 'ime') throw new GreshkaIzraz(`Обхватът в „${this.izraz}" е непълен.`);
        const doo = bezDolari(vtori.tekst);
        if (!ADRES.test(ot) || !ADRES.test(doo)) {
          throw new GreshkaIzraz(`„${ot}:${doo}" не е обхват от клетки.`);
        }
        return { vid: 'obhvat', ot, do: doo };
      }
      const adres = bezDolari(t.tekst);
      if (ADRES.test(adres)) return { vid: 'adres', adres };
      throw new GreshkaIzraz(`„${t.tekst}" не е нито число, нито адрес, нито позната функция.`);
    }
    throw new GreshkaIzraz(`Неочаквано „${t.tekst}" в „${this.izraz}".`);
  }
}

/** Изразът като дърво · знакът за равно отпред е по избор. */
export function razcheti(izraz: string): Vazel {
  const bezRavno = izraz.trim().startsWith('=') ? izraz.trim().slice(1) : izraz;
  if (bezRavno.trim() === '') throw new GreshkaIzraz('Празен израз.');
  return new Chetets(leksemi(bezRavno), izraz).vsichko();
}
