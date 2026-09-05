/**
 * Хеш за браузъра — същият договор, друга реализация.
 *
 * Портът `Sha256` е нарочно асинхронен, за да може тук да стои Web Crypto,
 * а в Node — `node:crypto`. Вратата не знае разликата.
 */

import type { Sha256 } from '../yadro/hash.js';

export const sha256Web: Sha256 = async (danni) => {
  const baytove = new TextEncoder().encode(danni);
  const digest = await crypto.subtle.digest('SHA-256', baytove);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

/** Хеш на БАЙТОВЕ · за отпечатъка на качен файл · същият алгоритъм, друг вход. */
export async function sha256NaBaytove(baytove: Uint8Array | ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', baytove as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
