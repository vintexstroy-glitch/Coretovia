import { readFileSync } from 'node:fs';
import { prochetiKniga } from '../../src/kniga/ooxml.ts';
import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { tekstNa, tekstoveNa } from '../yadro/pomoshtni.ts';
import { mesetsatNaProhoda } from '../yadro/kalendar.ts';
import { ADRES } from '../yadro/server.ts';

const SMETKI = 'Сметки';
/**
 * Месецът е ТЕКУЩИЯТ, не закован.
 *
 * „2026-09" щеше да спре да работи след 01.11.2026: листът Сметки реже
 * колоните си от предишния месец нататък, тъй че старият месец излиза извън
 * прозореца и „■" не се пише никъде (ADR-015).
 */
const MESETS = mesetsatNaProhoda();
/** еврото по нормата му · тясна пауза (U+202F) */
const EVRO_500 = '500,00 €';
const EVRO_MINUS_500 = '-500,00 €';

/** 5 · подтаб НАП · ДДС по месеци · редът в Сметки · таблицата с находки */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // ══ 5а · подтабът · ДДС за месеца ════════════════════════════════════
  razdel = '5а · подтаб НАП';
  await p.goto(`${ADRES}#/smetki`);
  await p.waitForSelector('[data-podtabove]');
  proveri(
    'два подтаба · Сметки и НАП (негово, 05.09 т.2)',
    (await tekstoveNa(p, '[data-podtab]')).join(' · '),
    'Сметки · НАП',
  );
  await p.click('[data-podtab="nap"]');
  await p.waitForSelector('[data-dds-forma]');
  proveri(
    'НАП казва, че няма връзка с НАП · и че Микроинвест чака мостра',
    (await tekstNa(p, '[data-nap-obobshtenie]')).includes('Няма връзка с НАП'),
    true,
  );
  await p.fill('[data-dds-mesets]', MESETS);
  await p.fill('[data-dds-nachislen]', '900');
  await p.fill('[data-dds-kredit]', '400');
  await p.fill('[data-dds-deklarirano]', '500');
  await p.fill('[data-dds-plateno]', '500');
  await p.click('[data-dds-zapishi]');
  await p.waitForSelector('[data-reshetka="dds"] tr.red');
  proveri(
    'дължимото се СМЯТА · начислен − кредит',
    await tekstNa(p, `[data-dalzhimo="${MESETS}"]`),
    EVRO_500,
  );
  proveri(
    'остатъкът е нула · платено = дължимо',
    await tekstNa(p, `[data-ostatak="${MESETS}"]`),
    '0,00 €',
  );
  proveri('натрупването отдолу', await tekstNa(p, '[data-dds-dalzhimo]'), EVRO_500);

  // ══ 5б · находките от сверките ═══════════════════════════════════════
  razdel = '5б · находките';
  await p.fill('[data-dds-deklarirano]', '450');
  await p.click('[data-dds-zapishi]');
  // чака се САМАТА нова находка · таблицата вече я има от друга проверка, и
  // изчакване за нея би прочело старото състояние (честност · обход Е)
  await p.waitForFunction(() =>
    (document.querySelector('[data-nap-nahodki]')?.textContent ?? '').includes('dds-deklarirano'),
  );
  // ЕДИН прочит на целия ред · две четения от две колони могат да паднат между
  // тях в ново рисуване и да сверят различни състояния
  const redoveNaNahodkite = await tekstoveNa(p, '[data-nap-nahodki] tbody tr');
  const redNaDdsa = redoveNaNahodkite.find((r) => r.includes('dds-deklarirano')) ?? '';
  proveri(
    'находка на ниво ДДС · декларираното не е дължимото',
    `${redNaDdsa.startsWith('ДДС')} · ${redNaDdsa.includes('дължимо 500 ≠ декларирано 450')}`,
    'true · true',
  );
  proveri(
    'полето горе брои находките · ТОЧНО колкото са редовете в таблицата',
    Number(await tekstNa(p, '[data-tsifra="nap-nahodki"]')),
    redoveNaNahodkite.length,
  );

  // ══ 5в · редът на ДДС влиза в Сметки и в резултата ═══════════════════
  razdel = '5в · ДДС в Сметки';
  await p.click('[data-podtab="smetki"]');
  await p.waitForSelector('[data-reshetka="razhod"]');
  proveri(
    'ДДС стои в Разходи · за внасяне',
    (await tekstNa(p, '[data-reshetka="razhod"] tr.red.dds')).includes('за внасяне'),
    true,
  );
  proveri('сборът на ДДС е с минус', await tekstNa(p, '[data-sbor-dds="razhod"]'), EVRO_MINUS_500);
  // платено 500 = дължимо 500 · остатъкът е нула, и това се вижда горе
  proveri('ДДС остатък горе', await tekstNa(p, '[data-tsifra="dds-ostatak"]'), '0,00 €');

  // ══ 5г · Книгата носи блока ДДС · и се чете обратно ══════════════════
  razdel = '5г · Книгата';
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
  const k = kniga.listove.find((l) => l.ime === SMETKI)?.kletki ?? [];
  const redVKnigata = k.find((r) => String(r[23] ?? '').startsWith('dds:'));
  proveri(
    'блокът ДДС е в листа · с месеца и числата му',
    `${redVKnigata?.[0]} · ${redVKnigata?.[1]} · ${redVKnigata?.[2]}`,
    '2026-09 · 900 · 400',
  );
  await p.goto(`${ADRES}#/ii`);
  await p.waitForSelector('[data-kniga-vnos]');
  await p.setInputFiles('[data-kniga-vnos]', pat);
  await p.waitForFunction(() =>
    /предложения/.test(document.querySelector('[data-otchet-vest]')?.textContent ?? ''),
  );
  proveri(
    'износ → внос = нула · и с ДДС',
    await tekstNa(p, '[data-otchet-vest]'),
    '0 предложения · 0 находки · 0 бележки',
  );
}
