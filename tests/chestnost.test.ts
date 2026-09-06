/**
 * ЧЕСТНОСТТА · и КОЙ пази самата нея (резен 43 · група Б · `docs/11`).
 *
 * `npm run chestnost` брои дефектите на тестовете и прохода. Но нарочното
 * счупване показа ДУПКА в самата машина: **разхлабен праг не пада никъде**.
 * Вдигнеш ли прага на група Б от 0 на 9, всичко остава зелено — а групата вече
 * не се пази. Същото и с червения изход: махнеш ли го, командата става надпис.
 *
 * Затова праговете имат свой пазач. Обход, който пази другите, но не и себе си,
 * разчита на дисциплина — а точно това ADR-056 забранява.
 */

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error · обходът е .mjs без декларации · внася се само чистата функция
import { rabotni, yadroD, yadroG, yadroZ } from '../stroezh/chestnost.mjs';

const KOREN = fileURLToPath(new URL('..', import.meta.url));
const IZVOR = readFileSync(join(KOREN, 'stroezh', 'chestnost.mjs'), 'utf8');

/** Праговете, извадени от ЖИВИЯ извор · име → число. */
function pragovete(): Map<string, number> {
  const po = new Map<string, number>();
  for (const m of IZVOR.matchAll(/ime:\s*'([^']+)'\s*,\s*prag:\s*(\d+)/g)) {
    po.set(m[1]!, Number(m[2]));
  }
  return po;
}

describe('честността на проверките', () => {
  it('обходите са ЕДИНАЙСЕТ · нов се добавя ТУК, за да не мине незабелязан', () => {
    expect([...pragovete().keys()]).toEqual([
      'Б · гол селектор върху двусмислен белег',
      'Е · четене без изчакване след действие',
      'Ж · пише след прерисуване и подава, без проверка',
      'А · тестът се мести заедно с кода',
      'В · константа без нито един пин с ръка',
      'Г · цикъл с очакване върху списък, който може да е празен',
      'Д · подпроцес в тест без обявено време',
      'З · праг за скорост върху едно измерване',
      'И · проверка, която пише в дървото на проекта',
      'Й · обход по файлове без твърдение колко е видял',
      'К · в прохода: праг вместо число',
    ]);
  });

  it('ИЗЧИСТЕНИТЕ групи са на НУЛА · и праговете им не се вдигат', () => {
    // Б е платена в резен 43, Е — в резен 44. Нула значи нула: вдигнеш ли прага,
    // тестът пада ПРЕДИ някой да е върнал гол селектор или четене без чакане.
    expect(pragovete().get('Б · гол селектор върху двусмислен белег')).toBe(0);
    expect(pragovete().get('Е · четене без изчакване след действие')).toBe(0);
    // Ж се ражда на нула · §95 вече е поправен и прагът пази поправката.
    expect(pragovete().get('Ж · пише след прерисуване и подава, без проверка')).toBe(0);
    // А е платена в резен 45 · четирите обявени плюс двете отвъд групата.
    expect(pragovete().get('А · тестът се мести заедно с кода')).toBe(0);
    // В е платена в резен 46 · 26 имена получиха пин с ръка.
    expect(pragovete().get('В · константа без нито един пин с ръка')).toBe(0);
  });

  it('и ВСИЧКИТЕ ЕДИНАЙСЕТ са на нула · няма вече храпов праг', () => {
    // Дотук поне един обход носеше днешното си число за праг. От резен 46 всички
    // са платени, тъй че нула значи нула навсякъде. Върне ли се храпов праг,
    // редът тук се сменя ЗАЕДНО с него — и се вижда в диф, вместо да се промъкне.
    expect([...pragovete().values()]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  // подпроцес · времето е ОБЯВЕНО, за да не пада тестът под товар (обход Д)
  it('и командата ПАДА с червено, когато обход мине прага си', () => {
    // ТЪРСЕНЕ НА ТЕКСТ НЕ СТИГА. Първата версия питаше само дали изворът
    // СЪДЪРЖА `process.exitCode = 1` — а закоментираният ред пак го съдържа.
    // Нарочното счупване в резен 44 мина точно така: махнах падането, тестът
    // остана зелен. Оттук нататък се пуска ИСТИНСКО копие с нарочно свален
    // праг и се гледа кодът на изхода, не буквите.
    // КОПИЕТО ЖИВЕЕ ИЗВЪН ДЪРВОТО · и пак мери дървото.
    //
    // Дотук стоеше в `stroezh/`, защото обходът търсеше корена спрямо себе си.
    // Но `imena.test.ts`, `prenosimost.test.ts` и `poveritelnost.test.ts`
    // обхождат същите папки УСПОРЕДНО: временният файл се появяваше и изчезваше
    // под тях и някой от трите падаше без причина. Оттук коренът се подава
    // (`CHESTNOST_KOREN`), а копието е във временната папка на машината.
    const koren = KOREN;
    const proba = join(mkdtempSync(join(tmpdir(), 'chestnost-')), 'proba.mjs');
    writeFileSync(proba, IZVOR.replace(/prag: \d+, kart: obhodA/, 'prag: -1, kart: obhodA'));
    try {
      let kod = 0;
      let izhod = '';
      try {
        izhod = execFileSync('node', [proba], {
          encoding: 'utf8',
          env: { ...process.env, CHESTNOST_KOREN: koren },
        });
      } catch (g) {
        kod = (g as { status: number }).status;
        izhod = String((g as { stdout: string }).stdout);
      }
      expect(kod).toBe(1);
      expect(izhod).toContain('НАХОДКИ');
      // и мери ИСТИНСКОТО дърво, не празна папка · инак падането не значи нищо
      expect(izhod).toContain('двусмислени белега');
    } finally {
      rmSync(proba, { force: true });
    }
  }, 60_000);

  /**
   * НАРОЧНОТО СЧУПВАНЕ · трите нови обхода, доказани БЕЗ файл в дървото.
   *
   * Обход, който още не е ловил нищо, е надпис: не се знае дали мълчи, защото е
   * чисто, или защото не работи. Затова тук му се подава счупен вход и се иска
   * да го намери поименно.
   *
   * ВХОДЪТ Е РЕДОВЕ, НЕ ФАЙЛ. Първата версия пишеше `.ts` в `tests/` — и това
   * беше СЪСТЕЗАНИЕ: `imena.test.ts`, `prenosimost.test.ts` и
   * `poveritelnost.test.ts` обхождат същата папка успоредно, тъй че временният
   * файл се появява и изчезва под тях. Дефектът, който този резен лови, влезе
   * през вратата на собственото си доказателство.
   */
  it('трите нови обхода ЛОВЯТ · доказано с нарочно счупен ВХОД', () => {
    const schupeno = [
      'describe(„нарочно счупено", () => {',
      '  it(„Г · цикъл без твърдение за броя", () => {',
      '    const spisak: number[] = [];',
      '    for (const x of spisak) expect(x).toBe(1);',
      '  });',
      '',
      '  it(„Д · подпроцес без обявено време", () => {',
      '    const izhod = execFileSync(„node", [„-e", „1"]);',
      '    expect(izhod).toBeDefined();',
      '  });',
      '',
      '  it(„З · праг върху едно измерване", () => {',
      '    const t0 = performance.now();',
      '    const ms = performance.now() - t0;',
      '    expect(ms).toBeLessThan(1000);',
      '  });',
      '});',
    ].map((red) => red.replaceAll('„', "'").replaceAll('"', "'"));

    expect(yadroG(schupeno, 'проба.ts')).toHaveLength(1);
    expect(yadroG(schupeno, 'проба.ts')[0]).toContain('цикъл върху „spisak"');
    expect(yadroD(schupeno, 'проба.ts')).toHaveLength(1);
    expect(yadroZ(schupeno, 'проба.ts')).toHaveLength(1);
  });

  it('и ПУСКАТ поправеното · същите три форми, вече излекувани', () => {
    const zdravo = [
      'it(„Г · с твърдение за броя", () => {',
      '  expect(spisak).toHaveLength(2);',
      '  for (const x of spisak) expect(x).toBe(1);',
      '});',
      '',
      'it(„Д · с обявено време", () => {',
      '  const izhod = execFileSync(„node", [„-e", „1"]);',
      '  expect(izhod).toBeDefined();',
      '}, 60_000);',
      '',
      'it(„З · най-доброто от три", () => {',
      '  let ms = Infinity;',
      '  for (let i = 0; i < 3; i += 1) {',
      '    const t0 = performance.now();',
      '    ms = Math.min(ms, performance.now() - t0);',
      '  }',
      '  expect(ms).toBeLessThan(1000);',
      '});',
    ].map((red) => red.replaceAll('„', "'").replaceAll('"', "'"));

    expect(yadroG(zdravo, 'проба.ts')).toEqual([]);
    expect(yadroD(zdravo, 'проба.ts')).toEqual([]);
    expect(yadroZ(zdravo, 'проба.ts')).toEqual([]);
  });

  it('ПРОЗОРЕЦЪТ брои РАБОТЕЩИ редове · коментар не е разстояние', () => {
    // Дупката, намерена със счупване в самия резен 44: обходът гледаше „до три
    // РЕДА след", а коментарът също е ред — тъй че три реда обяснение изтикваха
    // четенето вън от прозореца и находката изчезваше. Заобикаляне с коментар.
    const redove = [
      "await p.click('#neshto');",
      '// обяснение едно',
      '// обяснение две',
      '',
      '// обяснение три',
      "await p.$eval('#drugo', (e) => e.textContent);",
    ];
    expect(rabotni(redove, 1, 3)).toEqual([redove[5]]);
    // и назад · обвивката се търси нагоре по същото правило
    expect(rabotni(redove, 4, 2, -1)).toEqual([redove[0]]);

    // И ДВАТА обхода го ПОЛЗВАТ. Чистата функция може да е вярна, а обходът да
    // е върнат на голото `slice` — тогава дупката е пак отворена, а тестът ѝ
    // мълчи. Тази половина се проверява по извора, защото обходът чете диска:
    // да се извика с изкуствени редове, той трябва да спре да е обход.
    expect(IZVOR.match(/rabotni\(redove, i/g)?.length).toBe(5);
    // ПЕТ · трите стари викащи плюс обявеният праг на обход К. Обход Б има свой
    // прозорец и той НАРОЧНО брои голи редове — онова, което търси, Е коментар
    // („ОБХВАТ: ЦЯЛАТА СТРАНИЦА"). Прескочи ли коментарите, обявеното
    // изключение става невидимо.
  });

  // подпроцес · времето е ОБЯВЕНО, за да не пада тестът под товар (обход Д)
  it('днес минава · единайсетте обхода са под праговете си', () => {
    const izhod = execFileSync('node', ['stroezh/chestnost.mjs'], { encoding: 'utf8' });
    expect(izhod).toContain('Честно: нито един обход над прага си');
    expect(izhod).toContain('Б · гол селектор върху двусмислен белег: 0');
    expect(izhod).toContain('Е · четене без изчакване след действие: 0');
    expect(izhod).toContain('Ж · пише след прерисуване и подава, без проверка: 0');
    expect(izhod).toContain('А · тестът се мести заедно с кода: 0');
    expect(izhod).toContain('В · константа без нито един пин с ръка: 0');
    expect(izhod).toContain('Г · цикъл с очакване върху списък, който може да е празен: 0');
    expect(izhod).toContain('Д · подпроцес в тест без обявено време: 0');
    expect(izhod).toContain('З · праг за скорост върху едно измерване: 0');
    expect(izhod).toContain('И · проверка, която пише в дървото на проекта: 0');
    expect(izhod).toContain('Й · обход по файлове без твърдение колко е видял: 0');
    expect(izhod).toContain('К · в прохода: праг вместо число: 0');
  }, 60_000);

  /**
   * ВСИЧКИТЕ ЕДИНАЙСЕТ ЛОВЯТ · доказано върху ИЗКУСТВЕНО ДЪРВО.
   *
   * Дотук доказани бяха ТРИ (Г · Д · З) — те имат изнесено ядро и то се вика с
   * редове. Останалите осем нямаха нищо: Б · Е · Ж · А · В нямат ядро изобщо, а
   * И · Й · К имат изнесено ядро, което НИТО ЕДИН тест не викаше. Тоест осем
   * обхода бяха НАДПИС по собствената мярка на ADR-015 §7: „обход, който още не
   * е ловил нищо, е надпис — не се знае дали мълчи, защото е чисто, или защото
   * не работи."
   *
   * ЛЕКЪТ Е ЕДИН ЗА ВСИЧКИТЕ, вместо осем ядра: коренът вече е вход
   * (`CHESTNOST_KOREN`), тъй че цялата команда се пуска върху дърво, направено
   * нарочно счупено — по едно място за всеки обход. Това доказва и СВЪРЗВАНЕТО
   * (обход, вписан в списъка, но невикан, пак ще мълчи), не само израза.
   *
   * ДЪРВОТО Е ВЪВ ВРЕМЕННАТА ПАПКА · писане в хранилището е състезание с всеки
   * друг обход (обход И, платен със собственото доказателство на резен 6в).
   *
   * РЕДОВЕТЕ СА ЛИТЕРАЛИ · цял ред в кавички се пропуска от обходите (`eDanni`),
   * тъй че счупените форми тук не обвиняват самия този файл.
   */
  it('и ВСИЧКИТЕ ЕДИНАЙСЕТ ловят · доказано с нарочно счупено ДЪРВО', () => {
    const koren = mkdtempSync(join(tmpdir(), 'chestnost-darvo-'));
    try {
      for (const p of ['app', 'src', 'tests', 'proba']) mkdirSync(join(koren, p));

      // белегът `pole` живее в ДВА екрана · оттам е двусмислен (обход Б)
      for (const ime of ['ekran-a.ts', 'ekran-b.ts']) {
        writeFileSync(join(koren, 'app', ime), 'const html = `<p data-pole="1"></p>`;\n');
      }

      const prohod = [
        'export async function schupeno(p, proveri, redovete) {',
        "  const a = await p.$eval('[data-pole]', (e) => e.textContent);",
        "  await p.click('[data-buton]');",
        "  const b = await p.$eval('[data-vest]', (e) => e.textContent);",
        "  await p.click('[data-otvori]');",
        "  await p.fill('[data-ime]', 'x');",
        "  await p.click('button[type=submit]');",
        '  proveri(',
        "    'редовете са над трийсет',",
        '    redovete.length > 30,',
        '    true,',
        '  );',
        '  return [a, b];',
        '}',
        '',
      ].join('\n');
      writeFileSync(join(koren, 'proba', 'schupeno.ts'), prohod);

      const testat = [
        "import { execFileSync } from 'node:child_process';",
        "import { readdirSync, writeFileSync } from 'node:fs';",
        "import { NASHATA_MYARKA } from '../src/mero.js';",
        '',
        "it('А · входът се смята от същата константа', () => {",
        '  const t = sled(NAPRED_DNI + 1);',
        '  expect(t).toBe(1);',
        '});',
        '',
        "it('В · сверява се срещу константа, без нито един пин', () => {",
        '  expect(zhivoto).toEqual(NASHATA_MYARKA);',
        '});',
        '',
        "it('Г · цикъл върху списък, който може да е празен', () => {",
        '  for (const s of sverkite) expect(s.nared).toBe(true);',
        '});',
        '',
        "it('Д · подпроцес без обявено време', () => {",
        "  execFileSync('node', ['-e', '1']);",
        '});',
        '',
        "it('З · праг върху ЕДНО измерване', () => {",
        '  const nachalo = performance.now();',
        '  smetni();',
        '  expect(performance.now() - nachalo).toBeLessThan(200);',
        '});',
        '',
        "it('И · пише В ДЪРВОТО на проекта', () => {",
        "  writeFileSync('tests/vremenno.ts', 'x');",
        '});',
        '',
        "it('Й · обход по файлове без твърдение колко е видял', () => {",
        "  const nam = readdirSync('src').filter((f) => f.endsWith('.ts'));",
        '  expect(nam).toEqual([]);',
        '});',
        '',
      ].join('\n');
      writeFileSync(join(koren, 'tests', 'schupeno.test.ts'), testat);

      let kod = 0;
      let izhod = '';
      try {
        izhod = execFileSync('node', [join(KOREN, 'stroezh', 'chestnost.mjs')], {
          encoding: 'utf8',
          env: { ...process.env, CHESTNOST_KOREN: koren },
        });
      } catch (g) {
        kod = (g as { status: number }).status;
        izhod = String((g as { stdout: string }).stdout ?? '');
      }

      expect(kod).toBe(1);
      // всеки обход по ИМЕ, с брой НАД нула · инак „ловят" би значело „някои"
      const po = new Map<string, number>();
      // ИМЕТО НОСИ ДВОЕТОЧИЕ („К · в прохода: праг…") · ненаситното четене го реже
      // на първото двоеточие и дава празна карта — тоест зелено без да е проверило нищо.
      for (const m of izhod.matchAll(/^\s+[·✗]\s+(.+):\s+(\d+)\s+·/gm)) {
        po.set(m[1]!.trim(), Number(m[2]));
      }
      expect([...po.keys()]).toEqual([...pragovete().keys()]);
      for (const [ime, broy] of po) expect(broy, `обход „${ime}" не лови`).toBeGreaterThan(0);
    } finally {
      rmSync(koren, { recursive: true, force: true });
    }
  }, 60_000);
});
