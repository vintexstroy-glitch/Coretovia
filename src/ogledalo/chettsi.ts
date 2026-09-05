/**
 * ЧЕТЦИТЕ · по един на тип събитие · ТИПИЗИРАН литерал върху `TipSabitie`.
 *
 * Нов тип без четец не се компилира — компилаторът брои пълнотата, не тест.
 * Четецът получава събитие, което ВЕЧЕ е минало проверката на товара и не е
 * погасено; той само прилага.
 */

import { poNomer, sStoynost, spri } from '../model/nomenklatura.js';
import { TIP, type TipSabitie } from '../sabitiya/registar.js';
import type {
  PayloadKnigaIznesena,
  PayloadRedIzklyuchen,
  PayloadRedZapisan,
  PayloadStopaninZapisan,
  PayloadStoynostSpryana,
  PayloadStoynostZapisana,
} from '../sabitiya/tovari.js';
import type { Sabitie } from '../yadro/sabitie.js';
import type { StroezhNaOgledaloto } from './stroezh.js';

export type Chetets = (s: Sabitie, st: StroezhNaOgledaloto) => void;

/** Товарът, вече проверен · привеждането е на едно място, не във всеки четец. */
function tovar<T>(s: Sabitie): T {
  return s.payload as unknown as T;
}

export const CHETTSI: Readonly<Record<TipSabitie, Chetets>> = Object.freeze({
  [TIP.stopaninZapisan]: (s, st) => {
    if (st.stopanin === '') st.stopanin = tovar<PayloadStopaninZapisan>(s).imeyl;
  },

  [TIP.stoynostZapisana]: (s, st) => {
    const p = tovar<PayloadStoynostZapisana>(s);
    const n = st.nomenklatura(p.nomenklatura);
    const stara = poNomer(n, p.nomer, p.belezi);
    // същият номер = преименуване (пази базова/спряна) · нов номер = добавяне
    const nova =
      stara === undefined
        ? { nomer: p.nomer, tekst: p.tekst, bazova: false, spryana: false, belezi: p.belezi }
        : { ...stara, tekst: p.tekst, belezi: p.belezi };
    st.nomenklaturi.set(p.nomenklatura, sStoynost(n, nova));
  },

  [TIP.stoynostSpryana]: (s, st) => {
    const p = tovar<PayloadStoynostSpryana>(s);
    const n = st.nomenklatura(p.nomenklatura);
    // спиране на непознат номер няма какво да спре · брои се като приложено без следа
    if (poNomer(n, p.nomer, p.belezi) === undefined) return;
    st.nomenklaturi.set(p.nomenklatura, sStoynost(n, spri(n, p.nomer, p.spryana, p.belezi)));
  },

  [TIP.redZapisan]: (s, st) => {
    const p = tovar<PayloadRedZapisan>(s);
    st.tablitsa(p.tablitsa).zapishi(p.id, s.naematel, s.seq, p.kletki);
  },

  [TIP.redIzklyuchen]: (s, st) => {
    const p = tovar<PayloadRedIzklyuchen>(s);
    st.tablitsa(p.tablitsa).izklyuchi(p.id, s.naematel, s.seq, p.izklyuchen);
  },

  [TIP.knigaIznesena]: (s, st) => {
    st.knigi.push(tovar<PayloadKnigaIznesena>(s));
  },

  // Сторното се прилага като МАСКА в първия проход на `fold`; дотук не стига.
  [TIP.storno]: () => undefined,
});
