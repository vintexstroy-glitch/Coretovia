/**
 * СТЕНАТА · и кой я пази (резен 6н · ADR-020).
 *
 * Стената (`Content-Security-Policy` в `app/index.html`) държи всичко останало:
 * тя е причината `'self'` да значи нещо, тя носи Trusted Types, и тя е онова, до
 * което се свежда изречението „чужд код не тича на нашия адрес".
 *
 * И до днес **нищо не я пазеше**. Един ред, добавен по невнимание или от агент,
 * я отваря — и нито един тест, нито един обход не казва дума.
 *
 * ═══ ЗАЩО ЕДИН ПИН, А НЕ СПИСЪК ОТ ЗАБРАНИ ═══
 *
 * Списък от забрани („да няма `unsafe-inline`", „да няма `*`") изглежда
 * по-гъвкав и е по-слаб: той пуска `script-src 'self' https://chuzhdo.example`,
 * защото там няма нито една забранена дума. Пин върху ЦЕЛИЯ низ не пуска нищо —
 * всяка промяна, каквато и да е, се вижда ТУК и в диф, и иска дума защо.
 *
 * Правило 15 в друг вид: стена, чиято промяна не се забелязва, не е стена.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STRANITSATA = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');

/**
 * ЖИВИЯТ файл, не построеният. `dist/` е гитигнориран и не се строи при
 * `npm test` — тест, който гледа него, е зелен, защото не е гледал (обход Й).
 */
function stenata(): string {
  const m = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i.exec(STRANITSATA);
  return m === null ? '' : m[1]!.replace(/\s+/g, ' ').trim();
}

/** Точно това и нищо друго · всяка промяна минава оттук с дума защо. */
const PINAT = [
  "require-trusted-types-for 'script';",
  'trusted-types coretovia;',
  "default-src 'self';",
  "img-src 'self' data:;",
  "script-src 'self';",
  "style-src 'self';",
  "connect-src 'self' ws://localhost:* ws://127.0.0.1:*;",
  "worker-src 'self';",
  "object-src 'none';",
  "base-uri 'none';",
  "form-action 'none'",
].join(' ');

describe('стената', () => {
  it('мета-етикетът СЪЩЕСТВУВА · инак всичко по-долу е зелено на празно', () => {
    // обход Й, приложен тук: първо се твърди, че изобщо е намерено нещо
    expect(STRANITSATA.length).toBeGreaterThan(500);
    expect(stenata().length).toBeGreaterThan(100);
  });

  it('и е ТОЧНО тази · дума по дума', () => {
    expect(stenata()).toBe(PINAT);
  });

  it('Trusted Types е в сила, не само обявен', () => {
    // Директивата без `require-` е само списък от позволени политики — тя НЕ
    // изисква доверен тип. Двете вървят заедно и се проверяват заедно.
    expect(stenata()).toContain("require-trusted-types-for 'script'");
    expect(stenata()).toContain('trusted-types coretovia');
  });

  it('и НИЩО не тръгва навън · освен разработчика на локалния адрес', () => {
    /**
     * `connect-src` е единственият ред, който ще се промени, когато влезе
     * входът с доставчик или бутонът към Клод. Тогава всеки нов адрес се
     * ИЗБРОЯВА поименно тук — стена, отворена изобщо, е стена, свалена.
     *
     * Днес навън не тръгва нищо, и това се твърди, а не се подразбира.
     */
    const svarzvane = /connect-src ([^;]*)/.exec(stenata())?.[1] ?? '';
    expect(svarzvane.split(/\s+/).filter((x) => x !== '')).toEqual([
      "'self'",
      'ws://localhost:*',
      'ws://127.0.0.1:*',
    ]);
  });

  it('и се знае какво `<meta>` НЕ може · казано, вместо премълчано', () => {
    /**
     * `frame-ancestors`, `report-uri` и `sandbox` се ПРЕНЕБРЕГВАТ в `<meta>` —
     * такава е спецификацията. Тоест вграждането в чужда страница не се спира
     * оттук и няма как да се спре без сървър, който слага заглавки.
     *
     * Това НЕ е дупка днес: вграденото копие вижда РАЗДЕЛЕНО хранилище (празна
     * база, в която Вратата отказва всичко освен откриването). Но денят, в който
     * някой ги допише тук с вярата, че работят, трябва да падне ТУК.
     */
    for (const bezsmislena of ['frame-ancestors', 'report-uri', 'sandbox']) {
      expect(stenata(), `${bezsmislena} се пренебрегва в <meta>`).not.toContain(bezsmislena);
    }
  });
});
