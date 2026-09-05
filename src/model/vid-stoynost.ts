/**
 * Видът на стойността в една колона · пренесен от MasterBook (ADR-014).
 *
 * Какво е една КОЛОНА — пари, процент, число, текст или дата — казва самата
 * колона, не цифрата в клетката (правило 3). Тук е само изборът от пет; какво
 * значи всеки за слота в събитието и за сбора, казва `kolona.ts`.
 */
const VIDOVE_STOYNOST = ['evro', 'protsent', 'chislo', 'tekst', 'data'] as const;

export type VidStoynost = (typeof VIDOVE_STOYNOST)[number];
