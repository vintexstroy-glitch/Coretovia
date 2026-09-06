/**
 * МОДЕЛИТЕ НА ЕКРАНА · неговите „Отвори" и „Запази" (ADR-014).
 *
 * Негово (A14 · B14 на Управление, същото и на Сметки):
 *   „Отвори(запазен по рано модел или таблица за създаване на празна таблица и
 *    после вкарване на функционалност…)"
 *   „Запази(записваш експерименталния модел за периоди напред)"
 *
 * МОДЕЛ е ИМЕНУВАНА снимка на това КАК се гледа прозорецът: такт, период,
 * филтър, скрити, избраните сметки. Не е данни — данните са в Журнала и моделът
 * не ги пипа. Затова „Отвори" СМЕНЯ погледа, а не съдържанието.
 *
 * ЗАЩО СЪБИТИЕ, а не само в браузъра: „за периоди напред" значи, че моделът
 * надживява раздела и устройството. Екранната памет пази ПОСЛЕДНИЯ поглед;
 * моделът пази ИЗБРАН поглед с име, пътува с Книгата и се вижда от всички.
 */

import { sashtnost, VID } from '../../model/klyuchove.js';
import { PROZORTSI } from '../../model/osnova.js';
import { strogObekt } from '../../model/shema.js';
import { TIP } from '../../sabitiya/registar.js';
import { type Komanda, type Kontekst, predvaritelno, revNa } from '../komanda.js';

interface TovarModel {
  readonly prozorets: string;
  readonly ime: string;
  readonly snimka: Readonly<Record<string, unknown>>;
}

const SHEMA = strogObekt({
  prozorets: { type: 'string', enum: PROZORTSI.map((p) => p.klyuch) },
  ime: { type: 'string', maxLength: 60 },
  snimka: { type: 'object' },
});

/** Същността е ПРОЗОРЕЦЪТ и ИМЕТО · два раздела не пишат един модел наведнъж. */
function sashtnosttaNaModela(v: TovarModel): ReturnType<typeof sashtnost> {
  return sashtnost(VID.model, `${v.prozorets}/${v.ime.trim()}`);
}

function komandata(izklyuchva: boolean): Komanda<TovarModel> {
  const klyuch = izklyuchva ? 'ekran.mahniModel' : 'ekran.zapaziModel';
  return {
    klyuch,
    ime: izklyuchva ? 'Махни модела' : 'Запази модела',
    opisanie: izklyuchva
      ? 'Маха запазен модел от списъка · остава в Журнала, спира да се предлага.'
      : 'Записва как се гледа прозорецът в момента, под име · „за периоди напред".',
    prozortsi: PROZORTSI.map((p) => p.klyuch),
    stepen: 'pishe',
    myasto: 'sluzhebna',
    proizvezhda: [TIP.modelZapisan],
    shema: SHEMA,
    predusloviya: [
      {
        ime: 'името не е празно',
        proveri: (v) => (v.ime.trim() === '' ? 'Моделът иска име.' : null),
      },
      {
        ime: izklyuchva ? 'моделът съществува' : 'има какво да се запази',
        proveri: (v, k) => {
          const ima = k.ogledalo.modeli.some(
            (m) => m.prozorets === v.prozorets && m.ime === v.ime.trim() && m.izklyuchen !== true,
          );
          if (izklyuchva && !ima) return `Няма модел „${v.ime}" в този прозорец.`;
          if (!izklyuchva && Object.keys(v.snimka).length === 0) {
            return 'Прозорецът е както е по подразбиране — няма какво да се запази.';
          }
          return null;
        },
      },
    ],
    dryRun: (v, k: Kontekst) => {
      const s = sashtnosttaNaModela(v);
      const ime = v.ime.trim();
      const staro = k.ogledalo.modeli.find((m) => m.prozorets === v.prozorets && m.ime === ime);
      return predvaritelno(
        k,
        klyuch,
        [
          {
            type: TIP.modelZapisan,
            sashtnost: s,
            payload: {
              prozorets: v.prozorets,
              ime,
              snimka: izklyuchva ? (staro?.snimka ?? {}) : v.snimka,
              ...(izklyuchva ? { izklyuchen: true } : {}),
            },
            expectedRev: revNa(k, s),
          },
        ],
        [
          {
            kakvo: `модел „${ime}" в ${v.prozorets}`,
            bilo: staro === undefined ? '—' : `${Object.keys(staro.snimka).length} настройки`,
            stava: izklyuchva ? 'махнат' : `${Object.keys(v.snimka).length} настройки`,
          },
        ],
        izklyuchva ? `Моделът „${ime}" е махнат.` : `Моделът „${ime}" е записан.`,
      );
    },
  };
}

export const ekranZapaziModel = komandata(false);
export const ekranMahniModel = komandata(true);
