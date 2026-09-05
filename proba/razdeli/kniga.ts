import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { napishiKniga, prochetiKniga } from '../../src/kniga/ooxml.ts';
import { opisOtProcheten } from '../yadro/kniga.ts';
import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { tekstNa, tekstoveNa } from '../yadro/pomoshtni.ts';
import { ADRES } from '../yadro/server.ts';

const MOSTRA = fileURLToPath(new URL('../../tests/mostri/Coretovia-mostra.xlsx', import.meta.url));
/** променените Книги на прохода · във временната папка, не в дървото (правило 21) */
const PROMENENA = join(tmpdir(), 'coretovia-proba-promenena.xlsx');
const CHUZHDA = join(tmpdir(), 'coretovia-proba-chuzhda.xlsx');

/** 2 · ИИ · Сверчикът: неподвижната точка · променена Книга · същата пак · чужд Стопанин · неговата Книга */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  /** качва файл в ИИ и чака отчета */
  const prochetiVII = async (pat: string): Promise<string> => {
    await p.goto(`${ADRES}#/ii`);
    await p.waitForSelector('[data-kniga-vnos]');
    await p.setInputFiles('[data-kniga-vnos]', pat);
    await p.waitForFunction(() =>
      /предложения/.test(document.querySelector('[data-otchet-vest]')?.textContent ?? ''),
    );
    return tekstNa(p, '[data-otchet-vest]');
  };

  /** натиска „Приеми избраните" и чака разписката */
  const priemi = async (): Promise<string> => {
    await p.click('[data-priemi]');
    await p.waitForFunction(() =>
      // не „изчакай разписката…" (вносът тече), а самата разписка
      /разписката е (записана|отказана)/.test(
        document.querySelector('[data-vnos-vest]')?.textContent ?? '',
      ),
    );
    return tekstNa(p, '[data-vnos-vest]');
  };

  // ══ 2а · прозорецът ИИ · неговите агенти · без прочетена Книга ═══════
  razdel = '2а · ИИ';
  await p.goto(`${ADRES}#/ii`);
  await p.waitForSelector('[data-agenti="aktivni"]');
  proveri(
    'петте му агента под „Активни агенти"',
    await p.$$eval('[data-agenti="aktivni"] tr.red', (es) => es.length),
    5,
  );
  proveri(
    'Сверчикът работи · другите идват с резен 7',
    (await tekstoveNa(p, '[data-agenti="aktivni"] [data-status]')).join(' · '),
    'работи · без мрежа · чист код · идва с резен 7 · идва с резен 7 · идва с резен 7 · идва с резен 7',
  );
  proveri(
    '„Неактивни агенти" е празна, както при него',
    await p.$$eval('[data-agenti="neaktivni"] tbody tr', (es) => es.length),
    0,
  );
  proveri('няма прочетена Книга', await tekstNa(p, '[data-otchet-vest]'), 'няма прочетена Книга');
  proveri('няма разписки', await tekstNa(p, '[data-vnasyaniya-nyama]'), 'още няма');

  // ══ 2б · неподвижната точка · износ → внос = нищо · и нулата се записва ═
  razdel = '2б · неподвижната точка';
  await p.goto(`${ADRES}#/imoti`);
  await p.waitForSelector('[data-zapazi-kniga]');
  const [svalyane] = await Promise.all([
    p.waitForEvent('download'),
    p.click('[data-zapazi-kniga]'),
  ]);
  const pat = (await svalyane.path()) ?? '';
  await p.waitForFunction(() =>
    (document.querySelector('[data-iznos-vest]')?.textContent ?? '').startsWith(
      'Книгата е записана',
    ),
  );
  proveri(
    'нула предложения · нула находки',
    await prochetiVII(pat),
    '0 предложения · 0 находки · 0 бележки',
  );
  const sverki = await tekstNa(p, '[data-sverki-obobshtenie]');
  proveri('сверките затварят', /^сверки · (\d+) от \1 затварят$/.test(sverki), true);
  proveri('находки няма', await tekstNa(p, '[data-nahodki-nyama]'), 'няма');
  proveri('избрани 0 от 0', await tekstNa(p, '[data-izbrani]'), 'избрани 0 от 0');
  proveri(
    'разписката се записва и при нула (правило 7)',
    (await priemi()).startsWith(
      'приети 0 от 0 избрани · повторени 0 · отказани 0 · пропуснати 0 · неопитани 0 · сверка затваря · разписката е записана',
    ),
    true,
  );
  proveri(
    'разписката е в таблицата',
    (await tekstoveNa(p, '[data-vnasyaniya] tbody tr td')).slice(3).join(' · '),
    '0 · 0 · 0 · 0 · 0',
  );
  proveri(
    'Журналът: 12 + разписка за износ + разписка за внос',
    (await tekstNa(p, '[data-vest]')).startsWith('14 събития'),
    true,
  );

  // ══ 2в · променена Книга · поправка · нов ред · нова стойност · махнат ред ═
  razdel = '2в · променена Книга';
  const izvor = await prochetiKniga(readFileSync(pat));
  const listove = izvor.listove.map(opisOtProcheten);
  const imoti = listove.find((l) => l.ime === 'ИмотиОбектиБизнеси')!;
  const redove = imoti.redove as (string | number | null)[][];
  const redGaraYana = redove.findIndex((r) => r[1] === 'Гара Яна');
  redove[redGaraYana]![5] = 250000; // цената · F
  const posledenImot = redove.findIndex((r) => r[1] === 'Студентски Град');
  const praznoSled = Math.max(redGaraYana, posledenImot) + 1;
  proveri(
    'редът под последния Имот е празен',
    (redove[praznoSled] ?? []).every((c) => c === null || c === ''),
    true,
  );
  redove[praznoSled] = [null, 'Панчарево', 'УПИ']; // нов Имот · без ключ
  const redBiznes = redove.findIndex((r) => r[0] === '1.3.1');
  redove.splice(redBiznes, 1); // Бизнесът изчезва
  const nastroyki = listove.find((l) => l.ime === 'Настройки(Стопанин)')!;
  const nr = nastroyki.redove as (string | number | null)[][];
  const posledna = nr.findIndex((r) => r[5] === 'sastoyanie-na-imot##4');
  nr[posledna + 1] = [null, null, 'Наследство']; // нова стойност в празния ред на подтаблицата
  writeFileSync(PROMENENA, await napishiKniga(listove));

  proveri(
    'четири предложения · нула находки',
    await prochetiVII(PROMENENA),
    '4 предложения · 0 находки · 0 бележки',
  );
  proveri(
    'видовете в реда на Книгата · Настройки първи',
    (await tekstoveNa(p, '[data-predlozheniya] tr.red td:nth-child(5)')).join(' · '),
    'нова стойност · поправка · нов ред · изключване',
  );
  proveri(
    'Портата минава трите независими · изключването е неотметнато',
    await p.$$eval('[data-otmetka]', (es) =>
      es.map((e) => ((e as HTMLInputElement).checked ? '1' : '0')).join(''),
    ),
    '1110',
  );
  proveri(
    'Портата: четирите минават',
    (await tekstoveNa(p, '[data-porta]')).join(' · '),
    'минава · минава · минава · минава',
  );
  proveri('избрани 3 от 4', await tekstNa(p, '[data-izbrani]'), 'избрани 3 от 4');
  proveri(
    'приети 3 от 3 · разписката е записана',
    (await priemi()).startsWith(
      'приети 3 от 3 избрани · повторени 0 · отказани 0 · пропуснати 0 · неопитани 0 · сверка затваря · разписката е записана',
    ),
    true,
  );
  proveri(
    'състоянията · приет · приет · приет · празно',
    (await tekstoveNa(p, '[data-sastoyanie]')).join(' · '),
    'приет · приет · приет · ',
  );
  await p.waitForSelector('[data-priemi][disabled]');
  proveri(
    'след „Приеми" бутонът е сив и КАЗВА защо (правило 12)',
    await p.$eval(
      '[data-priemi]',
      (e) => `${(e as HTMLButtonElement).disabled} · ${e.getAttribute('title')}`,
    ),
    'true · Приетото е записано — за останалите предложения прочети Книгата пак.',
  );
  proveri(
    'неотметнатото № 4 не се отмята след приключен прочит · и казва защо',
    await p.$eval(
      '[data-otmetka="3"]',
      (e) => `${(e as HTMLInputElement).disabled} · ${e.getAttribute('title')}`,
    ),
    'true · Приетото е записано — за останалите предложения прочети Книгата пак.',
  );
  proveri('броячът не мърда', await tekstNa(p, '[data-izbrani]'), 'избрани 3 от 4');
  await p.goto(`${ADRES}#/imoti`);
  await p.waitForSelector('tr.red[data-tablitsa="imoti"]:nth-of-type(3)');
  proveri(
    'Панчарево е Имот № 3',
    await tekstNa(p, 'tr.red[data-tablitsa="imoti"]:nth-of-type(3) td[data-kolona="ime"]'),
    'Панчарево',
  );
  proveri(
    'цената на Гара Яна е 250 000 € · цели центове',
    await p.$eval(
      'tr.red[data-tablitsa="imoti"]:nth-of-type(2) td[data-kolona="tsena"]',
      (e) => (e as HTMLElement).dataset['st'],
    ),
    '25000000',
  );
  await p.goto(`${ADRES}#/nastroyki`);
  await p.waitForSelector('tr.red[data-nomenklatura="sastoyanie-na-imot"][data-nomer="5"]');
  proveri(
    '„Наследство" е № 5 в Състояние на Имот',
    await tekstNa(
      p,
      'tr.red[data-nomenklatura="sastoyanie-na-imot"][data-nomer="5"] [data-stoynost]',
    ),
    'Наследство',
  );

  // ══ 2г · същата Книга втори път · само неотметнатото остава · приема се ═
  razdel = '2г · същата Книга пак';
  proveri(
    'само изключването · две бележки: стойността вече я има · новият ред е разпознат по име',
    await prochetiVII(PROMENENA),
    '1 предложения · 0 находки · 2 бележки',
  );
  proveri(
    'бележките казват кое и по кое име',
    (await tekstoveNa(p, '[data-nahodki] tbody tr td:last-child')).join(' | '),
    '„Наследство" вече е № 5 в „Състояние на Имот". | Редът няма ключ — разпознат по името „Панчарево" (3).',
  );
  await p.check('[data-otmetka="0"]');
  await p.waitForFunction(
    () => document.querySelector('[data-izbrani]')?.textContent === 'избрани 1 от 1',
  );
  proveri('избрани 1 от 1', await tekstNa(p, '[data-izbrani]'), 'избрани 1 от 1');
  proveri('изключването минава', (await priemi()).startsWith('приети 1 от 1 избрани'), true);
  await p.goto(`${ADRES}#/imoti`);
  await p.waitForFunction(() =>
    document.querySelector('[data-sverka="biznesi"]')?.textContent?.startsWith('живи 0'),
  );
  proveri(
    'Бизнесът е изключен · Журналът го пази',
    await tekstNa(p, '[data-sverka="biznesi"]'),
    'живи 0 · изключени 1 · всички 1',
  );

  // ══ 2д · Книга на друг Стопанин · нищо не се предлага ════════════════
  razdel = '2д · чужд Стопанин';
  const chuzhda = izvor.listove.map(opisOtProcheten);
  const sl = chuzhda.find((l) => l.ime === '_coretovia')!;
  const slr = sl.redove as (string | number | null)[][];
  slr[slr.findIndex((r) => r[0] === 'stopanin')] = ['stopanin', 'drug@example.bg'];
  writeFileSync(CHUZHDA, await napishiKniga(chuzhda));
  proveri(
    'нула предложения · една находка',
    await prochetiVII(CHUZHDA),
    '0 предложения · 1 находки · 0 бележки',
  );
  proveri(
    'находката казва защо',
    (await tekstoveNa(p, '[data-nahodki] tbody tr td:last-child'))[0],
    'Книгата е изнесена от друг Стопанин — не се слива с тази (правило 21); нищо не се предлага.',
  );
  proveri(
    'нищо за приемане · бутонът е сив и го казва · разписка за чужда Книга не се пише',
    await p.$eval(
      '[data-priemi]',
      (e) => `${(e as HTMLButtonElement).disabled} · ${e.getAttribute('title')}`,
    ),
    'true · нищо за приемане — Книгата не е на този Стопанин или Модел',
  );

  // ══ 2е · неговата Книга (мострата) върху живо Огледало · чете се без грешки ═
  razdel = '2е · неговата Книга';
  const otchet = await prochetiVII(MOSTRA);
  proveri(
    'чете се · с находки само от листа Сметки (в макета му K носи думи, не числа)',
    /^\d+ предложения · \d+ находки · \d+ бележки$/.test(otchet),
    true,
  );
  proveri(
    'нито една грешка извън Сметки',
    await p.$$eval('[data-nahodki] tr.greshka-red td:first-child', (es) =>
      [...new Set(es.map((e) => (e as HTMLElement).innerText.trim()))].join(' · '),
    ),
    'Сметки',
  );
  proveri(
    'над трийсет предложения · нищо не е прието',
    (await p.$$eval('[data-predlozheniya] tr.red', (es) => es.length)) > 30,
    true,
  );
  proveri(
    'служебен лист няма · не е наша Книга',
    (await tekstNa(p, '[data-otchet-fayl]')).endsWith('без служебен лист (не е наша Книга)'),
    true,
  );
}
