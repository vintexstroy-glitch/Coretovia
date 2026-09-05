/**
 * ИМОТИ · ОБЕКТИ · БИЗНЕСИ · командите на прозореца.
 *
 * Трите му бутона („/Създай имот/", „/Добави Обект/", „/Добави Бизнес/") са
 * ЕДНА команда с три имена — колоните са данни и създаването е родово. Към
 * тях: поправка на клетка (в клетката, не бутон), изключване и връщане на ред
 * (десен бутон). Всичко минава през едни и същи предусловия, поименно:
 *
 *   · клетките са живи — номенклатурният номер съществува и не е спрян,
 *     връзката сочи жив ред, Видът принадлежи на Категорията;
 *   · Обект не взима категория със своя таблица (Бизнесът има своя);
 *   · номерът (кортежът) е свободен — `3.1.1.27` е адрес и е един;
 *   · смяната на Категория чисти Вида, освен ако не е даден нов.
 */

import { sashtnost } from '../../model/klyuchove.js';
import { tablitsata } from '../../model/model.js';
import { MODEL, TABLITSI } from '../../model/osnova.js';
import { poNomer } from '../../model/nomenklatura.js';
import { strogObekt, shemaNaReda } from '../../model/shema.js';
import { slotNaKolonata } from '../../model/kolona.js';
import { kolonaNa, type Tablitsa } from '../../model/tablitsa.js';
import { kletkaNa, redKato, zhiviteRedove } from '../../ogledalo/tablitsa.js';
import { proveriTovar, TIP } from '../../sabitiya/registar.js';
import type { Kletka, Kletki } from '../../model/kletka.js';
import { dumiNaKletka, imeNaReda } from '../../smetach/kletki.js';
import {
  nomerNaRed,
  nomerOtKletki,
  sravniNomer,
  tekstNaNomera,
} from '../../smetach/nomeratsiya.js';
import {
  idNaRed,
  type Izbran,
  type Komanda,
  type Kontekst,
  predvaritelno,
  type Razlika,
  razlika,
  revNa,
} from '../komanda.js';

type Red = Readonly<Record<string, Kletka>>;

/** Следващото състояние на реда · старото + клетките · смяна на Категория чисти Вида. */
function sledvashto(
  t: Tablitsa,
  staro: Red,
  kletki: Kletki,
): { sled: Red; dobaveni: Kletki; izchisteni: readonly string[] } {
  const sled: Record<string, Kletka> = { ...staro };
  const dobaveni: Record<string, Kletka | null> = {};
  const izchisteni: string[] = [];
  for (const [klyuch, k] of Object.entries(kletki)) {
    if (k === null) delete sled[klyuch];
    else sled[klyuch] = k;
  }
  for (const kol of t.koloni) {
    if (kol.vid !== 'izbor' || kol.belegOt === undefined) continue;
    // СМЯНА, не присъствие: същата категория плюс друга клетка не чисти Вида
    const nov = kletki[kol.belegOt];
    const star = staro[kol.belegOt];
    const smenen =
      nov !== undefined &&
      (nov === null ||
        star === undefined ||
        !('nomer' in star) ||
        !('nomer' in nov) ||
        star.nomer !== nov.nomer);
    const belegSmenen = smenen && kletki[kol.klyuch] === undefined;
    if (belegSmenen && sled[kol.klyuch] !== undefined) {
      delete sled[kol.klyuch];
      dobaveni[kol.klyuch] = null;
      izchisteni.push(kol.klyuch);
    }
  }
  return { sled, dobaveni, izchisteni };
}

/** Клетките срещу ЖИВОТО · връща думи; празно = минава. */
function proveriKletkite(
  t: Tablitsa,
  kletki: Kletki,
  sled: Red,
  k: Kontekst,
  svoyId: string | undefined,
  pozitsiya: number,
  izchisteni: readonly string[] = [],
): string[] {
  const n = [
    ...proveriTovar(
      TIP.redZapisan,
      { tablitsa: t.klyuch, id: svoyId ?? `${t.sashtnost}:nov`, kletki },
      k.model,
    ),
  ];
  if (n.length > 0) return n;
  for (const [klyuch, kl] of Object.entries(kletki)) {
    if (kl === null) continue;
    const kol = kolonaNa(t, klyuch)!;
    if (kol.vid === 'izbor' && 'nomer' in kl) {
      const zh = k.ogledalo.nomenklaturi.get(kol.nomenklatura!)!;
      const belezi = belezite(t, zh.podredbaPo, sled);
      const s = poNomer(zh, kl.nomer, belezi);
      if (s === undefined) n.push(`Няма № ${kl.nomer} в „${zh.ime}".`);
      else if (s.spryana)
        n.push(`„${s.tekst}" е спряна от Настройки — върни я, преди да я избираш.`);
      else if (s.belezi['tablitsa'] !== undefined && s.belezi['tablitsa'] !== t.klyuch) {
        n.push(`„${s.tekst}" има своя таблица — добави го оттам, не като Обект.`);
      }
    }
    if (kol.vid === 'vrazka' && 'tekst' in kl) {
      const kam = k.ogledalo.tablitsi.get(kol.vrazka!);
      const i = kam?.indeks.get(kl.tekst);
      if (kam === undefined || i === undefined) n.push(`Няма ред „${kl.tekst}" в „${kol.vrazka}".`);
      else if (kam.izklyuchen[i] === 1)
        n.push(
          `Редът „${imeNaReda(k.ogledalo, kol.vrazka!, kl.tekst)}" е изключен — върни го първо.`,
        );
    }
  }
  if (n.length > 0) return n;
  // Видът принадлежи на Категорията · върху СЛЕДВАЩОТО състояние
  for (const kol of t.koloni) {
    if (kol.vid !== 'izbor' || kol.belegOt === undefined) continue;
    const vidKl = sled[kol.klyuch];
    if (vidKl === undefined || !('nomer' in vidKl)) continue;
    const zh = k.ogledalo.nomenklaturi.get(kol.nomenklatura!)!;
    const s = poNomer(zh, vidKl.nomer, belezite(t, zh.podredbaPo, sled));
    if (s === undefined)
      n.push(`Видът № ${vidKl.nomer} не е от избраната категория — избери Вид наново.`);
  }
  if (n.length > 0) return n;
  // Задължителната колона не се изпразва (правило 12: отказът се казва) · и смяната на
  // категорията, която чисти Вида, иска нов Вид от новата — по име на номенклатурите,
  // защото в листа му и двете колони се казват „Състояние"
  for (const kol of t.koloni) {
    if (!kol.zadalzhitelna || slotNaKolonata(kol) === undefined || sled[kol.klyuch] !== undefined)
      continue;
    if (izchisteni.includes(kol.klyuch) && kol.belegOt !== undefined) {
      const belegKol = kolonaNa(t, kol.belegOt);
      const nomNaBeleg =
        k.model.nomenklaturi.get(belegKol?.nomenklatura ?? '')?.ime ?? belegKol?.ime;
      const nomNaKol = k.model.nomenklaturi.get(kol.nomenklatura ?? '')?.ime ?? kol.ime;
      n.push(`„${nomNaBeleg}" е сменена — избери и „${nomNaKol}" от новата.`);
    } else {
      n.push(`„${kol.ime}" е задължителна — не се изпразва.`);
    }
  }
  if (n.length > 0) return n;
  // Кортежът е свободен · проверява се щом родителят и номенклатурните сегменти са налице
  // (неговото № може да е и 0 — `3.1.1.0` е адрес като всеки друг)
  const nomer = nomerOtKletki(k.ogledalo, t.klyuch, (kol) => sled[kol] ?? null, pozitsiya);
  const nepalen = (t.nomeratsiya?.segmenti ?? []).some(
    (s) =>
      (s.ot === 'roditel' && (t.roditel === undefined || sled[t.roditel.kolona] === undefined)) ||
      (s.ot === 'nomenklatura' && sled[s.kolona] === undefined),
  );
  if (nomer.length > 0 && !nepalen) {
    const tv = k.ogledalo.tablitsi.get(t.klyuch);
    if (tv !== undefined) {
      for (const j of zhiviteRedove(tv)) {
        if (tv.id[j] === svoyId) continue;
        if (sravniNomer(nomerNaRed(k.ogledalo, t.klyuch, j), nomer) === 0) {
          n.push(`Номер ${tekstNaNomera(nomer)} вече е зает от друг ред в „${t.ime}".`);
          break;
        }
      }
    }
  }
  return n;
}

/** Белезите за номенклатура по белег · от клетката на колоната-белег на същия ред. */
function belezite(t: Tablitsa, podredbaPo: string | undefined, sled: Red): Record<string, number> {
  if (podredbaPo === undefined) return {};
  const kol = t.koloni.find(
    (c) => c.belegOt !== undefined && kolonaNa(t, c.belegOt)?.nomenklatura === podredbaPo,
  );
  const belegKl = kol?.belegOt === undefined ? undefined : sled[kol.belegOt];
  return belegKl !== undefined && 'nomer' in belegKl ? { [podredbaPo]: belegKl.nomer } : {};
}

function razlikite(k: Kontekst, t: Tablitsa, staro: Red, kletki: Kletki, sled: Red): Razlika[] {
  const r: Razlika[] = [];
  for (const klyuch of Object.keys(kletki)) {
    const kol = kolonaNa(t, klyuch);
    if (kol === undefined) continue;
    const bilo = dumiNaKletka(k.ogledalo, t.klyuch, klyuch, staro[klyuch] ?? null, staro);
    const stava = dumiNaKletka(k.ogledalo, t.klyuch, klyuch, sled[klyuch] ?? null, sled);
    if (bilo !== stava) r.push(razlika(kol.ime, bilo, stava));
  }
  return r;
}

function bezPrazni(kletki: Kletki): Kletki {
  return Object.fromEntries(Object.entries(kletki).filter(([, v]) => v !== null));
}

interface TovarNovRed {
  readonly kletki: Kletki;
}

function komandaZaNovRed(
  tablitsa: string,
  klyuch: string,
  ime: string,
  opisanie: string,
): Komanda<TovarNovRed> {
  const komanda: Komanda<TovarNovRed> = {
    klyuch,
    ime,
    opisanie,
    prozortsi: ['imoti'],
    stepen: 'pishe',
    myasto: 'buton',
    proizvezhda: [TIP.redZapisan],
    shema: strogObekt({ kletki: shemaNaReda(tablitsata(MODEL, tablitsa), 'sazdavane') }),
    predusloviya: [
      {
        ime: 'клетките са живи и номерът е свободен',
        proveri: (v, k) => {
          const t = tablitsata(k.model, tablitsa);
          const { sled } = sledvashto(t, {}, v.kletki);
          const n = proveriKletkite(
            t,
            v.kletki,
            sled,
            k,
            undefined,
            k.ogledalo.tablitsi.get(tablitsa)?.broy ?? 0,
          );
          return n.length > 0 ? n.join(' ') : null;
        },
      },
    ],
    dryRun: (v, k) => {
      const t = tablitsata(k.model, tablitsa);
      const id = idNaRed(t.sashtnost, k.komandaId);
      const kletki = bezPrazni(v.kletki);
      const { sled } = sledvashto(t, {}, kletki);
      const s = sashtnost(t.sashtnost, id);
      const nomer = nomerOtKletki(
        k.ogledalo,
        t.klyuch,
        (kol) => sled[kol] ?? null,
        k.ogledalo.tablitsi.get(tablitsa)?.broy ?? 0,
      );
      return predvaritelno(
        k,
        klyuch,
        [
          {
            type: TIP.redZapisan,
            sashtnost: s,
            payload: { tablitsa: t.klyuch, id, kletki },
            expectedRev: revNa(k, s),
          },
        ],
        razlikite(k, t, {}, kletki, sled),
        `Нов ред ${tekstNaNomera(nomer)} в „${t.ime}".`,
      );
    },
  };
  return Object.freeze(komanda);
}

export const imotiSazdayImot = komandaZaNovRed(
  'imoti',
  'imoti.sazdayImot',
  'Създай имот',
  'Вкарва имот в списъка с данните за имота.',
);
export const imotiDobaviObekt = komandaZaNovRed(
  'obekti',
  'imoti.dobaviObekt',
  'Добави Обект',
  'Избираш от падащо меню добавените Имоти и допълваш данни за обекта.',
);
export const imotiDobaviBiznes = komandaZaNovRed(
  'biznesi',
  'imoti.dobaviBiznes',
  'Добави Бизнес',
  'Избираш от падащо меню добавените Имоти и допълваш данни за Бизнеса.',
);

interface TovarPopravka {
  readonly tablitsa: string;
  readonly id: string;
  readonly kletki: Kletki;
}

/** таблиците на прозореца · броени от Модела, не преписани */
const TABLITSA = {
  type: 'string',
  enum: TABLITSI.filter((t) => t.prozorets === 'imoti').map((t) => t.klyuch),
} as const;
const ID = { type: 'string', minLength: 3, maxLength: 200 } as const;

function redat(
  v: { tablitsa: string; id: string },
  k: Kontekst,
): { t: Tablitsa; i: number; staro: Red; izklyuchen: boolean } | string {
  const t = k.model.tablitsi.get(v.tablitsa);
  if (t === undefined) return `Няма таблица „${v.tablitsa}".`;
  const tv = k.ogledalo.tablitsi.get(v.tablitsa);
  const i = tv?.indeks.get(v.id);
  if (tv === undefined || i === undefined) return `Няма ред „${v.id}" в „${t.ime}".`;
  const r = redKato(tv, i);
  return { t, i, staro: r.kletki, izklyuchen: r.izklyuchen };
}

const popraviKletka: Komanda<TovarPopravka> = {
  klyuch: 'imoti.popraviKletka',
  ime: 'Поправи клетка',
  opisanie:
    'Поправя посочените клетки на ред; частичен товар. Последната дума бие по поле; null изпразва.',
  prozortsi: ['imoti'],
  stepen: 'pishe',
  myasto: 'kletka',
  proizvezhda: [TIP.redZapisan],
  shema: strogObekt({
    tablitsa: TABLITSA,
    id: ID,
    kletki: { type: 'object', description: 'по ключ на колона · null изпразва' },
  }),
  predusloviya: [
    {
      ime: 'редът съществува и е жив',
      proveri: (v, k) => {
        const r = redat(v, k);
        return typeof r === 'string'
          ? r
          : r.izklyuchen
            ? 'Изключен ред не се поправя — върни го първо.'
            : null;
      },
    },
    {
      ime: 'има какво да се промени · и клетките са живи',
      proveri: (v, k) => {
        const r = redat(v, k);
        if (typeof r === 'string') return null;
        if (Object.keys(v.kletki).length === 0) return 'Нищо не се променя.';
        const { sled, izchisteni } = sledvashto(r.t, r.staro, v.kletki);
        const n = proveriKletkite(r.t, v.kletki, sled, k, v.id, r.i, izchisteni);
        if (n.length > 0) return n.join(' ');
        return razlikite(k, r.t, r.staro, v.kletki, sled).length === 0
          ? 'Нищо не се променя.'
          : null;
      },
    },
  ],
  dryRun: (v, k) => {
    const r = redat(v, k);
    if (typeof r === 'string') throw new Error(r);
    const { sled, dobaveni } = sledvashto(r.t, r.staro, v.kletki);
    const kletki: Kletki = { ...v.kletki, ...dobaveni };
    const s = sashtnost(r.t.sashtnost, v.id);
    const razliki = razlikite(k, r.t, r.staro, kletki, sled);
    return predvaritelno(
      k,
      'imoti.popraviKletka',
      [
        {
          type: TIP.redZapisan,
          sashtnost: s,
          payload: { tablitsa: r.t.klyuch, id: v.id, kletki },
          expectedRev: revNa(k, s),
        },
      ],
      razliki,
      razliki.map((x) => `${x.kakvo}: ${x.bilo || '—'} → ${x.stava || '—'}`).join(' · '),
    );
  },
};
export const imotiPopraviKletka = Object.freeze(popraviKletka);

interface TovarRed {
  readonly tablitsa: string;
  readonly id: string;
}

/** Живите деца на ред · редовете в таблици с родител тази, сочещи този id. */
function zhiviDetsa(
  k: Kontekst,
  tablitsa: string,
  id: string,
): { tablitsa: string; broy: number }[] {
  const rez: { tablitsa: string; broy: number }[] = [];
  for (const t of k.model.tablitsi.values()) {
    if (t.roditel?.tablitsa !== tablitsa) continue;
    const tv = k.ogledalo.tablitsi.get(t.klyuch);
    if (tv === undefined) continue;
    const broy = zhiviteRedove(tv).filter((i) => {
      const kl = kletkaNa(tv, i, t.roditel!.kolona);
      return kl !== null && 'tekst' in kl && kl.tekst === id;
    }).length;
    if (broy > 0) rez.push({ tablitsa: t.klyuch, broy });
  }
  return rez;
}

function komandaZaIzklyuchvane(izklyuchen: boolean): Komanda<TovarRed> {
  const klyuch = izklyuchen ? 'imoti.izklyuchiRed' : 'imoti.varniRed';
  const komanda: Komanda<TovarRed> = {
    klyuch,
    ime: izklyuchen ? 'Изключи реда' : 'Върни реда',
    opisanie: izklyuchen
      ? 'Изключва ред: не се показва и не се смята, но остава в Журнала с номера си.'
      : 'Връща изключен ред.',
    prozortsi: ['imoti'],
    stepen: 'pishe',
    myasto: 'desen-buton',
    proizvezhda: [TIP.redIzklyuchen],
    shema: strogObekt({ tablitsa: TABLITSA, id: ID }),
    otIzbora: (izbran: Izbran) => ({ tablitsa: izbran.tablitsa, id: izbran.id }),
    predusloviya: [
      {
        ime: izklyuchen ? 'редът е жив' : 'редът е изключен',
        proveri: (v, k) => {
          const r = redat(v, k);
          if (typeof r === 'string') return r;
          if (r.izklyuchen === izklyuchen)
            return izklyuchen ? 'Редът вече е изключен.' : 'Редът не е изключен.';
          return null;
        },
      },
      {
        ime: 'върнатият ред не заема чужд адрес',
        proveri: (v, k) => {
          if (izklyuchen) return null;
          const r = redat(v, k);
          if (typeof r === 'string') return null;
          const n = proveriKletkite(r.t, {}, r.staro, k, v.id, r.i);
          return n.length > 0 ? n.join(' ') : null;
        },
      },
      {
        ime: 'няма живи редове под него',
        proveri: (v, k) => {
          if (!izklyuchen) return null;
          const detsa = zhiviDetsa(k, v.tablitsa, v.id);
          if (detsa.length === 0) return null;
          return `Редът има живи редове под себе си (${detsa.map((d) => `${d.broy} в „${d.tablitsa}"`).join(', ')}) — изключи първо тях.`;
        },
      },
    ],
    dryRun: (v, k) => {
      const r = redat(v, k);
      if (typeof r === 'string') throw new Error(r);
      const s = sashtnost(r.t.sashtnost, v.id);
      const ime = imeNaReda(k.ogledalo, v.tablitsa, v.id);
      return predvaritelno(
        k,
        klyuch,
        [
          {
            type: TIP.redIzklyuchen,
            sashtnost: s,
            payload: { tablitsa: v.tablitsa, id: v.id, izklyuchen },
            expectedRev: revNa(k, s),
          },
        ],
        [
          razlika(
            'Ред',
            izklyuchen ? ime : `${ime} · изключен`,
            izklyuchen ? `${ime} · изключен` : ime,
          ),
        ],
        izklyuchen ? `„${ime}" се изключва. Журналът го пази.` : `„${ime}" се връща.`,
      );
    },
  };
  return Object.freeze(komanda);
}

export const imotiIzklyuchiRed = komandaZaIzklyuchvane(true);
export const imotiVarniRed = komandaZaIzklyuchvane(false);
