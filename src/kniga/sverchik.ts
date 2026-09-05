/**
 * СВЕРЧИКЪТ · прочетената Книга срещу живото Огледало → ОТЧЕТ (ADR-004).
 *
 * Негово (ИИ D8): „Сверява промените настъпили в системата от дневната сверка
 * на информацията в екселския файл и вкараните промени в файловете и вкарани
 * в програмата нова информация от различните служители и стопани."
 *
 * Чист код, без мрежа и без модел: Огледало + прочетена Книга → предложения
 * (какво ще се запише, с думи и разлики) и находки (какво не се чете или не
 * минава, с адрес). Нищо тук не пише: записва ЧОВЕКЪТ, през Портата, с
 * командите от каталога (K3). Предложението е ДАННИ на домейна
 * (`src/model/predlozhenie.ts`); коя команда го изпълнява казва каталогът.
 *
 * ═══ ПРАВИЛАТА ═══
 *
 *   · с ключ = същият ред;
 *   · без ключ: съвпада ли КОРТЕЖЪТ на номерацията с жив ред — поправка на
 *     него, но само когато всеки сегмент идва от съдържание (Обекти · Бизнеси);
 *     където номерът е ПОЗИЦИЯ (Имоти · `broyach`), вмъкнат ред би преименувал
 *     чужд Имот — там без ключ се търси по ИМЕТО: едно → поправка (бележка),
 *     повече → грешка, нито едно → нов ред;
 *   · разликата е по клетка: само сменените; празна клетка при пълна в
 *     Огледалото = изпразване (`null`), освен за задължителна колона — тя
 *     остава (бележка), защото вносът не изпразва задължителното;
 *   · жив ред, който го НЯМА в листа → предложение „изключи", неотметнато;
 *   · номенклатурите растат САМО от подтаблиците на листа Настройки (правило
 *     19): непозната дума в избор на таблица е ГРЕШКА с адрес („добави я в
 *     Настройки и зареди пак"), освен ако същата Книга не я носи там — тогава
 *     редът я сочи по номера, който ще получи, и зависи от онова предложение;
 *   · Имот, който се ражда в същата Книга → редът го сочи по мястото на
 *     предложението (`@predlozhenie:N`);
 *   · два нови реда с един кортеж (или два нови Имота с едно име) в един файл →
 *     вторият е грешка: пробата на Портата е върху живото, не върху файла;
 *   · невалиден Модел (версия · отпечатък) → нищо не се предлага.
 *
 * Сверката (правило 7): по таблица · прочетени = познати + нови + невлезли;
 * живи в Огледалото = видени + невидени (за изключване).
 */

import type { Kletka, Kletki } from '../model/kletka.js';
import { VID } from '../model/klyuchove.js';
import { type Kolona, slotNaKolonata } from '../model/kolona.js';
import { tablitsata } from '../model/model.js';
import { type Belezi, podravni, poNomer, sledvashtNomer } from '../model/nomenklatura.js';
import { otpechatakNaModela } from '../model/otpechatak.js';
import { PREDLOZHENIE, type Predlozhenie, type Razlika } from '../model/predlozhenie.js';
import type { Tablitsa } from '../model/tablitsa.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { kletkaNa, redKato, zhiviteRedove } from '../ogledalo/tablitsa.js';
import { dumiNaKletka, imeNaReda, imeNaVrazkata } from '../smetach/kletki.js';
import { nomerNaRed, nomerOtKletki, tekstNaNomera } from '../smetach/nomeratsiya.js';
import { sverka, type Sverka } from '../yadro/sverka.js';
import type {
  Nahodka,
  ProchetenaKletka,
  ProchetenaKnigaVKletki,
  ProchetenRed,
  Sluzhebno,
} from './chetene.js';
import { namerIzbor } from './chetene.js';

export type { Predlozhenie, Razlika } from '../model/predlozhenie.js';
export { PREDLOZHENIE } from '../model/predlozhenie.js';

export interface Otchet {
  readonly predlozheniya: readonly Predlozhenie[];
  readonly nahodki: readonly Nahodka[];
  readonly sverki: readonly Sverka[];
  readonly sluzhebno: Sluzhebno | null;
  readonly obobshtenie: string;
}

const sashti = (a: Kletka | null | undefined, b: Kletka | null | undefined): boolean =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Номерът е позиция (сегмент `broyach`) · кортежът не е адрес и не служи за съвпадение. */
const sPozitsiya = (t: Tablitsa): boolean =>
  (t.nomeratsiya?.segmenti ?? []).some((s) => s.ot === 'broyach');

/** Първата текстова колона · името на реда · същото, което ползва `imeNaReda`. */
const kolonaNaImeto = (t: Tablitsa): string | undefined =>
  t.koloni.find((k) => k.vid === 'tekst')?.klyuch;

class Sverchik {
  readonly predlozheniya: Predlozhenie[] = [];
  readonly nahodki: Nahodka[] = [];
  readonly sverki: Sverka[] = [];
  /** нови стойности от Настройки · `nomenklatura#obhvat#текст` → индекс на предложението и номер */
  readonly noviStoynosti = new Map<string, { readonly indeks: number; readonly nomer: number }>();
  /** следващият номер по номенклатура и обхват · и последното ново предложение там · всяко следващо зависи от него */
  readonly sledvashti = new Map<string, { readonly nomer: number; readonly indeks: number }>();
  /** новите Имоти · по номер в Книгата и по сведено име → индекс на предложението */
  readonly noviImotiPoNomer = new Map<number, number>();
  readonly noviImotiPoIme = new Map<string, number>();
  /** всеки нов ред · по номера му в Книгата (A) → предложението и видът му · за родител на задача */
  readonly noviRedovePoNomer = new Map<
    string,
    { readonly indeks: number; readonly sashtnost: string }
  >();

  constructor(
    readonly o: Ogledalo,
    readonly p: ProchetenaKnigaVKletki,
    readonly kogato: string,
  ) {
    for (const n of p.nahodki) this.nahodki.push(n);
  }

  nahodka(list: string, adres: string, kakvo: string, stepen: Nahodka['stepen'] = 'greshka'): void {
    this.nahodki.push({ list, adres, kakvo, stepen });
  }

  dobavi(p: Predlozhenie): number {
    this.predlozheniya.push(p);
    return this.predlozheniya.length - 1;
  }

  /** Обхватът на стойността · категорията при „Вид на обект" · `null` = липсва белегът. */
  obhvatNa(nomenklatura: string, belezi: Belezi): string | null {
    const n = this.o.nomenklaturi.get(nomenklatura);
    if (n === undefined) return null;
    if (n.podredbaPo === undefined) return '';
    const b = belezi[n.podredbaPo];
    return b === undefined ? null : String(b);
  }

  /** Нова стойност в номенклатура · от подтаблицата в Настройки · един път за един текст. */
  novaStoynost(
    list: string,
    adres: string,
    nomenklatura: string,
    tekst: string,
    belezi: Belezi,
  ): { readonly indeks: number; readonly nomer: number } | null {
    const n = this.o.nomenklaturi.get(nomenklatura);
    const obhvat = this.obhvatNa(nomenklatura, belezi);
    if (n === undefined) return null;
    if (obhvat === null) {
      this.nahodka(list, adres, `„${tekst}" в „${n.ime}" иска категория — няма от коя.`);
      return null;
    }
    const klyuch = `${nomenklatura}#${obhvat}#${podravni(tekst)}`;
    const veche = this.noviStoynosti.get(klyuch);
    if (veche !== undefined) return veche;
    const klyuchNaSledvashtiya = `${nomenklatura}#${obhvat}`;
    // номерът се ПРЕДВИЖДА тук, а се раздава при записа: втората нова стойност в обхвата
    // получава своя номер само ако първата е минала — затова зависи от нея
    const predishna = this.sledvashti.get(klyuchNaSledvashtiya);
    const nomer = predishna?.nomer ?? sledvashtNomer(n, belezi);
    const indeks = this.dobavi({
      vid: 'nova-stoynost',
      nomenklatura,
      tekst: podravni(tekst),
      belezi,
      nomer,
      adres,
      list,
      zashto: `Нова стойност „${podravni(tekst)}" в „${n.ime}" · № ${nomer}${predishna === undefined ? '' : ` · след № ${predishna.nomer - 1} от Книгата`}.`,
      poPodrazbirane: true,
      zavisiOt: predishna === undefined ? [] : [predishna.indeks],
    });
    this.sledvashti.set(klyuchNaSledvashtiya, { nomer: nomer + 1, indeks });
    const rez = { indeks, nomer };
    this.noviStoynosti.set(klyuch, rez);
    return rez;
  }

  /** Номенклатурите от Настройки · преименувани · спрени · върнати · нови. */
  nomenklaturi(): void {
    for (const pn of this.p.nomenklaturi.values()) {
      const n = this.o.nomenklaturi.get(pn.klyuch);
      if (n === undefined) continue;
      const list = pn.list;
      let poznati = 0;
      let novi = 0;
      let nevlezli = 0;
      /** видените ключове · повторен ключ (копиран ред) е нова стойност, не преименуване */
      const videni = new Set<string>();
      for (const s of pn.stoynosti) {
        const klyuchNaReda =
          s.nomer === null ? null : `${this.obhvatNa(n.klyuch, s.belezi) ?? ''}#${s.nomer}`;
        if (klyuchNaReda !== null && videni.has(klyuchNaReda)) {
          this.nahodka(
            list,
            s.adres,
            'Ключът на реда е повторен — чета го като нова стойност.',
            'beleshka',
          );
        }
        if (s.nomer !== null && klyuchNaReda !== null && !videni.has(klyuchNaReda)) {
          videni.add(klyuchNaReda);
          const zhiva = poNomer(n, s.nomer, s.belezi);
          if (zhiva === undefined) {
            this.nahodka(
              list,
              s.adres,
              `Ключът на реда сочи № ${s.nomer}, който го няма в „${n.ime}".`,
            );
            nevlezli += 1;
            continue;
          }
          poznati += 1;
          const osnova = {
            nomenklatura: n.klyuch,
            nomer: s.nomer,
            belezi: s.belezi,
            adres: s.adres,
            list,
            zavisiOt: [],
          };
          if (s.tekst === '') {
            if (!zhiva.spryana) {
              this.dobavi({
                ...osnova,
                vid: 'spryana',
                tekst: zhiva.tekst,
                zashto: `„${zhiva.tekst}" (№ ${s.nomer}) е изтрита в Книгата → спира се; старите редове я пазят.`,
                poPodrazbirane: true,
              });
            }
            continue;
          }
          if (podravni(s.tekst) !== podravni(zhiva.tekst)) {
            const druga = namerIzbor(n, s.tekst, s.belezi);
            if (druga !== null && druga.nomer !== s.nomer && druga.beleshka === '') {
              this.nahodka(
                list,
                s.adres,
                `„${s.tekst}" вече е № ${druga.nomer} в „${n.ime}" — преименуването не минава.`,
              );
            } else {
              this.dobavi({
                ...osnova,
                vid: 'preimenuvana',
                tekst: podravni(s.tekst),
                bilo: zhiva.tekst,
                zashto: `„${zhiva.tekst}" → „${podravni(s.tekst)}" (№ ${s.nomer} остава).`,
                poPodrazbirane: true,
              });
            }
          }
          if (s.spryana !== null && s.spryana !== zhiva.spryana) {
            this.dobavi({
              ...osnova,
              vid: s.spryana ? 'spryana' : 'varnata',
              tekst: zhiva.tekst,
              zashto: s.spryana
                ? `„${zhiva.tekst}" е белязана „спряна" в Книгата.`
                : `„${zhiva.tekst}" вече не е „спряна" в Книгата → връща се.`,
              poPodrazbirane: true,
            });
          }
          continue;
        }
        if (s.tekst === '') continue;
        const ima = namerIzbor(n, s.tekst, s.belezi);
        if (ima !== null && ima.beleshka === '') {
          this.nahodka(
            list,
            s.adres,
            `„${s.tekst}" вече е № ${ima.nomer} в „${n.ime}".`,
            'beleshka',
          );
          poznati += 1;
          continue;
        }
        const nova = this.novaStoynost(list, s.adres, n.klyuch, s.tekst, s.belezi);
        if (nova === null) nevlezli += 1;
        else if (this.predlozheniya[nova.indeks]?.adres !== s.adres) {
          // същата нова дума втори път в Книгата · една стойност, една бележка
          this.nahodka(
            list,
            s.adres,
            `„${podravni(s.tekst)}" вече е нова стойност в Книгата (${this.predlozheniya[nova.indeks]?.adres ?? ''}) — чета я веднъж.`,
            'beleshka',
          );
          poznati += 1;
        } else novi += 1;
      }
      this.sverki.push(
        sverka(
          `сверка · ${n.klyuch}`,
          pn.stoynosti.length,
          poznati + novi + nevlezli,
          this.kogato,
          'познати + нови + невлезли',
        ),
      );
    }
  }

  /** Живият ред по кортеж на номерацията · за редове без ключ · само където кортежът е адрес. */
  poKortezh(tablitsa: string): Map<string, string> {
    const t = this.o.tablitsi.get(tablitsa);
    const po = new Map<string, string>();
    if (t === undefined) return po;
    for (const i of zhiviteRedove(t))
      po.set(tekstNaNomera(nomerNaRed(this.o, tablitsa, i)), t.id[i] ?? '');
    return po;
  }

  /** Живите редове без номерация (задачите) · по ключа от задължителните клетки и началото. */
  poBezNomer(t: Tablitsa): Map<string, string[]> {
    const tv = this.o.tablitsi.get(t.klyuch);
    const po = new Map<string, string[]>();
    if (tv === undefined || t.nomeratsiya !== undefined) return po;
    for (const i of zhiviteRedove(tv)) {
      const k = klyuchBezNomer(t, redKato(tv, i).kletki);
      if (k === null) continue;
      po.set(k, [...(po.get(k) ?? []), tv.id[i] ?? '']);
    }
    return po;
  }

  /** живите Имоти по сведено име · веднъж на сверка */
  private imotiPoImeSmetnati: Map<string, string[]> | null = null;
  imotiPoIme(): Map<string, string[]> {
    this.imotiPoImeSmetnati ??= this.poIme(tablitsata(this.o.model, 'imoti'));
    return this.imotiPoImeSmetnati;
  }

  /** Живите редове по сведено име · за редове без ключ, където номерът е позиция. */
  poIme(t: Tablitsa): Map<string, string[]> {
    const tv = this.o.tablitsi.get(t.klyuch);
    const kol = kolonaNaImeto(t);
    const po = new Map<string, string[]>();
    if (tv === undefined || kol === undefined) return po;
    for (const i of zhiviteRedove(tv)) {
      const k = kletkaNa(tv, i, kol);
      if (k === null || !('tekst' in k)) continue;
      const ime = podravni(k.tekst);
      po.set(ime, [...(po.get(ime) ?? []), tv.id[i] ?? '']);
    }
    return po;
  }

  /**
   * Родителят на ред · Имотът на Обект/Бизнес или Имотът/Обектът/Бизнесът на задача ·
   * жив id, или предложение за нов ред в същата Книга (`@predlozhenie:N:‹вид›`).
   */
  roditel(
    t: Tablitsa,
    r: ProchetenRed,
    kletka: ProchetenaKletka | undefined,
    kol: Kolona,
  ): { readonly kletka: Kletka; readonly zavisiOt: number[] } | null {
    if (kletka?.stoynost !== undefined && kletka.stoynost !== null)
      return { kletka: kletka.stoynost, zavisiOt: [] };
    const ime = kletka?.nepoznatRoditel ?? r.grupa?.imotIme ?? '';
    if (r.grupa?.roditelId) return { kletka: { tekst: r.grupa.roditelId }, zavisiOt: [] };
    // родител, роден в СЪЩАТА Книга · по номера му в A на груповия ред
    const nomerVKnigata = r.grupa?.nomerVKnigata ?? '';
    const novRoditel = nomerVKnigata === '' ? undefined : this.noviRedovePoNomer.get(nomerVKnigata);
    if (
      novRoditel !== undefined &&
      (kol.vrazka ?? []).some((v) => tablitsata(this.o.model, v).sashtnost === novRoditel.sashtnost)
    ) {
      return {
        kletka: { tekst: `${PREDLOZHENIE}${novRoditel.indeks}:${novRoditel.sashtnost}` },
        zavisiOt: [novRoditel.indeks],
      };
    }
    // жив родител по номера в A · Обект/Бизнес по кортежа · Имот по позиция, ако и името съвпада
    if (nomerVKnigata !== '' && r.grupa?.imotNomer === null) {
      for (const v of kol.vrazka ?? []) {
        const zhiv = this.poKortezh(v).get(nomerVKnigata);
        if (zhiv === undefined) continue;
        if (
          v === 'imoti' &&
          (ime === '' || podravni(imeNaReda(this.o, 'imoti', zhiv)) !== podravni(ime))
        )
          continue;
        return { kletka: { tekst: zhiv }, zavisiOt: [] };
      }
    }
    if (kletka?.dvusmislen !== undefined) {
      this.nahodka(
        t.ime,
        r.adres,
        `„${ime}" е име на ${kletka.dvusmislen} живи Имота — по име не се знае кой; редът не влиза без ключ.`,
      );
      return null;
    }
    const poNomerVKnigata =
      r.grupa?.imotNomer === null || r.grupa?.imotNomer === undefined
        ? undefined
        : this.noviImotiPoNomer.get(r.grupa.imotNomer);
    const poIme = ime === '' ? undefined : this.noviImotiPoIme.get(podravni(ime));
    const indeks = poNomerVKnigata ?? poIme;
    if (indeks !== undefined)
      return { kletka: { tekst: `${PREDLOZHENIE}${indeks}:imot` }, zavisiOt: [indeks] };
    // по позиция (`2.1` → живият Имот № 2) САМО когато и името му съвпада · позицията не е адрес
    if (r.grupa?.imotNomer != null && ime !== '') {
      const zhiv = this.poKortezh('imoti').get(String(r.grupa.imotNomer));
      if (zhiv !== undefined && podravni(imeNaReda(this.o, 'imoti', zhiv)) === podravni(ime))
        return { kletka: { tekst: zhiv }, zavisiOt: [] };
    }
    // жив Имот по ИМЕ · както се разпознава Имот без ключ · едно име = той; повече = двусмислено
    if (ime !== '' && (kol.vrazka ?? []).includes('imoti')) {
      const ids = this.imotiPoIme().get(podravni(ime)) ?? [];
      if (ids.length === 1) return { kletka: { tekst: ids[0]! }, zavisiOt: [] };
      if (ids.length > 1) {
        this.nahodka(
          t.ime,
          r.adres,
          `„${ime}" е име на ${ids.length} живи Имота — по име не се знае кой; редът не влиза без ключ.`,
        );
        return null;
      }
    }
    this.nahodka(
      t.ime,
      r.adres,
      ime === ''
        ? `Родителят (${nomerVKnigata || '—'}) го няма — редът не влиза без него.`
        : `Имотът „${ime}" го няма — редът не влиза без него.`,
    );
    return null;
  }

  /** Клетките на един ред · от прочетените, срещу живото · с предложенията, от които зависят. */
  kletkiNaReda(
    t: Tablitsa,
    r: ProchetenRed,
    zhivi: Readonly<Record<string, Kletka>> | null,
  ): {
    readonly kletki: Record<string, Kletka | null>;
    readonly zavisiOt: number[];
    readonly nevlyaza: boolean;
  } {
    const kletki: Record<string, Kletka | null> = {};
    const zavisiOt: number[] = [];
    let nevlyaza = false;
    const list = this.p.tablitsi.get(t.klyuch)?.list ?? '';
    const belezi: Belezi = r.grupa?.kategoriya != null ? { kategoriya: r.grupa.kategoriya } : {};
    for (const kol of t.koloni) {
      if (slotNaKolonata(kol) === undefined) continue;
      const pk = r.kletki.find((k) => k.kolona === kol.klyuch);
      // Категорията и Имотът на Обектите идват от групата
      if (
        kol.vid === 'izbor' &&
        r.grupa !== null &&
        t.grupirane?.some((g) => g.kolona === kol.klyuch && g.vKletkataNa !== undefined)
      ) {
        if (r.grupa.kategoriya !== null) kletki[kol.klyuch] = { nomer: r.grupa.kategoriya };
        else nevlyaza = true;
        continue;
      }
      if (kol.vid === 'vrazka' && zhivi !== null && pk?.nepoznatRoditel !== undefined) {
        // ред с ключ: родителят е известен от ключа и остава. Същото име (двусмислено
        // сред живите) — нищо за казване; друго име — то е старо, Имотът е преименуван
        const zhivRoditel = zhivi[kol.klyuch];
        const imeNaZhiviya =
          zhivRoditel !== undefined && 'tekst' in zhivRoditel
            ? podravni(imeNaVrazkata(this.o, kol, zhivRoditel.tekst))
            : '';
        if (imeNaZhiviya !== pk.nepoznatRoditel) {
          this.nahodka(
            list,
            pk.adres,
            `Името на Имота „${pk.nepoznatRoditel}" в Книгата е старо — родителят на реда остава, както е в програмата.`,
            'beleshka',
          );
        }
        continue;
      }
      if (kol.vid === 'vrazka') {
        // НЕзадължителна връзка, към която нищо не сочи (неговите заплати и кредити
        // нямат Имот), просто остава празна · находка тук би била шум, не липса
        const nyamaKam =
          (pk === undefined || pk.stoynost === null || pk.stoynost === undefined) &&
          pk?.nepoznatRoditel === undefined &&
          (r.grupa === null ||
            (r.grupa.roditelId === null &&
              r.grupa.imotNomer === null &&
              r.grupa.imotIme === '' &&
              r.grupa.nomerVKnigata === ''));
        if (nyamaKam && !kol.zadalzhitelna) continue;
        const rod = this.roditel(t, r, pk, kol);
        if (rod === null) {
          nevlyaza = true;
          continue;
        }
        kletki[kol.klyuch] = rod.kletka;
        zavisiOt.push(...rod.zavisiOt);
        continue;
      }
      if (pk === undefined) continue;
      if (pk.nepoznatIzbor !== undefined && kol.nomenklatura !== undefined) {
        // растежът е само от Настройки (правило 19) · същата Книга може да я носи там
        const obhvat = this.obhvatNa(kol.nomenklatura, belezi);
        const nova =
          obhvat === null
            ? undefined
            : this.noviStoynosti.get(`${kol.nomenklatura}#${obhvat}#${pk.nepoznatIzbor}`);
        if (nova === undefined) {
          const n = this.o.nomenklaturi.get(kol.nomenklatura);
          // думата Е в номенклатурата, но под ДРУГА категория (Вид под Сграда в ред под
          // Паркинг): „добави я в Настройки" би паднало на Портата (текстът е уникален) —
          // казва се групата, под която трябва да стои
          const drugade =
            n?.podredbaPo === undefined
              ? undefined
              : n.stoynosti.find((x) => podravni(x.tekst) === pk.nepoznatIzbor);
          const kategorii =
            n?.podredbaPo === undefined ? undefined : this.o.nomenklaturi.get(n.podredbaPo);
          const negovaKat =
            drugade === undefined || n?.podredbaPo === undefined
              ? undefined
              : Number(drugade.belezi[n.podredbaPo]);
          const katTekst =
            kategorii === undefined || negovaKat === undefined
              ? ''
              : (poNomer(kategorii, negovaKat)?.tekst ?? String(negovaKat));
          this.nahodka(
            list,
            pk.adres,
            drugade !== undefined && n !== undefined && r.grupa !== null && negovaKat !== undefined
              ? `„${pk.nepoznatIzbor}" е в „${n.ime}", но под „${katTekst}", а редът е под група ${r.grupa.imotNomer ?? '…'}.${r.grupa.kategoriya ?? '…'} (${r.grupa.imotIme} · ${r.grupa.kategoriyaTekst}) — премести го под групата „${r.grupa.imotIme} · ${katTekst}" или напиши над него групов ред „${r.grupa.imotNomer ?? '…'}.${negovaKat} · ${r.grupa.imotIme} · ${katTekst}".`
              : `„${pk.nepoznatIzbor}" не е в „${n?.ime ?? kol.nomenklatura}" — добави я в подтаблицата на листа Настройки(Стопанин) и зареди пак.`,
          );
          nevlyaza = nevlyaza || kol.zadalzhitelna;
          continue;
        }
        kletki[kol.klyuch] = { nomer: nova.nomer };
        zavisiOt.push(nova.indeks);
        continue;
      }
      if (pk.stoynost === undefined) {
        if (kol.zadalzhitelna && zhivi === null) nevlyaza = true;
        continue;
      }
      if (pk.stoynost === null) {
        if (zhivi === null) continue;
        if (zhivi[kol.klyuch] === undefined) continue;
        if (kol.zadalzhitelna) {
          this.nahodka(
            list,
            pk.adres,
            `„${kol.ime}" е задължителна — празната клетка не я изпразва, старото остава.`,
            'beleshka',
          );
          continue;
        }
        kletki[kol.klyuch] = null;
        continue;
      }
      kletki[kol.klyuch] = pk.stoynost;
    }
    if (zhivi === null) {
      for (const kol of t.koloni) {
        if (
          kol.zadalzhitelna &&
          slotNaKolonata(kol) !== undefined &&
          kletki[kol.klyuch] === undefined
        ) {
          nevlyaza = true;
          const pk = r.kletki.find((k) => k.kolona === kol.klyuch);
          if (pk?.stoynost === null || pk === undefined)
            this.nahodka(
              list,
              r.adres,
              `Редът няма „${kol.ime}" — задължителна е, редът не влиза.`,
            );
        }
      }
    }
    return { kletki, zavisiOt: [...new Set(zavisiOt)], nevlyaza };
  }

  /**
   * Ключът на новия ред ВЪТРЕ във файла · кортежът от клетките (родител · категория ·
   * вид · №) или името, където номерът е позиция · за да не влязат два еднакви.
   */
  klyuchVavFayla(t: Tablitsa, kletki: Kletki): string | null {
    if (t.nomeratsiya === undefined) return klyuchBezNomer(t, kletki);
    if (sPozitsiya(t)) {
      const kol = kolonaNaImeto(t);
      const k = kol === undefined ? undefined : kletki[kol];
      return k !== undefined && k !== null && 'tekst' in k ? `ime:${podravni(k.tekst)}` : null;
    }
    const chasti: string[] = [];
    for (const s of t.nomeratsiya?.segmenti ?? []) {
      if (s.ot === 'kategoriya-fiksirana') {
        chasti.push(String(s.nomer));
        continue;
      }
      const kol =
        s.ot === 'roditel' ? t.roditel?.kolona : s.ot === 'broyach' ? undefined : s.kolona;
      const k = kol === undefined ? undefined : kletki[kol];
      if (k === undefined || k === null) return null;
      chasti.push(
        'tekst' in k
          ? k.tekst
          : 'nomer' in k
            ? String(k.nomer)
            : 'chislo' in k
              ? String(k.chislo)
              : String(k.stoynost_st),
      );
    }
    return chasti.join('.');
  }

  /**
   * Кортежът на ред без ключ · от ГРУПАТА и клетките, не от текста в A (неговата
   * Книга има `5.1.1.x` под `5.2`; групата води) · `null` = непълен.
   */
  kortezhNaReda(t: Tablitsa, r: ProchetenRed): string | null {
    const kletka = (kolona: string): Kletka | null => {
      if (t.roditel !== undefined && kolona === t.roditel.kolona && r.grupa?.imotId)
        return { tekst: r.grupa.imotId };
      if (
        r.grupa !== null &&
        t.grupirane?.some((g) => g.kolona === kolona && g.vKletkataNa !== undefined)
      )
        return r.grupa.kategoriya === null ? null : { nomer: r.grupa.kategoriya };
      return r.kletki.find((k) => k.kolona === kolona)?.stoynost ?? null;
    };
    for (const seg of t.nomeratsiya?.segmenti ?? []) {
      const kol =
        seg.ot === 'roditel'
          ? t.roditel?.kolona
          : seg.ot === 'nomenklatura' || seg.ot === 'kolona'
            ? seg.kolona
            : undefined;
      if (kol !== undefined && kletka(kol) === null) return null;
    }
    const n = nomerOtKletki(this.o, t.klyuch, kletka, 0);
    return n.length === 0 ? null : tekstNaNomera(n);
  }

  /** Редът без ключ · същият жив ред, ако се разпознае · `null` = нов · `undefined` = не влиза. */
  razpoznay(
    t: Tablitsa,
    r: ProchetenRed,
    list: string,
    poKortezh: Map<string, string>,
    poIme: Map<string, string[]>,
    videni: Set<string>,
    bezNomer: { readonly po: Map<string, string[]>; readonly kletki: Kletki } | null,
  ): string | null | undefined {
    if (bezNomer !== null) {
      // без номерация (задачите): същият родител · вид · име · начало = същата задача;
      // иначе всеки внос на същата Книга би удвоявал задачите (правило 5)
      const k = klyuchBezNomer(t, bezNomer.kletki);
      const ids = (k === null ? [] : (bezNomer.po.get(k) ?? [])).filter((id) => !videni.has(id));
      if (ids.length === 0) return null;
      if (ids.length > 1) {
        this.nahodka(
          list,
          r.adres,
          `Същата задача стои ${ids.length} пъти в програмата — без ключ не се знае коя; редът не влиза.`,
        );
        return undefined;
      }
      this.nahodka(
        list,
        r.adres,
        `Редът няма ключ — разпознат по родител · вид · име · начало.`,
        'beleshka',
      );
      return ids[0]!;
    }
    if (!sPozitsiya(t)) {
      const kortezh = this.kortezhNaReda(t, r);
      if (kortezh === null || !poKortezh.has(kortezh)) return null;
      const kandidat = poKortezh.get(kortezh)!;
      return videni.has(kandidat) ? null : kandidat;
    }
    const kol = kolonaNaImeto(t);
    const pk = kol === undefined ? undefined : r.kletki.find((k) => k.kolona === kol);
    const ime =
      pk?.stoynost !== undefined && pk.stoynost !== null && 'tekst' in pk.stoynost
        ? podravni(pk.stoynost.tekst)
        : '';
    const ids = (ime === '' ? [] : (poIme.get(ime) ?? [])).filter((id) => !videni.has(id));
    if (ids.length === 0) return null;
    if (ids.length > 1) {
      this.nahodka(
        list,
        r.adres,
        `„${ime}" е име на ${ids.length} живи реда — без ключ не се знае кой; редът не влиза.`,
      );
      return undefined;
    }
    const id = ids[0]!;
    const i = this.o.tablitsi.get(t.klyuch)!.indeks.get(id)!;
    this.nahodka(
      list,
      r.adres,
      `Редът няма ключ — разпознат по името „${ime}" (${tekstNaNomera(nomerNaRed(this.o, t.klyuch, i))}).`,
      'beleshka',
    );
    return id;
  }

  /**
   * Изключването на родител чака изключването на децата му (Портата отказва
   * родител с живи редове под себе си) · втори проход след всички таблици.
   */
  roditelyatChakaDetsata(): void {
    for (const [i, p] of this.predlozheniya.entries()) {
      if (p.vid !== 'izklyuchi') continue;
      const detsa: number[] = [];
      for (const [j, d] of this.predlozheniya.entries()) {
        if (d.vid !== 'izklyuchi' || d.tablitsa === p.tablitsa) continue;
        const t = this.o.model.tablitsi.get(d.tablitsa);
        const tv = this.o.tablitsi.get(d.tablitsa);
        if (t === undefined || tv === undefined) continue;
        const di = tv.indeks.get(d.id);
        if (di === undefined) continue;
        // дете е ред, чиято връзка (Имот · родител на задача) сочи изключвания
        for (const k of t.koloni) {
          if (k.vid !== 'vrazka' || !(k.vrazka ?? []).includes(p.tablitsa)) continue;
          const rod = kletkaNa(tv, di, k.klyuch);
          if (rod !== null && 'tekst' in rod && rod.tekst === p.id) detsa.push(j);
        }
      }
      if (detsa.length > 0) this.predlozheniya[i] = { ...p, zavisiOt: detsa };
    }
  }

  tablitsa(t: Tablitsa): void {
    const pt = this.p.tablitsi.get(t.klyuch);
    const tv = this.o.tablitsi.get(t.klyuch);
    if (pt === undefined || tv === undefined) return;
    const poKortezh = this.poKortezh(t.klyuch);
    const poIme = this.poIme(t);
    const poBezNomer = this.poBezNomer(t);
    const videni = new Set<string>();
    const noviVavFayla = new Map<string, string>();
    let poznati = 0;
    let novi = 0;
    let nevlezli = 0;
    for (const r of pt.redove) {
      let id: string | null | undefined = null;
      let smetnati: ReturnType<Sverchik['kletkiNaReda']> | null = null;
      if (r.klyuch !== null) {
        if (tv.indeks.has(r.klyuch) && !videni.has(r.klyuch)) id = r.klyuch;
        else
          this.nahodka(
            pt.list,
            r.adres,
            videni.has(r.klyuch)
              ? `Ключът на реда е повторен — чета го като нов ред.`
              : `Ключът на реда сочи ред, който го няма — чета го като нов ред.`,
            'beleshka',
          );
      } else {
        // редът без номерация · клетките му (с родителя) се смятат тук и служат и на новия ред
        let bezNomer: { readonly po: Map<string, string[]>; readonly kletki: Kletki } | null = null;
        if (t.nomeratsiya === undefined) {
          const kn = this.kletkiNaReda(t, r, null);
          if (kn.nevlyaza) {
            nevlezli += 1;
            continue;
          }
          smetnati = kn;
          bezNomer = { po: poBezNomer, kletki: kn.kletki };
        }
        id = this.razpoznay(t, r, pt.list, poKortezh, poIme, videni, bezNomer);
      }
      if (id === undefined) {
        nevlezli += 1;
        continue;
      }
      if (id !== null) {
        videni.add(id);
        const i = tv.indeks.get(id)!;
        const zhivRed = redKato(tv, i);
        if (zhivRed.izklyuchen) {
          this.nahodka(
            pt.list,
            r.adres,
            `Редът е изключен в програмата — Книгата не го връща; върни го от таблицата.`,
            'beleshka',
          );
          poznati += 1;
          continue;
        }
        // изпразнен ред с ключ = махнат (Excel не трие ред със заключена клетка; човекът го чисти)
        if (r.kletki.every((k) => k.stoynost === null)) {
          poznati += 1;
          this.dobavi({
            vid: 'izklyuchi',
            tablitsa: t.klyuch,
            id,
            adres: r.adres,
            list: pt.list,
            zashto: `${tekstNaNomera(nomerNaRed(this.o, t.klyuch, i))}${imeNaReda(this.o, t.klyuch, id) === id ? '' : ` „${imeNaReda(this.o, t.klyuch, id)}"`} е изпразнен в Книгата → изключване (само ако го отметнеш).`,
            poPodrazbirane: false,
            zavisiOt: [],
          });
          continue;
        }
        const { kletki, zavisiOt } = this.kletkiNaReda(t, r, zhivRed.kletki);
        const promeneni: Record<string, Kletka | null> = {};
        const razliki: Razlika[] = [];
        for (const [klyuch, nova] of Object.entries(kletki)) {
          const stara = zhivRed.kletki[klyuch] ?? null;
          if (sashti(stara, nova)) continue;
          promeneni[klyuch] = nova;
          const kol = t.koloni.find((c) => c.klyuch === klyuch)!;
          const sled = {
            ...zhivRed.kletki,
            ...Object.fromEntries(Object.entries(kletki).filter(([, v]) => v !== null)),
          } as Record<string, Kletka>;
          razliki.push({
            kakvo: kol.ime,
            bilo: dumiNaKletka(this.o, t.klyuch, klyuch, stara, zhivRed.kletki),
            stava:
              nova === null
                ? ''
                : typeof nova === 'object' && 'tekst' in nova && nova.tekst.startsWith(PREDLOZHENIE)
                  ? nova.tekst
                  : dumiNaKletka(this.o, t.klyuch, klyuch, nova, sled),
          });
        }
        poznati += 1;
        if (razliki.length === 0) continue;
        // СБЛЪСЪК: редът е пипан в програмата СЛЕД износа на тази Книга (правило 6:
        // два писача, сблъсъкът е находка за човек) → неотметнато, с думите
        // по ВЕРИГАТА на реда: чужд писач след износа е също сблъсък; верига, която я няма в
        // служебния лист, е родена след износа (най-тясното печели)
        const kursori = this.p.sluzhebno?.kursori;
        const kursorSeq = kursori?.get(zhivRed.veriga)?.seq ?? 0;
        const sblasak = kursori !== undefined && kursori.size > 0 && zhivRed.seq > kursorSeq;
        const dumi = razliki
          .map((x) => `${x.kakvo}: ${x.bilo || '—'} → ${x.stava || '—'}`)
          .join(' · ');
        this.dobavi({
          vid: 'popravka',
          tablitsa: t.klyuch,
          id,
          kletki: promeneni,
          razliki,
          adres: r.adres,
          list: pt.list,
          zashto: sblasak
            ? `СБЛЪСЪК · ${tekstNaNomera(nomerNaRed(this.o, t.klyuch, i))} е променен в програмата след износа (seq ${zhivRed.seq} > ${kursorSeq}${
                kursori.has(zhivRed.veriga) ? '' : ` · нова верига ${zhivRed.veriga}`
              }) · Книгата иска: ${dumi}`
            : `${tekstNaNomera(nomerNaRed(this.o, t.klyuch, i))} · ${dumi}`,
          poPodrazbirane: !sblasak,
          zavisiOt,
        });
        continue;
      }
      const { kletki, zavisiOt, nevlyaza } = smetnati ?? this.kletkiNaReda(t, r, null);
      if (nevlyaza) {
        nevlezli += 1;
        continue;
      }
      const klyuchVavFayla = this.klyuchVavFayla(t, kletki);
      if (klyuchVavFayla !== null) {
        const parvi = noviVavFayla.get(klyuchVavFayla);
        if (parvi !== undefined) {
          this.nahodka(
            pt.list,
            r.adres,
            `${t.nomeratsiya === undefined ? 'Същата задача' : sPozitsiya(t) ? 'Същият Имот по име' : 'Същият номер'} вече е нов ред в Книгата (${parvi}) — вторият не влиза.`,
          );
          nevlezli += 1;
          continue;
        }
        noviVavFayla.set(klyuchVavFayla, r.adres);
      }
      const nomerVKnigata =
        t.klyuch === 'imoti' && /^\d+$/.test(r.nomeratsiya) ? Number(r.nomeratsiya) : null;
      const indeks = this.dobavi({
        vid: 'nov-red',
        tablitsa: t.klyuch,
        kletki,
        nomerVKnigata,
        adres: r.adres,
        list: pt.list,
        zashto: `${t.sashtnost === VID.zadacha ? 'Нова задача' : `Нов ред в „${t.ime}"`}${r.nomeratsiya === '' ? '' : ` (${r.nomeratsiya} в Книгата)`}: ${opisNaKletkite(this.o, t, kletki)}.`,
        poPodrazbirane: true,
        zavisiOt,
      });
      novi += 1;
      if (r.nomeratsiya !== '')
        this.noviRedovePoNomer.set(r.nomeratsiya, { indeks, sashtnost: t.sashtnost });
      if (t.klyuch === 'imoti') {
        if (nomerVKnigata !== null) this.noviImotiPoNomer.set(nomerVKnigata, indeks);
        const ime = kletki['ime'];
        if (ime !== null && ime !== undefined && 'tekst' in ime)
          this.noviImotiPoIme.set(podravni(ime.tekst), indeks);
      }
    }
    let nevideni = 0;
    const kursoriNaIznosa = this.p.sluzhebno?.kursori;
    for (const i of zhiviteRedove(tv)) {
      const id = tv.id[i] ?? '';
      if (videni.has(id)) continue;
      nevideni += 1;
      const ime = imeNaReda(this.o, t.klyuch, id);
      // ред, записан в програмата СЛЕД износа на тази Книга, не е „махнат" — Книгата е по-стара
      const sledIznosa =
        kursoriNaIznosa !== undefined &&
        kursoriNaIznosa.size > 0 &&
        (tv.seq[i] ?? 0) > (kursoriNaIznosa.get(tv.veriga[i] ?? '')?.seq ?? 0);
      if (sledIznosa) {
        this.nahodka(
          pt.list,
          `ред ${pt.redNaGlavata}`,
          `${tekstNaNomera(nomerNaRed(this.o, t.klyuch, i))}${ime === id ? '' : ` „${ime}"`} е записан в програмата след износа — Книгата е по-стара; не се изключва.`,
          'beleshka',
        );
        continue;
      }
      this.dobavi({
        vid: 'izklyuchi',
        tablitsa: t.klyuch,
        id,
        adres: `ред ${pt.redNaGlavata}`,
        list: pt.list,
        zashto: `${tekstNaNomera(nomerNaRed(this.o, t.klyuch, i))}${ime === id ? '' : ` „${ime}"`} го няма в Книгата → изключване (само ако го отметнеш).`,
        poPodrazbirane: false,
        zavisiOt: [],
      });
    }
    this.sverki.push(
      sverka(
        `сверка · ${t.klyuch} · Книгата`,
        pt.redove.length,
        poznati + novi + nevlezli,
        this.kogato,
        'познати + нови + невлезли',
      ),
    );
    this.sverki.push(
      sverka(
        `сверка · ${t.klyuch} · Огледалото`,
        zhiviteRedove(tv).length,
        videni.size + nevideni,
        this.kogato,
        'видени + невидени',
      ),
    );
  }
}

/**
 * Ключът на ред БЕЗ номерация (задачите) · задължителните клетки + първата дата ·
 * същият ключ разпознава живия ред и лови двойника във файла.
 */
function klyuchBezNomer(t: Tablitsa, kletki: Kletki): string | null {
  const parvaData = t.koloni.find((k) => k.vid === 'data')?.klyuch;
  const chasti = t.koloni
    .filter((k) => slotNaKolonata(k) !== undefined && (k.zadalzhitelna || k.klyuch === parvaData))
    .map((k) => {
      const v = kletki[k.klyuch];
      if (v === undefined || v === null) return '';
      const s = String(Object.values(v)[0] ?? '');
      return 'tekst' in v && k.vid === 'tekst' ? podravni(s) : s;
    });
  return chasti.every((c) => c === '') ? null : chasti.join('|');
}

function opisNaKletkite(o: Ogledalo, t: Tablitsa, kletki: Kletki): string {
  const chasti: string[] = [];
  const sled = Object.fromEntries(Object.entries(kletki).filter(([, v]) => v !== null)) as Record<
    string,
    Kletka
  >;
  // всички колони със слот · и опашката на слятата (името на задачата), не само редът на Книгата
  for (const kol of t.koloni) {
    if (slotNaKolonata(kol) === undefined) continue;
    const k = kletki[kol.klyuch];
    if (k === undefined || k === null) continue;
    const dumi =
      'tekst' in k && k.tekst.startsWith(PREDLOZHENIE)
        ? k.tekst
        : dumiNaKletka(o, t.klyuch, kol.klyuch, k, sled);
    if (dumi !== '') chasti.push(`${kol.kratko ?? kol.ime} ${dumi}`);
  }
  return chasti.join(' · ');
}

/** Сверява прочетената Книга с Огледалото · връща отчета · нищо не пише. */
export function sveri(o: Ogledalo, p: ProchetenaKnigaVKletki, kogato: string): Otchet {
  const s = new Sverchik(o, p, kogato);
  if (p.sluzhebno !== null) {
    if (p.sluzhebno.versiya !== null && p.sluzhebno.versiya !== o.model.versiya) {
      s.nahodka(
        'служебен',
        'versiya',
        `Книгата е с Модел версия ${p.sluzhebno.versiya}, а програмата е ${o.model.versiya} — нищо не се предлага.`,
      );
    } else if (
      p.sluzhebno.otpechatak !== '' &&
      p.sluzhebno.otpechatak !== otpechatakNaModela(o.model)
    ) {
      s.nahodka(
        'служебен',
        'otpechatak',
        'Книгата е правена с друг Модел (различен отпечатък) — нищо не се предлага.',
      );
    }
  }
  if (p.sluzhebno !== null && p.sluzhebno.stopanin !== '' && p.sluzhebno.stopanin !== o.stopanin) {
    s.nahodka(
      'служебен',
      'stopanin',
      'Книгата е изнесена от друг Стопанин — не се слива с тази (правило 21); нищо не се предлага.',
    );
  }
  const spira = s.nahodki.some((n) => n.list === 'служебен');
  if (!spira) {
    // първо Настройки: новите стойности там са единственият път на растеж (правило 19)
    s.nomenklaturi();
    for (const t of o.model.tablitsi.values()) s.tablitsa(tablitsata(o.model, t.klyuch));
    s.roditelyatChakaDetsata();
  }
  const nahodki = s.nahodki.filter((n) => n.stepen === 'greshka').length;
  return {
    predlozheniya: s.predlozheniya,
    nahodki: s.nahodki,
    sverki: [...p.sverki, ...s.sverki],
    sluzhebno: p.sluzhebno,
    obobshtenie: `${s.predlozheniya.length} предложения · ${nahodki} находки · ${s.nahodki.length - nahodki} бележки`,
  };
}
