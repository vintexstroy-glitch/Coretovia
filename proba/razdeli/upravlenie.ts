import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { napishiKniga, prochetiKniga } from '../../src/kniga/ooxml.ts';
import { opisOtProcheten } from '../yadro/kniga.ts';
import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { tekstNa, tekstoveNa } from '../yadro/pomoshtni.ts';
import { ADRES } from '../yadro/server.ts';

/** променената Книга на прохода · във временната папка, не в дървото (правило 21) */
const S_ZADACHA = join(tmpdir(), 'coretovia-proba-zadacha.xlsx');
const UPRAVLENIE = 'УправлениеДелаПреписки';
/** грешката на Управление · след залепената част, за да не е гол белег (честност Б) */
const GRESHKA = '[data-zalepeno="upravlenie"] + [data-greshka]';
/** еврото по нормата му · тясна пауза (U+202F) между хилядите и пред знака */
const EVRO_250000 = '250\u202F000,00\u202F€';

function denNapred(dni: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dni);
  return d.toISOString().slice(0, 10);
}

/** 3 · Управление · полетата и бутоните · задача от десния бутон · филтър · сбор · Гант · Книгата · вносът */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // ══ 3а · залепената част · осем полета с цифри · четиринайсетте му бутона · дървото ═
  razdel = '3а · залепената част';
  await p.goto(`${ADRES}#/upravlenie`);
  await p.waitForSelector('[data-zalepeno="upravlenie"]');
  proveri(
    'осемте полета с цифри · от ляво надясно',
    (await tekstoveNa(p, '[data-pole] .ime')).join(' · '),
    'Спешно и Важно · просрочени · тази седмица · отворени задачи · Бюджет Дела · Имоти · Обекти · Бизнеси',
  );
  proveri(
    'Имоти 3 · Обекти 0 · Бизнеси 0',
    (await tekstoveNa(p, '[data-tsifra]')).slice(5).join(' · '),
    '3 · 0 · 0',
  );
  proveri(
    'четиринайсет бутона · всички с един клас',
    await p.$$eval('[data-zalepeno="upravlenie"] [data-buton-ekran].malak', (es) => es.length),
    14,
  );
  proveri(
    'Отвори и Запази вече РАБОТЯТ · не казват „идва с резен" (резен 6б)',
    await p.$eval('[data-buton-ekran="otvori"]', (e) => (e as HTMLButtonElement).disabled),
    false,
  );
  proveri(
    'дървото · трите Имота · сверката затваря',
    await tekstNa(p, '[data-sverka="darvo"]'),
    'видими 3 от 3 · родители 3 · задачи 0 · сираци 0',
  );
  proveri(
    'редът „филтър" под двете глави · и редът СБОР отдолу',
    `${await p.$$eval('[data-filtar]', (es) => es.length)} · ${await tekstNa(p, '[data-sbor-red] td:first-child')}`,
    '10 · сбор',
  );
  proveri(
    'Гантът е до таблицата · без ленти',
    (await tekstNa(p, '[data-sverka="gant"]')).startsWith('ленти 0 ·'),
    true,
  );

  // ══ 3б · десен бутон върху Имот → Дело „Сондаж" под него · Гантът · полетата ═
  razdel = '3б · задача от десния бутон';
  const garaYana = 'tr.red.roditel:has-text("Гара Яна")';
  await p.click(garaYana, { button: 'right' });
  await p.waitForSelector('[data-menyu]');
  proveri(
    'менюто · Добави Задача · Изключи · Върни · Сторно · Голямо дело (сиво)',
    (await tekstoveNa(p, '[data-tochka]')).map((t) => t.split('\n')[0]).join(' · '),
    'Добави Задача · Изключи реда · Върни реда · Сторно на последната промяна · Голямо дело',
  );
  proveri(
    'Голямото дело казва кога идва',
    await p.$eval('[data-tochka="golyamo-delo"]', (e) => e.getAttribute('title')),
    'идва с резен 8 · само при Строеж (негово B4)',
  );
  await p.click('[data-tochka="upravlenie.dobaviZadacha"]');
  await p.waitForSelector('tr.chernova[data-chernova="zadachi"]');
  proveri(
    'черновата е под Гара Яна',
    await p.$eval(`${garaYana} + tr`, (e) => e.className),
    'chernova zadacha nivo-2',
  );
  const ch = 'tr.chernova[data-chernova="zadachi"]';
  await p.selectOption(`${ch} select[data-kolona="vid"]`, '1');
  await p.fill(`${ch} input[data-kolona="ime"]`, 'Сондаж');
  await p.fill(`${ch} input[data-kolona="ot"]`, denNapred(5));
  await p.fill(`${ch} input[data-kolona="do"]`, denNapred(9));
  await p.selectOption(`${ch} select[data-kolona="otsenka"]`, '1');
  await p.fill(`${ch} input[data-kolona="byudzhet"]`, '250 000');
  await p.press(`${ch} input[data-kolona="byudzhet"]`, 'Enter');
  await p.waitForSelector('tr.red.zadacha[data-tablitsa="zadachi"]');
  proveri(
    'задачата стои под Гара Яна · слятата клетка е две клетки · Дело · Сондаж',
    await p.$eval(`${garaYana} + tr.red.zadacha`, (e) =>
      [...e.querySelectorAll('td[data-kolona="vid"], td[data-kolona="ime"]')]
        .map((td) => td.textContent?.trim())
        .join(' / '),
    ),
    'Дело / Сондаж',
  );
  proveri(
    'бюджетът е цели центове · по нормата на еврото',
    await p.$eval(
      'tr.red.zadacha td[data-kolona="byudzhet"]',
      (e) => `${(e as HTMLElement).dataset['st']} · ${e.textContent?.trim()}`,
    ),
    `25000000 · ${EVRO_250000}`,
  );
  proveri(
    'полетата · Спешно и Важно 1 · отворени 1 · Бюджет Дела 250 000,00 €',
    `${await tekstNa(p, '[data-tsifra="speshni"]')} · ${await tekstNa(p, '[data-tsifra="otvoreni"]')} · ${await tekstNa(p, '[data-tsifra="byudzhet"]')}`,
    `1 · 1 · ${EVRO_250000}`,
  );
  proveri(
    'дървото · четири реда · една задача',
    await tekstNa(p, '[data-sverka="darvo"]'),
    'видими 4 от 4 · родители 3 · задачи 1 · сираци 0',
  );
  proveri(
    'Гантът · една лента · червена, защото е Спешно и Важно',
    await p.$eval('[data-gant] rect.gant-lenta', (e) => e.classList.contains('speshno')),
    true,
  );
  proveri(
    'сверката на Ганта',
    (await tekstNa(p, '[data-sverka="gant"]')).startsWith(
      'ленти 1 · без дати или извън обхвата 0 · задачи 1 · такт месец',
    ),
    true,
  );
  proveri(
    'СБОР под Бюджет Дела · 250 000,00 €',
    await tekstNa(p, '[data-sbor-stoynost="9"]'),
    EVRO_250000,
  );

  // ══ 3в · филтърът · сметката · тактът · скриването ═══════════════════
  razdel = '3в · филтър · сбор · такт';
  await p.fill('[data-filtar="4"]', 'сон');
  await p.press('[data-filtar="4"]', 'Enter');
  await p.waitForFunction(() =>
    document.querySelector('[data-sverka="darvo"]')?.textContent?.startsWith('видими 2 от 4'),
  );
  proveri(
    'филтър „сон" · остават задачата и Имотът ѝ · филтърът се казва',
    await tekstNa(p, '[data-sverka="darvo"]'),
    'видими 2 от 4 · родители 3 · задачи 1 · сираци 0 · филтърът е включен',
  );
  proveri(
    'Гантът следва филтъра · една лента върху два реда',
    await p.$$eval('[data-gant] line.gant-red', (es) => es.length),
    2,
  );
  await p.fill('[data-filtar="4"]', '');
  await p.press('[data-filtar="4"]', 'Enter');
  await p.waitForFunction(() =>
    document.querySelector('[data-sverka="darvo"]')?.textContent?.startsWith('видими 4 от 4'),
  );
  await p.selectOption('[data-smetka="9"]', 'broy');
  await p.waitForFunction(
    () => document.querySelector('[data-sbor-stoynost="9"]')?.textContent?.trim() === '1',
  );
  proveri('сметката „брой" под Бюджет Дела · 1', await tekstNa(p, '[data-sbor-stoynost="9"]'), '1');
  await p.selectOption('[data-smetka="9"]', 'sbor');
  await p.waitForFunction(
    (evro) => document.querySelector('[data-sbor-stoynost="9"]')?.textContent?.trim() === evro,
    EVRO_250000,
  );
  await p.selectOption('[data-takt]', 'godina');
  await p.waitForFunction(() =>
    document.querySelector('[data-sverka="gant"]')?.textContent?.includes('такт година'),
  );
  proveri(
    'такт година · дванайсет видими месеца, пет пъти повече колони · лентата остава',
    (await tekstNa(p, '[data-sverka="gant"]')).replace(
      /^ленти 1 .* такт година · колони (\d+)$/,
      '$1',
    ),
    '72',
  );
  await p.click('[data-buton-ekran="skriy-diagrama"]');
  await p.waitForSelector('[data-blok="gant"][hidden]', { state: 'attached' });
  proveri(
    'Скрий Диаграма · бутонът вече казва „Покажи Диаграма"',
    await tekstNa(p, '[data-buton-ekran="skriy-diagrama"]'),
    'Покажи Диаграма',
  );
  await p.click('[data-buton-ekran="skriy-tablitsa"]');
  await p.waitForFunction((s) => (document.querySelector(s)?.textContent ?? '') !== '', GRESHKA);
  proveri(
    'последният изглед не се скрива · и отказът се казва',
    await tekstNa(p, GRESHKA),
    'Последният изглед не се скрива — иначе секцията остава празна.',
  );
  await p.click('[data-buton-ekran="skriy-diagrama"]');
  await p.waitForSelector('[data-blok="gant"]:not([hidden])');
  proveri(
    'Покажи Диаграма я връща',
    await tekstNa(p, '[data-buton-ekran="skriy-diagrama"]'),
    'Скрий Диаграма',
  );

  // ══ 3г · „Свалифайл" = Книгата · листът Управление ═══════════════════
  // ══ 3в2 · неговите Отвори и Запази · моделът е ИМЕНУВАН поглед ══════
  razdel = '3в2 · моделът';
  // погледът се мени · тактът става година
  await p.selectOption('[data-takt]', 'godina');
  await p.waitForFunction(
    () => (document.querySelector('[data-sverka="gant"]')?.textContent ?? '').length > 0,
  );
  await p.evaluate(() => {
    // името на модела идва през prompt · тук се отговаря вместо човека
    (globalThis as unknown as { prompt: (a?: string, b?: string) => string }).prompt = () =>
      'Годишен преглед';
  });
  await p.click('[data-buton-ekran="zapazi"]');
  await p.waitForFunction(() =>
    (document.querySelector('[data-greshka]')?.textContent ?? '').includes('е записан'),
  );
  proveri(
    'Запази · моделът се записва с името си (негово B14)',
    await tekstNa(p, '[data-greshka]'),
    'Моделът „Годишен преглед" е записан.',
  );
  // погледът се разваля · после моделът го връща
  await p.selectOption('[data-takt]', 'den');
  await p.click('[data-buton-ekran="otvori"]');
  await p.waitForSelector('[data-menyu]');
  const punktove = await tekstoveNa(p, '[data-menyu] button');
  proveri(
    'Отвори · менюто носи празната таблица и запазения модел (негово A14)',
    punktove.join(' · '),
    'Празна таблица (изчисти погледа) · Годишен преглед',
  );
  await p.click('[data-menyu] [data-tochka="Годишен преглед"]');
  await p.waitForFunction(() =>
    (document.querySelector('[data-greshka]')?.textContent ?? '').includes('е отворен'),
  );
  proveri(
    'погледът се ВРЪЩА · тактът пак е година',
    await p.$eval('[data-takt]', (e) => (e as HTMLSelectElement).value),
    'godina',
  );
  await p.click('[data-buton-ekran="otvori"]');
  await p.waitForSelector('[data-menyu]');
  await p.click('[data-menyu] [data-tochka=""]');
  await p.waitForFunction(() =>
    (document.querySelector('[data-greshka]')?.textContent ?? '').includes('изчистен'),
  );
  proveri(
    'празната таблица изчиства погледа до подразбраното',
    await p.$eval('[data-takt]', (e) => (e as HTMLSelectElement).value),
    'mesets',
  );

  razdel = '3г · Книгата';
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
  const list = kniga.listove.find((l) => l.ime === UPRAVLENIE);
  const k = list?.kletki ?? [];
  proveri(
    'две глави · НАШИЯТ Отговорник · „такт" ×8 · Ключ в T',
    `${k[16]?.[10]} · ${k[16]?.slice(11, 19).join(',')} · ${k[16]?.[19]}`,
    'Отговорник · такт,такт,такт,такт,такт,такт,такт,такт · Ключ',
  );
  proveri('редът „филтър"', k[18]?.[1], 'филтър');
  const grupa = k.find((r) => String(r[19] ?? '').startsWith('grupa:imot:') && r[1] === 'Гара Яна');
  const zadacha = k.find((r) => String(r[19] ?? '').startsWith('zadacha:'));
  proveri('Гара Яна е групов ред с ключ', grupa?.[0], '2');
  proveri(
    'задачата · слятата клетка · ■ в такта',
    `${zadacha?.[4]} · ${zadacha?.slice(11, 19).filter((v) => v === '■').length}`,
    'Дело / Сондаж · 1',
  );
  proveri(
    'редът СБОР · 1 задача · 250 000',
    `${k.find((r) => r[0] === 'сбор')?.[1]} · ${k.find((r) => r[0] === 'сбор')?.[9]}`,
    '1 · 250000',
  );
  proveri('„Ключ" (T) е скрита', list?.skritiKoloni.join(','), '20');

  // ══ 3д · вносът · същата Книга = нула · дописана задача под Гара Яна = нов ред ═
  razdel = '3д · вносът';
  const prochetiVII = async (fayl: string): Promise<string> => {
    await p.goto(`${ADRES}#/ii`);
    await p.waitForSelector('[data-kniga-vnos]');
    await p.setInputFiles('[data-kniga-vnos]', fayl);
    await p.waitForFunction(() =>
      /предложения/.test(document.querySelector('[data-otchet-vest]')?.textContent ?? ''),
    );
    return tekstNa(p, '[data-otchet-vest]');
  };
  proveri(
    'същата Книга · нула предложения',
    await prochetiVII(pat),
    '0 предложения · 0 находки · 0 бележки',
  );
  const listove = kniga.listove.map(opisOtProcheten);
  const upr = listove.find((l) => l.ime === UPRAVLENIE)!;
  const redove = upr.redove as (string | number | null)[][];
  const rg = redove.findIndex(
    (r) => String(r[19] ?? '').startsWith('grupa:imot:') && r[1] === 'Гара Яна',
  );
  const nov: (string | number | null)[] = [];
  nov[4] = 'Среща / Брокер';
  redove.splice(rg + 1, 0, nov);
  writeFileSync(S_ZADACHA, await napishiKniga(listove));
  proveri(
    'дописана задача без ключ под Гара Яна · едно предложение',
    await prochetiVII(S_ZADACHA),
    '1 предложения · 0 находки · 0 бележки',
  );
  proveri(
    'нов ред · Нова задача: към Гара Яна · Вид Среща · име Брокер',
    (
      await tekstoveNa(
        p,
        '[data-predlozheniya] tr.red td:nth-child(5), [data-predlozheniya] tr.red td:nth-child(6)',
      )
    ).join(' · '),
    'нов ред · Нова задача: към Гара Яна · Вид Среща · име Брокер.',
  );
  await p.click('[data-priemi]');
  await p.waitForFunction(() =>
    /разписката е (записана|отказана)/.test(
      document.querySelector('[data-vnos-vest]')?.textContent ?? '',
    ),
  );
  proveri(
    'приета',
    (await tekstNa(p, '[data-vnos-vest]')).startsWith('приети 1 от 1 избрани'),
    true,
  );
  await p.goto(`${ADRES}#/upravlenie`);
  await p.waitForFunction(() =>
    document.querySelector('[data-sverka="darvo"]')?.textContent?.startsWith('видими 5 от 5'),
  );
  proveri(
    'Управление · две задачи под Гара Яна · отворени 2',
    `${await tekstNa(p, '[data-sverka="darvo"]')} · ${await tekstNa(p, '[data-tsifra="otvoreni"]')}`,
    'видими 5 от 5 · родители 3 · задачи 2 · сираци 0 · 2',
  );
}
