/**
 * ОБЩИТЕ ДЕЙСТВИЯ на прозорците с таблици · Имоти и Управление (ADR-005).
 *
 * Изпълнение от дясното меню (със Сторно с причина в прозорче) и „Запази
 * книгата": Огледало → лист → файл → ЧАК тогава разписката през Портата
 * (ADR-003, решение 11). Един дом, за да не се разминат двата екрана.
 */

import { MODEL } from '../../src/model/osnova.js';
import { otpechatakNaModela } from '../../src/model/otpechatak.js';
import { dumiZaGreshka } from '../../src/yadro/dumi.js';
import type { Buton, Izbran } from '../../src/porta/porta.js';
import type { DumaOtKnigata } from '../../src/model/dumi-ot-knigata.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { pokazhiMenyu, type Tochka } from '../reshetka/menyu.js';
import { ekraniraj, svaliFayl } from '../reshetka/obshto.js';
import { otvoriProzorets } from '../reshetka/prozorets.js';
import { pokazhiGreshka } from '../reshetka/redaktsiya.js';
import { dumiteHTML } from './profil.js';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
/** думите за последния износ · живеят извън тялото, защото всеки запис го прерисува */
let iznosVest = '';

export function iznosVestHTML(): string {
  return `<p class="vest" data-iznos-vest>${ekraniraj(iznosVest)}</p>`;
}

export async function izpalniOtMenyuto(
  k: KonteksNaEkrana,
  klyuch: string,
  tovar: unknown,
): Promise<void> {
  if (klyuch === 'obshto.storno') {
    const zatvori = otvoriProzorets({
      zaglavie: 'Сторно на последната промяна',
      pod: 'Журналът не се пипа: сторното е ново събитие с причина, а Огледалото се пресгъва.',
      tyalo: `<form data-storno-forma class="red-poleta"><input class="pole" data-prichina placeholder="причина" required><button type="submit">Сторнирай</button></form><p class="greshka" data-storno-greshka></p>`,
    });
    const forma = document.querySelector<HTMLFormElement>('[data-storno-forma]');
    forma?.querySelector<HTMLInputElement>('[data-prichina]')?.focus();
    forma?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const prichina = forma.querySelector<HTMLInputElement>('[data-prichina]')?.value.trim() ?? '';
      const r = await k.porta.izpalni(crypto.randomUUID(), klyuch, {
        ...(tovar as Record<string, unknown>),
        prichina,
      });
      if ('otkaz' in r) {
        const g = document.querySelector('[data-storno-greshka]');
        if (g) g.textContent = r.zashto.join(' ');
        return;
      }
      zatvori();
      // Живо Сторно = пълно пресгъване от Дневника (решение 8).
      await k.porta.prezaredi();
    });
    return;
  }
  const r = await k.porta.izpalni(crypto.randomUUID(), klyuch, tovar);
  if ('otkaz' in r) pokazhiGreshka(k.tyalo, r.zashto.join(' '));
}

/** Казва думите за износа · и след прерисуване, защото ги пази и ги рисува наново. */
function kazhiZaIznosa(k: KonteksNaEkrana, dumi: string): void {
  iznosVest = dumi;
  const vest = k.tyalo.querySelector('[data-iznos-vest]');
  if (vest) vest.textContent = dumi;
}

export async function zapaziKnigata(k: KonteksNaEkrana): Promise<void> {
  kazhiZaIznosa(k, 'пиша Книгата…');
  try {
    const o = k.porta.ogledalo();
    const kursor = o.kursori.get(k.veriga) ?? { naematel: k.veriga, seq: 0, hash: '' };
    const sega = new Date().toISOString();
    const [{ knigataOtOgledaloto }, { napishiKniga }] = await Promise.all([
      import('../../src/kniga/pisane.js'),
      import('../../src/kniga/ooxml.js'),
    ]);
    const kniga = knigataOtOgledaloto(o, kursor, sega);
    const baytove = await napishiKniga(kniga.listove);
    svaliFayl(new Blob([baytove as unknown as ArrayBuffer], { type: XLSX }), 'Coretovia.xlsx');
    const r = await k.porta.izpalni(crypto.randomUUID(), 'kniga.iznesi', {
      otpechatak: otpechatakNaModela(MODEL),
      kursor,
      redove: kniga.redove,
      iznesenoNa: sega,
    });
    const zhivi = Object.values(kniga.redove).reduce((a, b) => a + b, 0);
    const zatvaryat = kniga.sverki.filter((s) => s.nared).length;
    kazhiZaIznosa(
      k,
      'otkaz' in r
        ? `Книгата е свалена, но разписката е отказана: ${r.zashto.join(' ')}`
        : `Книгата е записана · ${zhivi} живи реда · сверки: ${zatvaryat} от ${kniga.sverki.length} затварят · seq ${kursor.seq}`,
    );
  } catch (g) {
    kazhiZaIznosa(k, `Книгата не се записа: ${dumiZaGreshka(g)}`);
  }
}

/**
 * Какво прави екранът с отговора на Портата · отказът се КАЗВА (правило 12), а
 * повтореното иска ново рисуване, защото абонаментът мълчи при нула нови звена.
 */
export function otgovoratNaPortata(
  k: KonteksNaEkrana,
  r: {
    readonly otkaz?: unknown;
    readonly zashto?: readonly string[];
    readonly povtoreno?: boolean;
  },
): boolean {
  if ('otkaz' in r) {
    pokazhiGreshka(k.tyalo, (r.zashto ?? []).join(' '));
    return false;
  }
  pokazhiGreshka(k.tyalo, '');
  if (r.povtoreno === true) k.prerisuvay();
  return true;
}

/**
 * КРАЯТ на прозорец с диаграма · блокът на Ганта, вестта за износа и думите му
 * от Книгата. Управление и Сметки го делят: една дума, един дом (правило 14).
 */
export function gantIDumiHTML(
  lenta: string,
  dumi: readonly DumaOtKnigata[],
  skrit = false,
): string {
  return `<div class="gant-blok" data-blok="gant" ${skrit ? 'hidden' : ''}>
        <h2 class="lenta" translate="no">${ekraniraj(lenta)}</h2>
        <div class="gant-skrol" data-gant-skrol></div>
        <p class="pod-tablitsata" data-sverka="gant"></p>
      </div>
    </section>
    ${iznosVestHTML()}
    <details class="dumite-blok"><summary>думите му от Книгата</summary>${dumiteHTML(dumi)}</details>`;
}

/**
 * Дясното меню върху ред · пунктовете идват от каталога с предусловията върху
 * избрания ред (`porta.butoniZa`); какво прави пунктът решава прозорецът, а
 * `oshte` добавя пунктове, които каталогът няма (Голямо дело · „идва с резен 8").
 */
export function zakachiDyasnoMenyu(
  k: KonteksNaEkrana,
  prozorets: string,
  deystvie: (b: Buton, red: HTMLElement) => void,
  oshte: (izbran: Izbran) => readonly Tochka[] = () => [],
): void {
  k.tyalo.addEventListener('contextmenu', (e) => {
    const red = (e.target as HTMLElement).closest<HTMLElement>('tr.red[data-id]');
    if (!red) return;
    e.preventDefault();
    const izbran = { tablitsa: red.dataset['tablitsa'] ?? '', id: red.dataset['id'] ?? '' };
    const tochki: Tochka[] = k.porta
      .butoniZa(prozorets, izbran)
      .filter((b) => b.myasto === 'desen-buton')
      .map((b) => ({
        klyuch: b.klyuch,
        ime: b.ime,
        razreshena: b.razreshena,
        zashto: b.zashto,
        deystvie: () => deystvie(b, red),
      }));
    pokazhiMenyu(e.clientX, e.clientY, [...tochki, ...oshte(izbran)]);
  });
}
