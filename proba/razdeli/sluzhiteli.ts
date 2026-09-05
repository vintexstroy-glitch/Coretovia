import { readFileSync } from 'node:fs';
import { prochetiKniga } from '../../src/kniga/ooxml.ts';
import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { tekstNa, tekstoveNa } from '../yadro/pomoshtni.ts';
import { ADRES } from '../yadro/server.ts';

const LIST = 'Служители';
const STOPANINAT = 'proba@example.bg';
const POMOSHTNIK = 'pomoshtnik@example.bg';

/** 6 · Служители · четирите му блока · достъпът на Длъжността · Профилът */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // ══ 6а · екранът · неговите четири блока и петте базови реда ═════════
  razdel = '6а · листът Служители';
  await p.goto(`${ADRES}#/sluzhiteli`);
  await p.waitForSelector('[data-reshetka="dostap"]');
  proveri(
    'четирите му ленти, в неговия ред',
    (await tekstoveNa(p, 'section[data-blok] h2.lenta')).join(' · '),
    'Стопани свързани с Coretovia · Служители свързани с Coretovia · Достъп на Длъжности за Служител · Програма за Задачи на Служители',
  );
  proveri(
    'неговото B14 стои НАД лентата на Достъпа',
    await tekstNa(p, '[data-blok="dostap"] .dumite'),
    'Създаване на Длъжност с достъп',
  );
  proveri(
    'петте базови реда на Достъпа се ВИЖДАТ',
    (await tekstoveNa(p, '[data-bazov]')).length,
    5,
  );
  proveri(
    'първият базов ред е неговият · Стопанин, който редактира всичко',
    await tekstNa(p, '[data-bazov="Стопанин"]'),
    'Стопанин\tРедактира всичко\tРедактира всичко\tРедактира всичко\tРедактира всичко',
  );
  proveri(
    'казва се, че записаният ред бие базовия',
    (await tekstNa(p, '[data-bazovi-vest]')).includes(
      'запише ли се ред за същата Длъжност, той бие',
    ),
    true,
  );
  proveri(
    'без ред в таблиците · това се КАЗВА (правило 12)',
    (await tekstNa(p, '[data-dlazhnostta-mi]')).startsWith('Ти още нямаш ред'),
    true,
  );

  // ══ 6б · Стопанинът и Служителят · през чернова ══════════════════════
  razdel = '6б · хората';
  await p.click('[data-buton="sluzhiteli.dobaviStopan"]');
  await p.waitForSelector('[data-chernova="stopani"] input[data-kolona="ime"]');
  await p.fill('[data-chernova="stopani"] input[data-kolona="ime"]', 'Стопанинът на Книгата');
  await p.fill('[data-chernova="stopani"] input[data-kolona="imeyl"]', STOPANINAT);
  await p.selectOption('[data-chernova="stopani"] select[data-kolona="dlazhnost"]', '1');
  await p.press('[data-chernova="stopani"] input[data-kolona="ime"]', 'Enter');
  await p.waitForSelector('tr.red[data-tablitsa="stopani"]');
  proveri(
    'Стопанинът е № 1 · с Длъжност от номенклатурата',
    await tekstNa(p, 'tr.red[data-tablitsa="stopani"] td[data-kolona="dlazhnost"]'),
    'Стопанин',
  );
  proveri(
    'имейлът вече дава Длъжност на онзи, който пише',
    await tekstNa(p, '[data-dlazhnostta-mi]'),
    'Ти си Стопанин.',
  );
  proveri(
    'кой раздава Длъжности се КАЗВА на екрана (негово, 05.09)',
    await tekstNa(p, '[data-koy-razdava]'),
    'Ти раздаваш Длъжности.',
  );

  await p.click('[data-buton="sluzhiteli.dobaviSluzhitel"]');
  await p.waitForSelector('[data-chernova="sluzhiteli"] input[data-kolona="ime"]');
  await p.fill('[data-chernova="sluzhiteli"] input[data-kolona="ime"]', 'Помощникът');
  await p.fill('[data-chernova="sluzhiteli"] input[data-kolona="imeyl"]', POMOSHTNIK);
  await p.selectOption('[data-chernova="sluzhiteli"] select[data-kolona="dlazhnost"]', '3');
  await p.press('[data-chernova="sluzhiteli"] input[data-kolona="ime"]', 'Enter');
  await p.waitForSelector('tr.red[data-tablitsa="sluzhiteli"]');
  proveri(
    'Служителят е записан с Длъжност Помощник Управител',
    await tekstNa(p, 'tr.red[data-tablitsa="sluzhiteli"] td[data-kolona="dlazhnost"]'),
    'Помощник Управител',
  );
  proveri(
    'Програмата за Задачи го носи · с нули, докато не му дадеш задача',
    `${(await tekstNa(p, '[data-reshetka="programa"] tbody tr:last-child')).includes('Помощникът')} · ${await p.$eval(
      '[data-reshetka="programa"] tbody tr:last-child',
      (e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
    )}`,
    'true · 2 Помощникът 0 0',
  );

  // ══ 6в · Длъжност с достъп · записаният ред бие базовия ══════════════
  razdel = '6в · Достъпът';
  await p.click('[data-buton="sluzhiteli.dobaviDlazhnost"]');
  await p.waitForSelector('[data-chernova="dostap"] select[data-kolona="dlazhnost"]');
  await p.selectOption('[data-chernova="dostap"] select[data-kolona="dlazhnost"]', '3');
  await p.fill('[data-chernova="dostap"] input[data-kolona="tabove"]', 'Вижда всичко');
  await p.fill('[data-chernova="dostap"] input[data-kolona="hedari"]', 'Вижда само всичко');
  await p.fill('[data-chernova="dostap"] input[data-kolona="redove"]', 'Вижда само всичко');
  await p.fill('[data-chernova="dostap"] input[data-kolona="zhurnal"]', 'Вижда само всичко');
  await p.press('[data-chernova="dostap"] input[data-kolona="tabove"]', 'Enter');
  await p.waitForSelector('tr.red[data-tablitsa="dostap"]');
  proveri(
    'записаният ред ИЗМЕСТВА базовия · базовите падат на четири',
    (await tekstoveNa(p, '[data-bazov]')).length,
    4,
  );
  proveri(
    'и точно неговата Длъжност вече не е базова',
    await p.$('[data-bazov="Помощник Управител"]'),
    null,
  );

  // ══ 6в2 · Отговорникът на задачата · и Програмата, която го брои ═════
  razdel = '6в2 · Отговорникът';
  const bezOtgovornikPredi = await tekstNa(p, '[data-programa-vest]');
  proveri(
    'докато никой не носи задача, това се КАЗВА',
    bezOtgovornikPredi.includes('БЕЗ отговорник'),
    true,
  );
  await p.goto(`${ADRES}#/upravlenie`);
  await p.waitForSelector('tr.red.zadacha td[data-kolona="otgovornik"]');
  proveri(
    'колоната Отговорник стои в Управление · и е празна, докато не я попълниш',
    await tekstNa(p, 'tr.red.zadacha td[data-kolona="otgovornik"]'),
    '',
  );
  await p.dblclick('tr.red.zadacha td[data-kolona="otgovornik"]');
  await p.waitForSelector('tr.red.zadacha td[data-kolona="otgovornik"] select');
  const horaVMenyuto = await p.$$eval(
    'tr.red.zadacha td[data-kolona="otgovornik"] select option',
    (opts) => opts.map((o) => o.textContent?.trim() ?? '').join(' · '),
  );
  proveri(
    'падащото меню носи ХОРАТА от листа Служители, не Имоти',
    horaVMenyuto,
    '— · 1 · Стопанинът на Книгата · 1 · Помощникът',
  );
  await p.selectOption('tr.red.zadacha td[data-kolona="otgovornik"] select', {
    label: '1 · Помощникът',
  });
  await p.press('tr.red.zadacha td[data-kolona="otgovornik"] select', 'Enter');
  await p.waitForFunction(
    () =>
      (
        document.querySelector('tr.red.zadacha td[data-kolona="otgovornik"]')?.textContent ?? ''
      ).trim() === 'Помощникът',
  );
  proveri(
    'задачата вече носи отговорник',
    await tekstNa(p, 'tr.red.zadacha td[data-kolona="otgovornik"]'),
    'Помощникът',
  );

  await p.goto(`${ADRES}#/sluzhiteli`);
  await p.waitForSelector('[data-reshetka="programa"]');
  const redNaPomoshtnika = await p.$eval('[data-reshetka="programa"] tbody tr:last-child', (e) =>
    (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
  );
  proveri(
    'Програмата за Задачи вече БРОИ · неговите две числа, не тире',
    /^2 Помощникът \d+ \d+$/.test(redNaPomoshtnika),
    true,
  );
  proveri(
    'и броят задачи без отговорник падна с една',
    (await tekstNa(p, '[data-programa-vest]')) === bezOtgovornikPredi,
    false,
  );

  // ══ 6г · Профилът · Кой съм и какво ми дава Длъжността ═══════════════
  razdel = '6г · Лични Данни';
  await p.goto(`${ADRES}#/profil`);
  await p.waitForSelector('[data-sektsiya="lichni"]');
  proveri('имейлът, с който пиша', await tekstNa(p, '[data-imeylat-mi]'), STOPANINAT);
  proveri('Длъжността ми', await tekstNa(p, '[data-dlazhnostta-mi]'), 'Длъжност: Стопанин');
  proveri(
    'четирите оси на достъпа · с неговите глави и думата на правото',
    (await tekstoveNa(p, '[data-dostapa-mi] tbody tr')).join(' | '),
    'достъп до табове без Журнал\tРедактира\tРедактира всичко | достъп до хедъри\tРедактира\tРедактира всичко | достъп до Секци Редове\tРедактира\tРедактира всичко | Таб Журнал\tРедактира\tРедактира всичко',
  );

  // ══ 6д · правото стеснява „Вкарване" на Сметки ══════════════════════
  razdel = '6д · Вкарване';
  await p.goto(`${ADRES}#/smetki`);
  await p.waitForSelector('[data-vkarvane-pravo]');
  proveri(
    'Стопанинът вкарва · и екранът го КАЗВА (правило 23)',
    await tekstNa(p, '[data-vkarvane-pravo]'),
    'Имаш право да вкарваш тук.',
  );

  // ══ 6е · Книгата носи листа · и се чете обратно без предложения ══════
  razdel = '6е · Книгата';
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
  const k = kniga.listove.find((l) => l.ime === LIST)?.kletki ?? [];
  const redNaSluzhitelya = k.find((r) => String(r[1] ?? '') === 'Помощникът');
  proveri(
    'Служителят стои в листа · с имейла и Длъжността си',
    `${redNaSluzhitelya?.[3]} · ${redNaSluzhitelya?.[5]}`,
    `${POMOSHTNIK} · Помощник Управител`,
  );
  const bazovVKnigata = k.find((r) => String(r[1] ?? '') === 'Наблюдател');
  proveri(
    'базовият ред отива в Книгата БЕЗ ключ · картина, не данни',
    `${String(bazovVKnigata?.[2] ?? '')} · ${String(bazovVKnigata?.[6] ?? '')}`,
    'Вижда всичко · ',
  );
  await p.goto(`${ADRES}#/ii`);
  await p.waitForSelector('[data-kniga-vnos]');
  await p.setInputFiles('[data-kniga-vnos]', pat);
  await p.waitForFunction(() =>
    /предложения/.test(document.querySelector('[data-otchet-vest]')?.textContent ?? ''),
  );
  proveri(
    'износ → внос = нула · базовите редове НЕ се предлагат наново',
    await tekstNa(p, '[data-otchet-vest]'),
    '0 предложения · 0 находки · 0 бележки',
  );
}
