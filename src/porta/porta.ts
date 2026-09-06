/**
 * ПОРТАТА · единственото, което екранът, Книгата и агентът виждат (K2 · K3).
 *
 * Две лица на едно нещо: `PortaZaChetene` чете, пробва и слуша — и НЯМА
 * `izpalni`; агентът (резен 7) получава само нея, и типът е това, което го
 * гарантира (K3: никой агент не пише сам). `Porta` добавя записа и
 * крана. Реализацията е една — `izpalnitel.ts`.
 */

import type { Buton, Otkaz } from '../komandi/izpalnenie.js';
import type { OpisNaKomanda } from '../komandi/katalog.js';
import type { Izbran, Predvaritelno } from '../komandi/komanda.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import type { Sverka } from '../yadro/sverka.js';

export type { Buton, Otkaz } from '../komandi/izpalnenie.js';
export type { OpisNaKomanda } from '../komandi/katalog.js';
export type { Izbran, Predvaritelno } from '../komandi/komanda.js';

export interface RezultatNaIzpalnenie {
  readonly komandaId: string;
  readonly seqove: readonly number[];
  /** същият ключ на действие втори път · нищо ново не е записано */
  readonly povtoreno: boolean;
  readonly sverka: Sverka;
}

export interface PortaZaChetene {
  ogledalo(): Ogledalo;
  katalog(): readonly OpisNaKomanda[];
  butoniZa(prozorets: string, izbran?: Izbran): readonly Buton[];
  /** пробва, без да пише · същият резултат при същото Огледало и същия товар */
  probvay(komandaId: string, klyuch: string, tovar: unknown): Predvaritelno | Otkaz;
  /** вика слушателя при всяко ново Огледало · връща отписването */
  abonirai(slushatel: (o: Ogledalo) => void): () => void;
}

export interface Porta extends PortaZaChetene {
  /**
   * Изпълнява · повтаря `probvay` и сравнява отпечатъка с очаквания, ако е даден.
   * Повторен `komandaId` връща същото; същият с друг товар се отказва.
   */
  izpalni(
    komandaId: string,
    klyuch: string,
    tovar: unknown,
    ochakvanOtpechatak?: string,
  ): Promise<RezultatNaIzpalnenie | Otkaz>;
  /** пресгъва от Дневника · след Сторно, след внос, при „Провери" */
  prezaredi(): Promise<void>;
  zatvori(prichina: string): void;
  otvori(): void;
}
