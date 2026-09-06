/**
 * КОТВАТА · последното звено, записано ИЗВЪН Журнала.
 *
 * Проверката на веригата хваща подменено или разместено звено, но има едно
 * сляпо петно: СКЪСЯВАНЕ ОТЗАД. Махнеш ли последните N събития, остатъкът е
 * безупречна, само че по-къса верига — и проверката казва „цяла".
 *
 * Котвата затваря точно това петно: след всеки запис `{seq, hash}` отива на
 * отделно място (localStorage). При тръгване Журналът се мери срещу котвата:
 * по-къс Журнал или друг хеш на котвения seq = дръпнат кран + думи.
 *
 * Котвата е БЕЛЕГ НА ТОЗИ БРАУЗЪР, не втора истина. Загубата ѝ (нов браузър,
 * чистене на данни) не е инцидент — тя просто се захваща наново. Истината
 * за другите машини е износът с неговия последен хеш.
 */

interface Kotva {
  readonly seq: number;
  readonly hash: string;
  /** ISO — кога е забита */
  readonly kogato: string;
}

/** Портът: къде живее котвата. Реализацията по подразбиране е localStorage. */
export interface DrajkaNaKotva {
  cheti(naematel: string): Kotva | null;
  zabij(naematel: string, kotva: Kotva): void;
}

export class KotvaVLocalStorage implements DrajkaNaKotva {
  readonly #predstavka: string;

  constructor(predstavka = 'coretovia:kotva') {
    this.#predstavka = predstavka;
  }

  cheti(naematel: string): Kotva | null {
    try {
      const surovo = localStorage.getItem(`${this.#predstavka}:${naematel}`);
      if (!surovo) return null;
      const k = JSON.parse(surovo) as Kotva;
      return Number.isSafeInteger(k.seq) && typeof k.hash === 'string' ? k : null;
    } catch {
      // Частен прозорец или забранени данни — котва просто няма.
      return null;
    }
  }

  zabij(naematel: string, kotva: Kotva): void {
    try {
      localStorage.setItem(`${this.#predstavka}:${naematel}`, JSON.stringify(kotva));
    } catch {
      // Няма къде — записът в Журнала пак е станал; котвата е допълнителна мярка.
    }
  }
}

/** За тестове и за среди без localStorage. */
export class KotvaVPametta implements DrajkaNaKotva {
  readonly #po = new Map<string, Kotva>();

  cheti(naematel: string): Kotva | null {
    return this.#po.get(naematel) ?? null;
  }

  zabij(naematel: string, kotva: Kotva): void {
    this.#po.set(naematel, kotva);
  }
}

interface ProverkaNaKotva {
  readonly nared: boolean;
  /** празно при наред; иначе — с думи какво не съвпада */
  readonly prichina: string;
  readonly kotva: Kotva | null;
}

/**
 * Мери Журнала срещу котвата. `hashNaSeq` дава хеша на дадено звено
 * (или undefined, ако звеното липсва).
 */
export function proveriKotvata(
  kotva: Kotva | null,
  posledenSeq: number,
  hashNaSeq: (seq: number) => string | undefined,
): ProverkaNaKotva {
  if (!kotva) return { nared: true, prichina: '', kotva: null };

  if (posledenSeq < kotva.seq) {
    return {
      nared: false,
      prichina:
        `Журналът стига до seq ${posledenSeq}, а котвата помни seq ${kotva.seq} ` +
        `от ${kotva.kogato.slice(0, 10)}. Липсват ${kotva.seq - posledenSeq} ` +
        `${kotva.seq - posledenSeq === 1 ? 'събитие' : 'събития'} — Журналът е скъсяван отзад.`,
      kotva,
    };
  }

  const hash = hashNaSeq(kotva.seq);
  if (hash !== kotva.hash) {
    return {
      nared: false,
      prichina:
        `Звеното seq ${kotva.seq} носи друг хеш от този, който котвата помни. ` +
        'Историята до котвата е пренаписана.',
      kotva,
    };
  }

  return { nared: true, prichina: '', kotva };
}

/**
 * КОТВАТА КАЗВА · изречението за екрана, БЕЗ да се чете целият Журнал.
 *
 * `proveriKotvata` е ПРИСЪДАТА; това е ИЗРЕЧЕНИЕТО. Разделени са, защото
 * присъдата се мери в тест, а изречението го чете човек — и защото корените
 * (`app/main.ts`) не са място за решение: точно там присъдата стоя построена и
 * НЕВИКАНА, тоест изключена на последната крачка (ADR-021).
 *
 * Чете се САМО последното звено, а не цялата верига: при по-къс Журнал
 * присъдата се произнася без нито един хеш, а при равни `seq` сравняваният хеш
 * Е хешът на това звено. Пълната проверка на веригата е ДРУГО и си има бутон.
 *
 * ТРИ от четирите състояния НЕ са тревога, и трите се КАЗВАТ (правило 12):
 * котва още няма (нов браузър, изчистени данни, частен прозорец) · котвата
 * изостава (записът е минал, а браузърът не е приел нейния) · котвата съвпада.
 * Мълчание при тях би направило четвъртото — находката — неразличимо от тях.
 */
export function kotvataKazva(
  drajka: DrajkaNaKotva,
  naematel: string,
  posledno: { readonly seq: number; readonly hash: string } | undefined,
): { readonly nared: boolean; readonly dumi: string } {
  const kotva = drajka.cheti(naematel);
  if (kotva === null) {
    return { nared: true, dumi: 'Котва още няма на този браузър · захваща се при първия запис.' };
  }

  const posledenSeq = posledno?.seq ?? 0;
  if (posledenSeq > kotva.seq) {
    return {
      nared: true,
      dumi:
        `Котвата помни seq ${kotva.seq}, а Журналът стига до ${posledenSeq} — записът е минал, ` +
        'преди тя да се забие. Тя е допълнителна мярка, не втора истина.',
    };
  }

  const proverka = proveriKotvata(kotva, posledenSeq, (seq) =>
    seq === posledenSeq ? posledno?.hash : undefined,
  );
  if (!proverka.nared) return { nared: false, dumi: proverka.prichina };
  return {
    nared: true,
    dumi: `Котвата съвпада с Журнала на seq ${kotva.seq} · нищо не е махано отзад.`,
  };
}
