/**
 * ИЗПЪЛНИТЕЛЯТ · единствената реализация на Портата · ЕДИНСТВЕНИЯТ, който
 * вика `Vrata.dobavi` (K2). Слоевете го броят: никой над Портата не внася
 * този файл освен композиционният корен (`app/main.ts`).
 *
 * ═══ КАК ПИШЕ ═══
 *
 *   1. повторен `komandaId` в тази сесия → същият резултат, нула нови звена;
 *      същият ключ с ДРУГ товар → отказ с думи;
 *   2. `probvay` наново върху живото Огледало; даден ли е очакван отпечатък
 *      (от предишното пробване), различен → „променено междувременно";
 *   3. всяка операция → Вратата с `opId = komandaId#i`, `expectedRev` и такт,
 *      който не върви назад (`naprediChasovnika`);
 *   4. върне ли Вратата „повторено", записаното под този `opId` се сравнява с
 *      операцията: друго → отказ (и в нова сесия ключът носи ЕДНО действие);
 *   5. сверка от Дневника: всяка операция стои под своя `opId` (правило 7);
 *      не затваря ли — кранът (правило 8) и отказ с думите на сверката;
 *   6. Огледалото се пресгъва ОТ ДНЕВНИКА · и при успех, и при отказ на
 *      Вратата: чужд запис от друг раздел става видим веднага, не при следващото
 *      пускане. Слушателите получават новото.
 *
 * Партидата в този резен е с размер 1 (решение 9). Пресгъването е пълно —
 * колонният склад няма история по клетка и е по-евтино да се строи наново,
 * отколкото да се закърпва.
 */

import { butoniZa, eOtkaz, type Otkaz, otkaz, probvay } from '../komandi/izpalnenie.js';
import { opisNaKataloga } from '../komandi/katalog.js';
import {
  type Izbran,
  type Kontekst,
  type Operatsiya,
  otpechatakNaOperatsiite,
  type Predvaritelno,
} from '../komandi/komanda.js';
import type { Model } from '../model/model.js';
import { fold, type Ogledalo } from '../ogledalo/ogledalo.js';
import { sgani } from '../ogledalo/sgavane.js';
import type { Dnevnik } from '../yadro/dnevnik.js';
import { dumiZaGreshka } from '../yadro/dumi.js';
import type { Sabitie } from '../yadro/sabitie.js';
import { DnevnikNaSverki, MERKA, sverka } from '../yadro/sverka.js';
import { naprediChasovnika } from '../yadro/takt.js';
import type { Vrata } from '../yadro/vrata.js';
import type { Porta, RezultatNaIzpalnenie } from './porta.js';

export interface NastroykiNaIzpalnitelya {
  readonly vrata: Vrata;
  readonly dnevnik: Dnevnik;
  readonly model: Model;
  /** веригата, в която се пише · ключът на Книгата или `ключ~писач` */
  readonly veriga: string;
  /** префиксът на всички вериги на Книгата · по подразбиране = ключът на Книгата */
  readonly kniga?: string;
  /** имейлът на този, който пише · функция, защото се научава при откриването */
  readonly aktor: () => string;
  readonly sega: () => string;
}

interface Izpalneno {
  readonly otpechatakNaTovara: string;
  readonly seqove: readonly number[];
}

const NOV_KLYUCH = 'Ключът на действието вече е ползван за друго — ново действие иска нов ключ.';

/** Записаното събитие като операция · за сравнение с онова, което командата иска сега. */
function operatsiyaOt(s: Sabitie, expectedRev: number): Operatsiya {
  return {
    type: s.type as Operatsiya['type'],
    sashtnost: s.sashtnost,
    payload: s.payload,
    expectedRev,
  };
}

/** Товарът, както Вратата го записва · NFC · за да се сравнява с записаното. */
function vNFC(op: Operatsiya): Operatsiya {
  return {
    ...op,
    payload: JSON.parse(JSON.stringify(op.payload).normalize('NFC')) as Operatsiya['payload'],
  };
}

export class Izpalnitel implements Porta {
  readonly #n: NastroykiNaIzpalnitelya;
  readonly #verigi = new Map<string, Sabitie[]>();
  readonly #slushateli = new Set<(o: Ogledalo) => void>();
  readonly #izpalneni = new Map<string, Izpalneno>();
  readonly sverki = new DnevnikNaSverki();
  #ogledalo: Ogledalo;

  private constructor(n: NastroykiNaIzpalnitelya) {
    this.#n = n;
    this.#ogledalo = fold([], n.model, n.sega());
  }

  /** Отваря Книгата: чете всички вериги от Дневника и сгъва. */
  static async otvori(n: NastroykiNaIzpalnitelya): Promise<Izpalnitel> {
    const i = new Izpalnitel(n);
    await i.prezaredi();
    return i;
  }

  /** Пресгъва от Дневника · всички вериги · слушателите получават новото. */
  async prezaredi(): Promise<void> {
    const novi = new Map<string, Sabitie[]>();
    const klyuchove = await this.#n.dnevnik.verigi(this.#n.kniga ?? this.#n.veriga);
    for (const k of klyuchove) novi.set(k, await this.#n.dnevnik.chetiVsichki(k));
    if (!novi.has(this.#n.veriga)) novi.set(this.#n.veriga, []);
    this.#verigi.clear();
    for (const [k, v] of novi) this.#verigi.set(k, v);
    const sega = this.#n.sega();
    const sg = sgani([...this.#verigi.values()], sega);
    this.sverki.zapishi(sg.sverka);
    this.#ogledalo = fold(sg.potok, this.#n.model, sega);
    this.sverki.zapishi(this.#ogledalo.sverka);
    for (const s of this.#slushateli) s(this.#ogledalo);
  }

  #kontekst(komandaId: string): Kontekst {
    return {
      model: this.#n.model,
      ogledalo: this.#ogledalo,
      komandaId,
      aktor: this.#n.aktor(),
      veriga: this.#n.veriga,
      sega: this.#n.sega(),
      // по seq, не по място: веригата в паметта може да е четена преди чужд запис
      zveno: (veriga, seq) => {
        const s = this.#verigi.get(veriga)?.find((x) => x.seq === seq);
        return s === undefined
          ? undefined
          : { type: s.type, sashtnost: s.sashtnost, actor: s.actor };
      },
    };
  }

  ogledalo(): Ogledalo {
    return this.#ogledalo;
  }

  katalog(): ReturnType<typeof opisNaKataloga> {
    return opisNaKataloga();
  }

  butoniZa(prozorets: string, izbran?: Izbran): ReturnType<typeof butoniZa> {
    return butoniZa(prozorets, izbran, this.#kontekst(''));
  }

  probvay(komandaId: string, klyuch: string, tovar: unknown): Predvaritelno | Otkaz {
    return probvay(klyuch, tovar, this.#kontekst(komandaId));
  }

  abonirai(slushatel: (o: Ogledalo) => void): () => void {
    this.#slushateli.add(slushatel);
    return () => {
      this.#slushateli.delete(slushatel);
    };
  }

  zatvori(prichina: string): void {
    this.#n.vrata.zatvori(prichina);
  }

  otvori(): void {
    this.#n.vrata.otvori();
  }

  async izpalni(
    komandaId: string,
    klyuch: string,
    tovar: unknown,
    ochakvanOtpechatak?: string,
  ): Promise<RezultatNaIzpalnenie | Otkaz> {
    if (komandaId.trim() === '') return otkaz('Действието иска ключ (komandaId).');
    if (this.#n.vrata.zatvorena)
      return otkaz(`Вратата е спряна: ${this.#n.vrata.prichinaZaZatvaryane}`);

    const otpechatakNaTovara = otpechatakNaOperatsiite([
      {
        type: klyuch as never,
        sashtnost: { vid: 'komanda', id: klyuch },
        payload: { tovar },
        expectedRev: 0,
      },
    ]);
    const veche = this.#izpalneni.get(komandaId);
    if (veche !== undefined) {
      if (veche.otpechatakNaTovara !== otpechatakNaTovara) return otkaz(NOV_KLYUCH);
      // и нулата се записва (правило 7): повторението е партида без нито едно ново звено
      const sv = this.sverki.zapishi(
        sverka(`повторено „${klyuch}"`, 0, 0, this.#n.sega(), MERKA.broy),
      );
      return { komandaId, seqove: veche.seqove, povtoreno: true, sverka: sv };
    }

    const pred = this.probvay(komandaId, klyuch, tovar);
    if (eOtkaz(pred)) return pred;
    if (ochakvanOtpechatak !== undefined && ochakvanOtpechatak !== pred.otpechatak) {
      return otkaz('Променено междувременно — виж отново, преди да запишеш.');
    }

    const seqove: number[] = [];
    let povtoreni = 0;
    const opIdove = pred.operatsii.map((_op, i) => `${komandaId}#${i}`);
    let posledenTs = this.#verigi.get(this.#n.veriga)?.at(-1)?.ts;
    for (const [i, op] of pred.operatsii.entries()) {
      const ts = naprediChasovnika(posledenTs, this.#n.sega());
      posledenTs = ts;
      let r: Awaited<ReturnType<Vrata['dobavi']>>;
      try {
        r = await this.#n.vrata.dobavi({
          opId: opIdove[i]!,
          ts,
          naematel: this.#n.veriga,
          actor: this.#n.aktor(),
          type: op.type,
          sashtnost: op.sashtnost,
          payload: op.payload,
          expectedRev: op.expectedRev,
        });
      } catch (e) {
        // Каквото е влязло, е влязло (правило 1) · и чуждото вече е там: Огледалото го научава.
        await this.prezaredi();
        return otkaz(dumiZaGreshka(e));
      }
      seqove.push(r.seq);
      if (r.povtoreno) {
        povtoreni += 1;
        const zapisano = await this.#n.dnevnik.poOpId(this.#n.veriga, opIdove[i]!);
        if (
          zapisano !== undefined &&
          otpechatakNaOperatsiite([operatsiyaOt(zapisano, op.expectedRev)]) !==
            otpechatakNaOperatsiite([vNFC(op)])
        ) {
          await this.prezaredi();
          return otkaz(NOV_KLYUCH);
        }
      }
    }

    // Сверка от Дневника: всяка операция стои под своя opId (правило 7 · и нулата).
    let nameren = 0;
    for (const opId of opIdove) {
      if ((await this.#n.dnevnik.poOpId(this.#n.veriga, opId)) !== undefined) nameren += 1;
    }
    const sv = this.sverki.zapishi(
      sverka(`изпълнение „${klyuch}"`, pred.operatsii.length, nameren, this.#n.sega(), MERKA.broy),
    );
    if (!sv.nared) {
      this.#n.vrata.zatvori(`сверката на „${klyuch}" не затваря: разлика ${sv.razlika}`);
      await this.prezaredi();
      return otkaz(
        `Сверката на „${klyuch}" не затваря (вход ${sv.vhod}, изход ${sv.izhod}) — кранът е дръпнат.`,
      );
    }

    this.#izpalneni.set(komandaId, { otpechatakNaTovara, seqove: Object.freeze([...seqove]) });
    await this.prezaredi();
    return {
      komandaId,
      seqove,
      povtoreno: povtoreni === pred.operatsii.length && pred.operatsii.length > 0,
      sverka: sv,
    };
  }
}
