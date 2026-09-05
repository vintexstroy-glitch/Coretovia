/**
 * ПРОХОД ПРЕЗ БРАУЗЪРА — целият път, в истински Chromium (пренесен рънър).
 *
 * Не проверява какво връща кодът, а какво ПИШЕ НА ЕКРАНА. Всяко очакване е низ,
 * както го чете човек. Пуска се с `npm run proba`; пада с ненулев код и
 * изброява всяко разминаване. Тук е само рънърът — разделите живеят в
 * `razdeli/` и се викат в реда, в който състоянието тече между тях.
 */

import { chromium, nameriHroma } from '../stroezh/hrom.mjs';
import { Broyach } from './yadro/proverka.ts';
import type { KonteksNaProhoda } from './yadro/kontekst.ts';
import { pusniServer, pochakaySurvara, spriServer } from './yadro/server.ts';
import { tishina } from './yadro/tishina.ts';

import * as imoti from './razdeli/imoti.ts';
import * as skelet from './razdeli/skelet.ts';

async function main(): Promise<void> {
  const server = pusniServer();
  await pochakaySurvara();

  const brauzar = await chromium.launch({ executablePath: nameriHroma() });
  const stranitsa = await brauzar.newPage();

  const greshkiVKonzolata: string[] = [];
  stranitsa.on('pageerror', (e) => greshkiVKonzolata.push(`pageerror: ${e.message}`));
  stranitsa.on('console', (m) => {
    if (m.type() === 'error' && !tishina.ochakvana) greshkiVKonzolata.push(`console: ${m.text()}`);
  });

  const broyach = new Broyach();
  const ctx: KonteksNaProhoda = { stranitsa, broyach };

  try {
    await skelet.blok1(ctx);
    await imoti.blok1(ctx);
  } catch (greshka) {
    broyach.dobaviNahodka({
      razdel: broyach.posledenRazdel,
      kakvo: 'проходът се спъна',
      vidyano: String(greshka).split('\n')[0] ?? String(greshka),
      ochakvano: 'да мине',
    });
    console.log(`\n  ЦЯЛАТА ГРЕШКА:\n  ${String(greshka).replace(/\n/g, '\n  ')}\n`);
    const naEkrana = await stranitsa
      .evaluate(() => document.getElementById('ekran')?.innerText?.slice(0, 1500) ?? 'няма екран')
      .catch(() => 'екранът не се чете');
    console.log(`\n  НА ЕКРАНА В МИГА НА СПЪВАНЕТО:\n  ${naEkrana.replace(/\n/g, '\n  ')}\n`);
    // Белезите, които казват най-много при спъване: сверките, грешката, менюто.
    const belezi = await stranitsa
      .evaluate(() =>
        [
          ...document.querySelectorAll(
            '[data-sverka], [data-greshka], [data-iznos-vest], [data-menyu], .chernova',
          ),
        ]
          .map(
            (e) =>
              `${e.tagName.toLowerCase()} ${[...e.attributes].map((a) => `${a.name}=${a.value}`).join(' ')} → ${(e as HTMLElement).innerText?.trim().slice(0, 200)}`,
          )
          .join('\n'),
      )
      .catch(() => 'белезите не се четат');
    console.log(`\n  БЕЛЕЗИТЕ:\n  ${belezi.replace(/\n/g, '\n  ')}\n`);
    console.log(`\n  КОНЗОЛАТА ДОТУК:\n  ${greshkiVKonzolata.join('\n  ') || 'чиста'}\n`);
    await stranitsa.screenshot({ path: 'proba/spanal.png', fullPage: true }).catch(() => {});
  }

  broyach.proveri('—', 'конзолата е чиста', greshkiVKonzolata.join(' | ') || 'чиста', 'чиста');

  await brauzar.close();
  try {
    spriServer(server);
  } catch {
    /* вече е спрян */
  }

  console.log(`\nМинали: ${broyach.minali.length}`);
  if (broyach.nahodki.length === 0) {
    console.log('НАХОДКИ: няма. Проходът мина целия път.\n');
    process.exit(0);
  }
  console.log(`\nНАХОДКИ (${broyach.nahodki.length}):\n`);
  for (const n of broyach.nahodki) {
    console.log(`  ✗ [${n.razdel}] ${n.kakvo}`);
    console.log(`      чакано: ${n.ochakvano}`);
    console.log(`      видяно: ${n.vidyano}\n`);
  }
  process.exit(1);
}

await main();
