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
    'Програмата за Задачи го носи · без колона за изпълнител, и това се КАЗВА',
    `${(await tekstNa(p, '[data-reshetka="programa"] tbody tr')).includes('Помощникът')} · ${(
      await tekstNa(p, '[data-programa-vest]')
    ).includes('чака негова дума')}`,
    'true · true',
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
