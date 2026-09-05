/**
 * ПЕЧАТЪТ · вписва имената на построените файлове в служебния работник.
 *
 * Vite слага хеш в имената (`index-B1f70MVw.css`), затова работникът не може
 * да ги знае предварително. Скриптът чете `dist/` СЛЕД build и ги впечатва.
 * Версията е отпечатък на самото съдържание: не се ли е сменило нищо, кешът
 * не се сменя и телефонът не тегли пак.
 *
 * Пренесен от MasterBook без азбучните пакети — шрифтовете са системни.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// `fileURLToPath`, а НЕ `.pathname` (урок ADR-152 на MasterBook).
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

function vsichkiFaylove(papka = DIST) {
  const namereni = [];
  for (const vpis of readdirSync(papka)) {
    const pat = join(papka, vpis);
    if (statSync(pat).isDirectory()) namereni.push(...vsichkiFaylove(pat));
    else if (vpis !== 'sw.js') namereni.push(pat);
  }
  return namereni;
}

const vsichki = vsichkiFaylove().sort();
const adres = (f) => `./${relative(DIST, f).replace(/\\/g, '/')}`;

/**
 * СВЪРЗВАЩИТЕ ЧАСТИ НЕ ВЛИЗАТ В ДЖОБА · офлайн изданието не ги НОСИ.
 * Днес списъкът е празен; всеки бъдещ динамичен внос (Клод, Драйв) иска ред тук.
 */
const SVARZVASHTI = [];
const eSvarzvashto = (f) =>
  SVARZVASHTI.some((s) => new RegExp(`(^|/)assets/${s}-[^/]*\\.js$`).test(adres(f)));

const cherupka = vsichki.filter((f) => !eSvarzvashto(f)).map(adres);

const otpechatak = createHash('sha256');
for (const f of vsichki) otpechatak.update(readFileSync(f));
const versiya = otpechatak.digest('hex').slice(0, 12);

const pat = join(DIST, 'sw.js');
const izhod = readFileSync(pat, 'utf8')
  .replace('__VERSIYA__', versiya)
  .replace('__CHERUPKA__', JSON.stringify(['./', ...cherupka], null, 2));
writeFileSync(pat, izhod);

const kb = (fs) => (fs.reduce((s, f) => s + statSync(f).size, 0) / 1024).toFixed(1);
console.log(`  джобът: ${cherupka.length} файла · ${kb(vsichki)} KB · версия ${versiya}`);
