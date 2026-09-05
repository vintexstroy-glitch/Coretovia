/**
 * ОБЩОТО НА ЕКРАНИТЕ · пренесено от MasterBook (`app/obshto.ts`) · само трите
 * помощника, които резен 1 ползва: екраниране, сваляне на файл, безопасно име.
 *
 * Тук няма нито един ред за домейн и нито едно състояние. Този файл не знае
 * за екрани, екраните знаят за него.
 */

/** Всичко, написано от човек, минава оттук, преди да влезе в HTML. */
export function ekraniraj(tekst: string): string {
  return tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * СВАЛЯНЕ НА ФАЙЛ · единственият дом на танца Blob → адрес → връзка → клик.
 * Беше преписан три пъти (в main два, в Стойност един) — три места за един теч.
 */
export function svaliFayl(fayl: Blob, ime: string): void {
  const adres = URL.createObjectURL(fayl);
  const vruzka = document.createElement('a');
  vruzka.href = adres;
  vruzka.download = ime;
  vruzka.click();
  URL.revokeObjectURL(adres);
}
