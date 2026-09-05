/**
 * РЕДЪТ „ФИЛТЪР" · неговият ред под главите (B19:R19 на Управление) · екранен.
 *
 * Пише се дума под колона и остават редовете, в които клетката я СЪДЪРЖА —
 * без главни, в NFC (правило 11). Нула събития: филтърът е памет на екрана.
 * Скритото ПАК се смята там, където сборът е „върху всички"; тук се казва
 * кое е видимо, а сверката (правило 7) е видими + скрити = всички.
 *
 * Дървото: задача се вижда, ако минава сама; родител — ако минава сам ИЛИ
 * има видим ред под себе си (Обект под Имот · задача под Обект), защото
 * задача без родителя си на екрана няма адрес.
 */

export function svedi(tekst: string | null | undefined): string {
  // паметта на екрана минава през JSON: дупка в списъка става `null`, не дума
  return (tekst ?? '').normalize('NFC').trim().toLowerCase();
}

/** Дали думите на реда минават филтъра · всяка непразна дума трябва да се съдържа в своята колона. */
export function minavaFiltara(dumi: readonly string[], filtar: readonly string[]): boolean {
  for (const [j, tarseno] of filtar.entries()) {
    const t = svedi(tarseno);
    if (t === '') continue;
    if (!svedi(dumi[j] ?? '').includes(t)) return false;
  }
  return true;
}

export function eFiltarPrazen(filtar: readonly string[]): boolean {
  return filtar.every((f) => svedi(f) === '');
}

export interface RedZaFiltar {
  /** 0 = Имот · 1 = Обект/Бизнес · 2 = задача */
  readonly nivo: 0 | 1 | 2;
  readonly dumi: readonly string[];
}

export interface Filtrirano {
  /** индексите на видимите редове · в реда на дървото */
  readonly vidimi: readonly number[];
  readonly broyVidimi: number;
  readonly broySkriti: number;
}

/** Филтърът върху дървото · един проход отзад напред, за да знае родителят за децата си. */
export function filtrirayDarvoto(
  redove: readonly RedZaFiltar[],
  filtar: readonly string[],
): Filtrirano {
  const vidim = new Array<boolean>(redove.length).fill(false);
  // видимо дете под всяко ниво · нулира се, щом се мине родител на това ниво
  let vidimoPod1 = false;
  let vidimoPod0 = false;
  for (let i = redove.length - 1; i >= 0; i -= 1) {
    const r = redove[i]!;
    const sam = minavaFiltara(r.dumi, filtar);
    if (r.nivo === 2) {
      vidim[i] = sam;
      if (sam) {
        vidimoPod1 = true;
        vidimoPod0 = true;
      }
    } else if (r.nivo === 1) {
      vidim[i] = sam || vidimoPod1;
      if (vidim[i]) vidimoPod0 = true;
      vidimoPod1 = false;
    } else {
      vidim[i] = sam || vidimoPod0;
      vidimoPod0 = false;
      vidimoPod1 = false;
    }
  }
  const vidimi: number[] = [];
  for (const [i, v] of vidim.entries()) if (v) vidimi.push(i);
  return { vidimi, broyVidimi: vidimi.length, broySkriti: redove.length - vidimi.length };
}
