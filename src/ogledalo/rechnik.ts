/**
 * РЕЧНИКЪТ · текст ↔ цяло число, за да живее текстът в `Int32Array`.
 *
 * Кодът 0 е ПРАЗНОТО и е закован: празна клетка в текстова колона се чете
 * без справка. Кодовете растат с появата на нов текст и не се преизползват.
 */
export class Rechnik {
  readonly #kodove = new Map<string, number>([['', 0]]);
  readonly #teksti: string[] = [''];

  kod(tekst: string): number {
    const ima = this.#kodove.get(tekst);
    if (ima !== undefined) return ima;
    const nov = this.#teksti.length;
    this.#teksti.push(tekst);
    this.#kodove.set(tekst, nov);
    return nov;
  }

  tekst(kod: number): string {
    return this.#teksti[kod] ?? '';
  }

  get broy(): number {
    return this.#teksti.length;
  }
}
