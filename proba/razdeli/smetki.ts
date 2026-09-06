import { readFileSync } from 'node:fs';
import { prochetiKniga } from '../../src/kniga/ooxml.ts';
import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { tekstNa, tekstoveNa } from '../yadro/pomoshtni.ts';
import { mesetsatNaProhoda } from '../yadro/kalendar.ts';
import { ADRES } from '../yadro/server.ts';

const SMETKI = 'Сметки';
const ZALEPENO = '[data-zalepeno="smetki"]';
/** еврото по нормата му · тясна пауза (U+202F) между хилядите и пред знака */
const EVRO_1200 = '1 200,00 €';
const EVRO_MINUS_1500 = '-1 500,00 €';
const EVRO_1500 = '1 500,00 €';
/**
 * Месецът е ТЕКУЩИЯТ, не закован.
 *
 * „2026-09" щеше да спре да работи след 01.11.2026: листът Сметки реже
 * колоните си от предишния месец нататък, тъй че старият месец излиза извън
 * прозореца и „■" не се пише никъде (ADR-015).
 */
const MESETS = mesetsatNaProhoda();

/** 4 · Сметки · трите реда залепено · движение · знакът · кешът · Книгата и вносът */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // ══ 4а · залепената част · ТРИ реда (негово, 05.09 т.2) ══════════════
  razdel = '4а · трите реда';
  await p.goto(`${ADRES}#/smetki`);
  await p.waitForSelector(ZALEPENO);
  proveri(
    'десетте полета с цифри на Сметки · и двете за ДДС и НАП (резен 3б)',
    (await tekstoveNa(p, `${ZALEPENO} [data-pole] .ime`)).join(' · '),
    'Приход · Разходи · Резултат · Кеш дадено · Кеш изтеглено · Кеш вкарано · движения · несверени · ДДС остатък · находки НАП',
  );
  proveri(
    'вторият ред е за КЕШ · с трите му числа и сверката',
    await p.$$eval('[data-kesh-forma] input.pole', (es) => es.length),
    4,
  );
  proveri(
    'третият ред са бутоните · неговите четиринайсет плюс „Добави ред с пари"',
    await p.$$eval(`${ZALEPENO} [data-buton-ekran].malak`, (es) => es.length),
    14,
  );
  proveri(
    'двете му ленти стоят една под друга',
    (await tekstoveNa(p, '[data-blok="prihod"] .lenta, [data-blok="razhod"] .lenta')).join(' · '),
    'ПРИХОД · Разходи',
  );
  proveri(
    'секциите му са в реда на номенклатурата',
    (await tekstoveNa(p, '[data-reshetka="prihod"] tr.sektsiya td:first-child')).join(' · '),
    'Наем Банка · Наем Кеш · Бизнес · Други',
  );
  proveri('нула движения', await tekstNa(p, '[data-tsifra="dvizheniya"]'), '0');

  // ══ 4б · движение · знакът решава страната ═══════════════════════════
  razdel = '4б · движение';
  await p.click('[data-dobavi-dvizhenie]');
  await p.waitForSelector('tr.chernova[data-chernova="dvizheniya"]');
  const ch = 'tr.chernova[data-chernova="dvizheniya"]';
  await p.selectOption(`${ch} select[data-kolona="sektsiya"]`, '1');
  await p.selectOption(`${ch} select[data-kolona="funktsiya"]`, '3');
  await p.fill(`${ch} input[data-kolona="mesets"]`, MESETS);
  await p.fill(`${ch} input[data-kolona="suma"]`, '1200');
  await p.press(`${ch} input[data-kolona="suma"]`, 'Enter');
  await p.waitForSelector('[data-reshetka="prihod"] tr.red[data-tablitsa="dvizheniya"]');
  proveri(
    'редът застава под „Наем Банка" · сборът на секцията е сумата му',
    await tekstNa(p, '[data-sbor-sektsiya="prihod·1"]'),
    EVRO_1200,
  );
  proveri('ОБЩ ПРИХОД', await tekstNa(p, '[data-sbor="prihod"]'), EVRO_1200);
  proveri('полето горе го брои', await tekstNa(p, '[data-tsifra="prihod"]'), EVRO_1200);
  proveri('движенията станаха едно', await tekstNa(p, '[data-tsifra="dvizheniya"]'), '1');
  proveri(
    'сверката на секциите затваря',
    await tekstNa(p, '[data-sverka="smetki"]'),
    'движения 1 · без секция 0 · сверката затваря',
  );

  // разход в ПРИХОДНА секция · отказът е с думи (правило 20)
  await p.click('[data-dobavi-dvizhenie]');
  await p.waitForSelector(ch);
  await p.selectOption(`${ch} select[data-kolona="sektsiya"]`, '1');
  await p.selectOption(`${ch} select[data-kolona="funktsiya"]`, '3');
  await p.fill(`${ch} input[data-kolona="mesets"]`, MESETS);
  await p.fill(`${ch} input[data-kolona="suma"]`, '-1500');
  await p.press(`${ch} input[data-kolona="suma"]`, 'Enter');
  await p.waitForFunction(
    () => (document.querySelector('[data-greshka]')?.textContent ?? '') !== '',
  );
  proveri(
    'знакът не отговаря на секцията · и то се КАЗВА',
    (await tekstNa(p, '[data-greshka]')).includes('Знакът не отговаря на секцията'),
    true,
  );
  // същият ред, но в разходна секция · минава
  await p.selectOption(`${ch} select[data-kolona="sektsiya"]`, '');
  await p.selectOption(`${ch} select[data-kolona="sektsiyaR"]`, '1');
  await p.press(`${ch} input[data-kolona="suma"]`, 'Enter');
  await p.waitForSelector('[data-reshetka="razhod"] tr.red[data-tablitsa="dvizheniya"]');
  proveri('ОБЩ Разходи', await tekstNa(p, '[data-sbor="razhod"]'), EVRO_MINUS_1500);
  proveri(
    'Резултатът е приход + разход',
    await tekstNa(p, '[data-tsifra="rezultat"]'),
    '-300,00 €',
  );
  proveri(
    'секцията „Вкарване" събира трите му секции',
    (await tekstoveNa(p, '[data-reshetka="vkarvane"] tr.sektsiya td:first-child')).join(' · '),
    'Заплати Кеш · Фактури Кеш · Фактури Карта',
  );
  proveri(
    'и редът за заплати е вътре',
    await p.$$eval('[data-reshetka="vkarvane"] tr.red', (es) => es.length),
    1,
  );

  // ══ 4в · кешът за месеца · сверката в края на месеца ═════════════════
  razdel = '4в · кешът';
  await p.fill('[data-kesh-mesets]', MESETS);
  await p.fill('[data-kesh-zaplati]', '1500');
  await p.fill('[data-kesh-izvlechenie]', '1500');
  await p.click('[data-kesh-zapishi]');
  await p.waitForFunction(
    (evro) => document.querySelector('[data-tsifra="kesh-dadeno"]')?.textContent?.trim() === evro,
    EVRO_1500,
  );
  proveri('Кеш дадено', await tekstNa(p, '[data-tsifra="kesh-dadeno"]'), EVRO_1500);
  proveri('Кеш изтеглено', await tekstNa(p, '[data-tsifra="kesh-izvlechenie"]'), EVRO_1500);
  proveri('Кеш вкарано (по редовете)', await tekstNa(p, '[data-tsifra="kesh-vkarano"]'), EVRO_1500);
  const sverki = await tekstNa(p, '[data-kesh-sverki]');
  proveri(
    'и двете сверки затварят · дадено ↔ изтеглено ↔ вкарано по редовете',
    `${sverki.split('затваря').length - 1} · ${sverki.includes('разлика')}`,
    '2 · false',
  );

  // ══ 4г · Книгата · листът Сметки ═════════════════════════════════════
  razdel = '4г · Книгата';
  const [svalyane] = await Promise.all([
    p.waitForEvent('download'),
    p.click('[data-buton-ekran="svali-fayl"]'),
  ]);
  const pat = (await svalyane.path()) ?? '';
  await p.waitForFunction(() =>
    (document.querySelector('[data-iznos-vest]')?.textContent ?? '').startsWith(
      'Книгата е записана',
    ),
  );
  const kniga = await prochetiKniga(readFileSync(pat));
  const list = kniga.listove.find((l) => l.ime === SMETKI);
  const k = list?.kletki ?? [];
  const red = (duma: string): number => k.findIndex((r) => String(r[0] ?? '') === duma);
  proveri('лентата ПРИХОД я има', red('ПРИХОД') > 0, true);
  proveri('лентата Разходи я има', red('Разходи') > red('ПРИХОД'), true);
  proveri(
    'секцията „Наем Банка" е групов ред с ключ',
    k[red('Наем Банка')]?.[23],
    'grupa:sektsiya:prihod·1',
  );
  const dvizhenie = k.find((r) => String(r[23] ?? '').startsWith('dvizhenie:'));
  proveri(
    'движението носи месеца и сумата си',
    `${dvizhenie?.[5]} · ${dvizhenie?.[10]}`,
    '2026-09 · 1200',
  );
  proveri(
    'и „■" в такта на месеца си',
    (dvizhenie ?? []).slice(11, 23).filter((c) => c === '■').length,
    1,
  );
  proveri('блокът „Кеш" е накрая', red('Кеш') > red('Разходи'), true);
  const kesh = k.find((r) => String(r[23] ?? '').startsWith('kesh:'));
  proveri(
    'кешът за месеца е в Книгата',
    `${kesh?.[0]} · ${kesh?.[1]} · ${kesh?.[3]}`,
    '2026-09 · 1500 · 1500',
  );

  // ══ 4д · вносът · същата Книга = нула предложения ════════════════════
  razdel = '4д · вносът';
  await p.goto(`${ADRES}#/ii`);
  await p.waitForSelector('[data-kniga-vnos]');
  await p.setInputFiles('[data-kniga-vnos]', pat);
  await p.waitForFunction(() =>
    /предложения/.test(document.querySelector('[data-otchet-vest]')?.textContent ?? ''),
  );
  proveri(
    'износ → внос = нула · и със Сметки',
    await tekstNa(p, '[data-otchet-vest]'),
    '0 предложения · 0 находки · 0 бележки',
  );
}
