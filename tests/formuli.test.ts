/**
 * ФОРМУЛИТЕ · свой парсер и ТОЧЕН сметач (ADR-013).
 *
 * Неговата Книга носи `=SUM(H5:H57)` в реда „ОБЩО евро" и `=0.1+0.2-0.3` в S5.
 * Втората е проверката, която показва защо Excel не е сметач: там тя дава
 * 5,551115123125783×10⁻¹⁷, а не нула.
 *
 * Тук се пази, че нашата сметка е ТОЧНА, че наборът е ИЗБРОИМ, и че непознатото
 * се ОТКАЗВА с думи, вместо да се гади.
 */

import { describe, expect, it } from 'vitest';
import { razpoznayKnigata } from '../src/kniga/chetene.js';
import { napishiKniga, type OpisNaList, prochetiKniga } from '../src/kniga/ooxml.js';
import { MODEL, PROZORTSI } from '../src/model/osnova.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { FUNKTSII, GreshkaIzraz, leksemi, razcheti } from '../src/formuli/izraz.js';
import {
  adresiteV,
  bukviOtKolona,
  type Drob,
  drob,
  kamTsyalo,
  kolonaOtBukvi,
  otChislo,
  otTsyalo,
  ravni,
  smetniFormula,
  smetniFormulaTochno,
} from '../src/formuli/smetach.js';

/** Празният лист · всяка клетка липсва, докато не я сложим. */
const prazen = (): ((adres: string) => Drob | undefined) => () => undefined;

/** Четец от карта · за четимите тестове. */
function otKarta(karta: Readonly<Record<string, number>>): (adres: string) => Drob | undefined {
  return (adres) => {
    const v = karta[adres];
    return v === undefined ? undefined : otChislo(v);
  };
}

describe('изразът се чете, а непознатото се ОТКАЗВА', () => {
  it('седемте функции, поименно · нова функция е нов ред, не нов код', () => {
    expect(FUNKTSII).toEqual(['SUM', 'MIN', 'MAX', 'AVERAGE', 'COUNT', 'ROUND', 'ABS']);
  });

  it('лексемите на неговата формула', () => {
    expect(leksemi('SUM(H5:H57)').map((l) => l.tekst)).toEqual(['SUM', '(', 'H5', ':', 'H57', ')']);
    expect(leksemi('0.1+0.2-0.3').map((l) => l.tekst)).toEqual(['0.1', '+', '0.2', '-', '0.3']);
  });

  it('знакът за равно отпред е по избор · и доларите не пречат', () => {
    expect(razcheti('=$H$5')).toEqual({ vid: 'adres', adres: 'H5' });
    expect(razcheti('H5')).toEqual({ vid: 'adres', adres: 'H5' });
  });

  it('непозната функция и непознат знак се КАЗВАТ, не се гадаят', () => {
    expect(() => razcheti('VLOOKUP(A1;B1:C9;2)')).toThrow(/не е сред познатите/);
    expect(() => razcheti('A1 & B1')).toThrow(GreshkaIzraz);
    expect(() => razcheti('SUM(A1')).toThrow(/свършва по средата|Очаква се/);
    expect(() => razcheti('')).toThrow(/Празен израз/);
    expect(() => razcheti('A1 A2')).toThrow(/остава непрочетено/);
  });
});

describe('сметката е ТОЧНА', () => {
  it('НЕГОВАТА клетка S5 · =0.1+0.2-0.3 е точна НУЛА, не 5,55×10⁻¹⁷', () => {
    const nashe = smetniFormulaTochno('=0.1+0.2-0.3', prazen());
    expect(ravni(nashe, { n: 0n, d: 1n })).toBe(true);
    // а плаващата запетая дава друго · затова сметачът не е такъв
    expect(0.1 + 0.2 - 0.3).not.toBe(0);
  });

  it('числото се чете по ДЕСЕТИЧНИЯ си запис · 84,5 е 845/10', () => {
    expect(otChislo(84.5)).toEqual({ n: 169n, d: 2n });
    expect(otChislo(-0.25)).toEqual({ n: -1n, d: 4n });
    expect(otChislo(101_400)).toEqual({ n: 101_400n, d: 1n });
    // 5,55×10⁻¹⁷ · онова, което Excel оставя в S5
    expect(kamTsyalo(otChislo(5.551115123125783e-17))).toBe(0);
  });

  it('четирите действия · с точното си старшинство и скоби', () => {
    expect(smetniFormula('=2+3*4', prazen())).toBe(14);
    expect(smetniFormula('=(2+3)*4', prazen())).toBe(20);
    expect(smetniFormula('=-5+2', prazen())).toBe(-3);
    expect(smetniFormula('=10/4', prazen())).toBe(3); // 2,5 · средата отива нагоре
    expect(smetniFormula('=-10/4', prazen())).toBe(-3);
    expect(() => smetniFormula('=1/0', prazen())).toThrow(/Деление на нула/);
  });

  it('процентът отзад дели на сто', () => {
    expect(smetniFormula('=200*5%', prazen())).toBe(10);
    expect(ravni(smetniFormulaTochno('=50%', prazen()), drob(1n, 2n))).toBe(true);
  });
});

describe('обхватите и функциите', () => {
  const listat = otKarta({ H5: 84.5, H6: 62.1, H7: 110, H9: 30.2 });

  it('адресите в обхват · по редове, отляво надясно', () => {
    expect(adresiteV('H5', 'H7')).toEqual(['H5', 'H6', 'H7']);
    expect(adresiteV('A1', 'B2')).toEqual(['A1', 'B1', 'A2', 'B2']);
    expect([kolonaOtBukvi('A'), kolonaOtBukvi('AA'), bukviOtKolona(27)]).toEqual([1, 27, 'AA']);
  });

  it('НЕГОВАТА формула · SUM над колона с ПРАЗНИ клетки в нея', () => {
    // H8 липсва · празната клетка не е нула и не влиза в броя
    expect(smetniFormula('=SUM(H5:H9)', listat)).toBe(287); // 84,5 + 62,1 + 110 + 30,2 = 286,8
    expect(smetniFormula('=COUNT(H5:H9)', listat)).toBe(4);
    expect(smetniFormula('=MIN(H5:H9)', listat)).toBe(30);
    expect(smetniFormula('=MAX(H5:H9)', listat)).toBe(110);
    // средното е по БРОЯ на пълните, не по големината на обхвата
    expect(smetniFormula('=AVERAGE(H5:H9)', listat)).toBe(72); // 286,8 / 4 = 71,7
  });

  it('празният обхват не срива сметката · дава нула и брой нула', () => {
    expect(smetniFormula('=SUM(Z1:Z9)', listat)).toBe(0);
    expect(smetniFormula('=COUNT(Z1:Z9)', listat)).toBe(0);
    expect(smetniFormula('=AVERAGE(Z1:Z9)', listat)).toBe(0);
  });

  it('обхват САМ, без функция, се отказва с думи', () => {
    expect(() => smetniFormula('=H5:H9', listat)).toThrow(/влиза само в SUM/);
  });

  it('ROUND и ABS · и вложени функции', () => {
    expect(smetniFormula('=ROUND(2.5)', prazen())).toBe(3);
    // 1,2345 до два знака е 1,23 · третият знак е 4 и не вдига
    expect(ravni(smetniFormulaTochno('=ROUND(1.2345;2)', prazen()), drob(123n, 100n))).toBe(true);
    expect(smetniFormula('=ABS(0-7)', prazen())).toBe(7);
    expect(smetniFormula('=SUM(H5:H7)+MAX(H5:H9)', listat)).toBe(367); // 256,6 + 110
  });

  it('стойността в цели центове минава ЦЯЛА · закръглянето е ЕДНО, накрая', () => {
    const centove = otKarta({ A1: 10_140_000, A2: 7_452_000 });
    expect(smetniFormula('=SUM(A1:A2)', centove)).toBe(17_592_000);
    expect(kamTsyalo(otTsyalo(5))).toBe(5);
  });
});

describe('сверката срещу КЕША на Excel', () => {
  const KOGATO = '2026-09-06T12:00:00.000Z';
  const PRAZNO = fold([], MODEL, KOGATO);
  const LIST = PROZORTSI.find((p) => p.klyuch === 'prodazhbi')!.list;

  /** Един лист с две числа и една формула · кешът се задава нарочно. */
  const sFormula = (formula: string, kesh: number): OpisNaList => ({
    ime: LIST,
    redove: [
      [10, null],
      [20, null],
      [{ formula, rezultat: kesh }, null],
    ],
    slivaniya: [],
    validatsii: [],
    otklyucheni: [],
    otklyucheniRedove: [],
  });

  async function nahodkite(formula: string, kesh: number) {
    const kniga = await prochetiKniga(await napishiKniga([sFormula(formula, kesh)]));
    const p = razpoznayKnigata(kniga, PRAZNO, KOGATO);
    // липсващите ленти на този лист са ДРУГА находка · тук се гледат формулите
    return p.nahodki.filter((n) => n.list === LIST && n.adres !== 'лист');
  }

  it('вярната формула не казва нищо · и сверката се записва', async () => {
    expect(await nahodkite('SUM(A1:A2)', 30)).toEqual([]);
    const kniga = await prochetiKniga(await napishiKniga([sFormula('SUM(A1:A2)', 30)]));
    const p = razpoznayKnigata(kniga, PRAZNO, KOGATO);
    const sv = p.sverki.find((x) => x.kakvo.includes('формули срещу кеша'));
    expect([sv?.nared, sv?.vhod]).toEqual([true, 1]);
  });

  it('СГРЕШЕНИЯТ кеш е НАХОДКА · числото и сметката му се разминават', async () => {
    const n = await nahodkite('SUM(A1:A2)', 31);
    expect(n).toHaveLength(1);
    expect([n[0]?.stepen, n[0]?.adres]).toEqual(['greshka', 'A3']);
    expect(n[0]?.kakvo).toContain('сметната на 31 в листа, а дава 30');
  });

  it('остатъкът от ПЛАВАЩА ЗАПЕТАЯ е бележка, не грешка · неговата S5', async () => {
    // точно каквото Excel оставя за =0.1+0.2-0.3
    const n = await nahodkite('0.1+0.2-0.3', 5.551115123125783e-17);
    expect(n).toHaveLength(1);
    expect(n[0]?.stepen).toBe('beleshka');
    expect(n[0]?.kakvo).toContain('остатък от плаваща запетая, не разлика в парите');
  });

  it('непозната функция е БЕЛЕЖКА · границата е наша, не негова грешка', async () => {
    const n = await nahodkite('VLOOKUP(A1,A1:A2,1)', 10);
    expect(n).toHaveLength(1);
    expect(n[0]?.stepen).toBe('beleshka');
    expect(n[0]?.kakvo).toContain('не се смята тук');
  });
});

describe('таваните на входа · формулата не замразява раздела', () => {
  /**
   * ИЗМЕРЕНО, не предположено: `A1:XFD1048576` е онова, което Excel сам вписва
   * при избор на целия лист — 17 179 869 184 адреса, разгъвани в масив на
   * главната нишка. Разделът замръзва завинаги, без съобщение и без изход.
   *
   * Не иска нападател. Иска две кликвания в Excel.
   */
  it('целият лист като обхват се ОТКАЗВА с думи', () => {
    /**
     * БЕЗ мярка на времето. Първата версия сложи `performance.now()` с праг — и обход
     * З я обяви веднага: праг върху ЕДНО измерване мери планировчика, не кода.
     *
     * А времето не се нуждае от твърдение: броят се смята ПРЕДИ цикъла, тъй че
     * отказът е мигновен. Премести ли се проверката СЛЕД разгъването, тестът
     * няма да падне бавно — той ще ЗАВИСНЕ, и `vitest` го брои за провал.
     * Структурата пази онова, за което иначе трябваше секундомер.
     */
    expect(() => adresiteV('A1', 'XFD1048576')).toThrow(/над тавана/);
  });

  it('и таванът е ТОЧЕН · един под него минава, един над него пада', () => {
    expect(adresiteV('A1', 'A200000')).toHaveLength(200_000);
    expect(() => adresiteV('A1', 'A200001')).toThrow(/над тавана/);
  });

  it('но истинските му обхвати минават · таванът не пречи на Книгата', () => {
    // най-големият лист в Книгата му е под хиляда реда
    expect(adresiteV('A1', 'T1000')).toHaveLength(20_000);
  });

  it('ROUND с огромен втори довод се ОТКАЗВА, вместо да смята 7 секунди', () => {
    // пак без секундомер · `10n ** 90000000n` не пада бавно, а виси
    expect(() => smetniFormula('ROUND(1;90000000)', () => undefined)).toThrow(/над петнайсетте/);
    // и границата минава · петнайсет знака са онова, което числото носи
    expect(smetniFormula('ROUND(1;15)', () => undefined)).toBe(1);
  });
});
