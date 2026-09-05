import { readFileSync } from 'node:fs';
import { prochetiKniga } from '../../src/kniga/ooxml.ts';
import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { tekstNa, tekstoveNa } from '../yadro/pomoshtni.ts';
import { ADRES } from '../yadro/server.ts';

const LIST = 'Продажби';
/** еврото по нормата му · тясна пауза (U+202F) */
const EVRO_101400 = '101\u202F400,00\u202F€';
const EVRO_NULA = '0,00\u202F€';

/** 7 · Продажби · двете му таблици · проверката се СМЯТА · състоянието */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // ══ 7а · екранът · двете му таблици с лентите му ═════════════════════
  razdel = '7а · двете таблици';
  await p.goto(`${ADRES}#/prodazhbi`);
  await p.waitForSelector('[data-reshetka="prodazhbi"]');
  const lenti = await tekstoveNa(p, 'section[data-blok] h2.lenta');
  proveri(
    'двете му ленти · първата сграда и втората, дословно',
    `${lenti[0]?.includes('Студентски град')} · ${lenti[1]?.includes('Малинова долина')}`,
    'true · true',
  );
  proveri(
    'празната таблица не е завършена · тя е ПРАЗНА, и това се казва',
    (await tekstNa(p, '[data-sastoyanie="prodazhbi"]')).startsWith('празна'),
    true,
  );
  proveri(
    'двайсетте му глави на първата таблица · с проверката накрая',
    (await tekstoveNa(p, '[data-reshetka="prodazhbi"] thead th')).slice(-3).join(' · '),
    'АКТ 16 · проверка банка · проверка кеш',
  );
  proveri(
    'втората таблица носи евро/квадрат, а първата — не',
    `${(await tekstoveNa(p, '[data-reshetka="prodazhbi"] thead th')).includes('евро/квадрат')} · ${(
      await tekstoveNa(p, '[data-reshetka="prodazhbi2"] thead th')
    ).includes('евро/квадрат')}`,
    'false · true',
  );

  // ══ 7б · продажба, платена докрай · проверката става нула ════════════
  razdel = '7б · платената продажба';
  await p.click('[data-buton="prodazhbi.dobaviParva"]');
  const ch = '[data-chernova="prodazhbi"]';
  await p.waitForSelector(`${ch} input[data-kolona="apartament"]`);
  await p.fill(`${ch} input[data-kolona="apartament"]`, 'апарт. № 1');
  await p.fill(`${ch} input[data-kolona="kvadratura"]`, '84,50');
  await p.fill(`${ch} input[data-kolona="tsena"]`, '101 400');
  await p.fill(`${ch} input[data-kolona="tsenaBanka"]`, '40 000');
  await p.fill(`${ch} input[data-kolona="tsenaSmr"]`, '61 400');
  await p.fill(`${ch} input[data-kolona="pdBanka"]`, '20 000');
  await p.fill(`${ch} input[data-kolona="pdSmr"]`, '30 000');
  await p.fill(`${ch} input[data-kolona="nsBanka"]`, '20 000');
  await p.fill(`${ch} input[data-kolona="nsSmr"]`, '31 400');
  await p.press(`${ch} input[data-kolona="apartament"]`, 'Enter');
  await p.waitForSelector('tr.red[data-tablitsa="prodazhbi"]');
  proveri(
    'цената е цели центове · по нормата на еврото',
    await p.$eval(
      'tr.red[data-tablitsa="prodazhbi"] td[data-kolona="tsena"]',
      (e) => `${(e as HTMLElement).dataset['st']} · ${e.textContent?.trim()}`,
    ),
    `10140000 · ${EVRO_101400}`,
  );
  proveri(
    'квадратурата се пази в цели кв. см · показва се в кв. м',
    await p.$eval(
      'tr.red[data-tablitsa="prodazhbi"] td[data-kolona="kvadratura"]',
      (e) => `${(e as HTMLElement).dataset['surovo'] ?? ''} · ${e.textContent?.trim()}`,
    ),
    '845000 · 84,50',
  );
  proveri(
    'двете проверки са НУЛА · продажбата е платена',
    `${await tekstNa(p, 'tr.red[data-tablitsa="prodazhbi"] td[data-kolona="proverkaBanka"]')} · ${await tekstNa(
      p,
      'tr.red[data-tablitsa="prodazhbi"] td[data-kolona="proverkaKesh"]',
    )}`,
    `${EVRO_NULA} · ${EVRO_NULA}`,
  );
  proveri(
    'таблицата ЗАВЪРШИ · всичко е платено (негово, 05.09)',
    (await tekstNa(p, '[data-sastoyanie="prodazhbi"]')).startsWith('ЗАВЪРШЕНА'),
    true,
  );
  proveri(
    'полетата горе · една продажба, цената, внесеното и остатъкът',
    `${await tekstNa(p, '[data-tsifra="broy"]')} · ${await tekstNa(p, '[data-tsifra="tsena"]')} · ${await tekstNa(p, '[data-tsifra="ostatak"]')}`,
    `1 · ${EVRO_101400} · ${EVRO_NULA}`,
  );

  // ══ 7в · липсваща вноска · таблицата става АКТИВНА ═══════════════════
  razdel = '7в · активната таблица';
  await p.dblclick('tr.red[data-tablitsa="prodazhbi"] td[data-kolona="nsSmr"]');
  await p.fill('tr.red[data-tablitsa="prodazhbi"] td[data-kolona="nsSmr"] input', '11 400');
  await p.press('tr.red[data-tablitsa="prodazhbi"] td[data-kolona="nsSmr"] input', 'Enter');
  await p.waitForFunction(() =>
    (document.querySelector('[data-sastoyanie="prodazhbi"]')?.textContent ?? '').startsWith(
      'АКТИВНА',
    ),
  );
  proveri(
    'проверката кеш вече НЕ е нула · остатъкът се вижда',
    await tekstNa(p, 'tr.red[data-tablitsa="prodazhbi"] td[data-kolona="proverkaKesh"]'),
    '20\u202F000,00\u202F€',
  );
  proveri(
    'а проверката банка си остава нула · страните са две',
    await tekstNa(p, 'tr.red[data-tablitsa="prodazhbi"] td[data-kolona="proverkaBanka"]'),
    EVRO_NULA,
  );
  proveri(
    'таблицата чака плащания',
    (await tekstNa(p, '[data-sastoyanie="prodazhbi"]')).startsWith('АКТИВНА · чака плащания'),
    true,
  );

  // ══ 7г · втората сграда · цената следва от евро/квадрат ══════════════
  razdel = '7г · евро/квадрат';
  await p.click('[data-buton="prodazhbi.dobaviVtora"]');
  const ch2 = '[data-chernova="prodazhbi2"]';
  await p.waitForSelector(`${ch2} input[data-kolona="apartament"]`);
  await p.fill(`${ch2} input[data-kolona="apartament"]`, 'апартамент № 3');
  await p.fill(`${ch2} input[data-kolona="kvadratura"]`, '63,31');
  await p.fill(`${ch2} input[data-kolona="evroKvadrat"]`, '2 000');
  await p.fill(`${ch2} input[data-kolona="tsena"]`, '126 620');
  await p.fill(`${ch2} input[data-kolona="tsenaBanka"]`, '50 000');
  await p.fill(`${ch2} input[data-kolona="tsenaSmr"]`, '76 620');
  await p.fill(`${ch2} input[data-kolona="pdBanka"]`, '25 000');
  await p.fill(`${ch2} input[data-kolona="pdKesh"]`, '38 310');
  await p.fill(`${ch2} input[data-kolona="nsBanka"]`, '25 000');
  await p.fill(`${ch2} input[data-kolona="nsKesh"]`, '38 310');
  await p.press(`${ch2} input[data-kolona="apartament"]`, 'Enter');
  await p.waitForSelector('tr.red[data-tablitsa="prodazhbi2"]');
  proveri(
    'втората таблица завърши · и редът ѝ е платен',
    (await tekstNa(p, '[data-sastoyanie="prodazhbi2"]')).startsWith('ЗАВЪРШЕНА'),
    true,
  );
  proveri(
    'редът ОБЩО евро под таблицата · сборът по колона',
    await tekstNa(p, '[data-reshetka="prodazhbi2"] tfoot [data-obshto="tsena"]'),
    '126\u202F620,00\u202F€',
  );

  // ══ 7д · Книгата носи листа · и се чете обратно без предложения ══════
  razdel = '7д · Книгата';
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
  const kniga = await prochetiKniga(readFileSync(pat));
  const k = kniga.listove.find((l) => l.ime === LIST)?.kletki ?? [];
  const red = k.find((r) => String(r[0] ?? '') === 'апарт. № 1');
  proveri(
    'редът стои в листа · цената и сметнатата проверка',
    `${red?.[8]} · ${red?.[19]}`,
    '101400 · 20000',
  );
  const obshto = k.find((r) => String(r[0] ?? '') === 'ОБЩО евро');
  proveri('неговият ред ОБЩО евро е в Книгата', obshto?.[8], 101400);
  await p.goto(`${ADRES}#/ii`);
  await p.waitForSelector('[data-kniga-vnos]');
  await p.setInputFiles('[data-kniga-vnos]', pat);
  await p.waitForFunction(() =>
    /предложения/.test(document.querySelector('[data-otchet-vest]')?.textContent ?? ''),
  );
  proveri(
    'износ → внос = нула · проверките са сметка, не данни',
    await tekstNa(p, '[data-otchet-vest]'),
    '0 предложения · 0 находки · 0 бележки',
  );
}
