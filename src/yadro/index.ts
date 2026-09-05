/**
 * ЯДРОТО · Журнал + Врата · пренесено дословно от MasterBook (ADR-001).
 *
 * Носител-агностично: същият договор върви в паметта, върху IndexedDB и върху
 * бъдещ сървър. Самоличността (вход без парола) и жетонът НЕ са тук — те
 * ЧАКАТ входа, който идва при пазара, и ще влязат в свой модул, не в ядрото.
 */

export * from './pari.js';
export * from './data.js';
export * from './sabitie.js';
export * from './hash.js';
export * from './dnevnik.js';
export * from './pravata.js';
export * from './vrata.js';
export * from './sverka.js';
export * from './kotva.js';
