/**
 * ДДС · редът по знака · натрупването по месеци · сверките · и таблицата с
 * находки на подтаб НАП (ADR-007).
 *
 * Негово (05.09 т.2): „…зависимост за внасяне или за плащане към нас е знака на
 * ддс… възможност да декларираш колко си платил и колко остава…" и „таблица за
 * проблеми с сверките на всички нива от Сметки: ДДС, Фактури, Контрагенти".
 */

import { describe, expect, it } from 'vitest';
import { eOtkaz, type Otkaz } from '../src/komandi/izpalnenie.js';
import { MODEL } from '../src/model/osnova.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import { ddsat, stranaNaDdsa } from '../src/smetach/dds.js';
import { nahodkiteNaNap, NIVA, PROVERKI } from '../src/smetach/nahodki-nap.js';
import { nomerNaSektsiya, SEKTSIYA_ZAPLATI_KESH } from '../src/smetach/smetki.js';
import { KNIGA, knigaZaTest, STOPANIN } from './pomoshtni.js';

const KOGATO = '2026-09-05T13:00:00.000Z';
const DNES = '2026-09-05';
const MESETS = '2026-08';

function otkazat(r: unknown): Otkaz {
  if (!eOtkaz(r)) throw new Error(`очаквах отказ, а мина: ${JSON.stringify(r)}`);
  return r;
}

async function otvori() {
  const k = knigaZaTest();
  let takt = 0;
  const iz = await Izpalnitel.otvori({
    vrata: k.vrata,
    dnevnik: k.dnevnik,
    model: MODEL,
    veriga: KNIGA,
    aktor: () => STOPANIN,
    sega: () => {
      takt += 1;
      return new Date(Date.parse(KOGATO) + takt * 1000).toISOString();
    },
  });
  const zapishi = async (id: string, klyuch: string, tovar: unknown) => {
    const r = await iz.izpalni(id, klyuch, tovar);
    if ('otkaz' in r) throw new Error(r.zashto.join(' | '));
    return r;
  };
  await zapishi('k0', 'stopanin.otkriy', { imeyl: STOPANIN });
  return { iz, zapishi };
}

const dds = (mesets: string, oshte: Record<string, unknown> = {}) => ({
  mesets,
  nachislen: null,
  kredit: null,
  deklarirano: null,
  plateno: null,
  izdadeni: null,
  plateni: null,
  ...oshte,
});

const dvizhenie = (oshte: Record<string, unknown>) => ({
  kletki: {
    kam: null,
    ime: null,
    sektsiya: null,
    sektsiyaR: null,
    funktsiya: { nomer: 3 },
    sastoyanie: { nomer: 2 },
    mesets: { tekst: MESETS },
    suma: null,
    ...oshte,
  },
});

describe('ДДС · знакът решава страната', () => {
  it('за внасяне е РАЗХОД · за възстановяване е ПРИХОД · нулата няма страна', () => {
    expect(stranaNaDdsa(1)).toBe('razhod');
    expect(stranaNaDdsa(-1)).toBe('prihod');
    expect(stranaNaDdsa(0)).toBe(null);
  });

  it('дължимото се СМЯТА · остатъкът също · и редът влиза в Сметки с обратен знак', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi(
      'd1',
      'smetki.zapishiDds',
      dds(MESETS, {
        nachislen: { stoynost_st: 240000 },
        kredit: { stoynost_st: 90000 },
        deklarirano: { stoynost_st: 150000 },
        plateno: { stoynost_st: 100000 },
      }),
    );
    const m = ddsat(iz.ogledalo(), KOGATO).mesetsi[0]!;
    expect([m.dalzhimo, m.deklarirano, m.plateno, m.ostatak]).toEqual([
      150000, 150000, 100000, 50000,
    ]);
    // за внасяне · разход · затова в Сметки влиза с МИНУС (правило 20)
    expect([m.strana, m.suma]).toEqual(['razhod', -150000]);
    expect(m.sverki[0]?.nared).toBe(true);
    expect(m.sverki[1]?.nared).toBe(false);
    expect(m.sverki[1]?.razlika).toBe(-50000);
  });

  it('данъчен кредит над начисления обръща страната · и сумата става приход', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi(
      'd1',
      'smetki.zapishiDds',
      dds(MESETS, { nachislen: { stoynost_st: 50000 }, kredit: { stoynost_st: 80000 } }),
    );
    const m = ddsat(iz.ogledalo(), KOGATO).mesetsi[0]!;
    expect([m.dalzhimo, m.strana, m.suma]).toEqual([-30000, 'prihod', 30000]);
  });

  it('натрупването по месеци · дължимо − платено = остатък · и сверката затваря', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi(
      'd1',
      'smetki.zapishiDds',
      dds('2026-07', { nachislen: { stoynost_st: 100000 }, plateno: { stoynost_st: 100000 } }),
    );
    await zapishi('d2', 'smetki.zapishiDds', dds('2026-08', { nachislen: { stoynost_st: 60000 } }));
    const d = ddsat(iz.ogledalo(), KOGATO);
    expect(d.mesetsi.map((m) => m.mesets)).toEqual(['2026-07', '2026-08']);
    expect([d.dalzhimo, d.plateno, d.ostatak]).toEqual([160000, 100000, 60000]);
    expect(d.sverka.nared).toBe(true);
  });

  it('един ред на месец · вторият запис поправя същия ред · месецът се проверява', async () => {
    const { iz, zapishi } = await otvori();
    await zapishi('d1', 'smetki.zapishiDds', dds(MESETS, { nachislen: { stoynost_st: 1000 } }));
    await zapishi('d2', 'smetki.zapishiDds', dds(MESETS, { nachislen: { stoynost_st: 2000 } }));
    const tv = iz.ogledalo().tablitsi.get('dds')!;
    expect(tv.broy).toBe(1);
    expect(tv.id[0]).toBe('dds:2026-08');
    expect(ddsat(iz.ogledalo(), KOGATO).mesetsi[0]?.nachislen).toBe(2000);
    expect(otkazat(iz.probvay('x', 'smetki.zapishiDds', dds('2026-8'))).zashto[0]).toMatch(
      /не е месец ГГГГ-ММ/,
    );
    expect(otkazat(iz.probvay('x', 'smetki.zapishiDds', dds(MESETS))).zashto[0]).toMatch(
      /всички полета са празни/,
    );
  });
});

describe('таблицата с находки на подтаб НАП', () => {
  it('нивата са неговите три · всяка проверка е назована', () => {
    expect([...NIVA]).toEqual(['ДДС', 'Фактури', 'Контрагенти']);
    expect(PROVERKI).toHaveLength(9);
    expect(new Set(PROVERKI.map((p) => p.klyuch)).size).toBe(PROVERKI.length);
    for (const p of PROVERKI) expect(NIVA).toContain(p.nivo);
  });

  it('празно Огледало · нула находки · и деветте проверки пак минават', async () => {
    const { iz } = await otvori();
    const o = nahodkiteNaNap(iz.ogledalo(), DNES, KOGATO);
    expect(o.nahodki).toEqual([]);
    expect([o.proverki, o.sProblem]).toEqual([9, 0]);
  });

  it('ДДС · декларирано ≠ дължимо · платено ≠ декларирано · месец без ред', async () => {
    const { iz, zapishi } = await otvori();
    const zaplati = nomerNaSektsiya(iz.ogledalo(), 'razhod', SEKTSIYA_ZAPLATI_KESH)!;
    await zapishi(
      'dv1',
      'smetki.dobaviDvizhenie',
      dvizhenie({
        ime: { tekst: 'ЕВН' },
        sektsiyaR: { nomer: zaplati },
        suma: { stoynost_st: -1000 },
      }),
    );
    await zapishi(
      'd1',
      'smetki.zapishiDds',
      dds('2026-07', {
        nachislen: { stoynost_st: 100000 },
        deklarirano: { stoynost_st: 90000 },
        plateno: { stoynost_st: 80000 },
        izdadeni: { stoynost_st: 0 },
      }),
    );
    const n = nahodkiteNaNap(iz.ogledalo(), DNES, KOGATO).nahodki;
    const po = (klyuch: string) => n.filter((x) => x.proverka === klyuch);
    expect(po('dds-deklarirano')[0]?.razlika).toBe(10000);
    expect(po('dds-plateno')[0]?.razlika).toBe(10000);
    // месецът с движението (2026-08) няма ред за ДДС
    expect(po('dds-lipsva').map((x) => x.adres)).toEqual([MESETS]);
  });

  it('счетоводството с МЕСЕЦ назад · липсата за минал месец е находка, за текущия — не', async () => {
    const { iz, zapishi } = await otvori();
    const zaplati = nomerNaSektsiya(iz.ogledalo(), 'razhod', SEKTSIYA_ZAPLATI_KESH)!;
    await zapishi(
      'dv1',
      'smetki.dobaviDvizhenie',
      dvizhenie({
        ime: { tekst: 'ЕВН' },
        sektsiyaR: { nomer: zaplati },
        suma: { stoynost_st: -1000 },
      }),
    );
    await zapishi('d1', 'smetki.zapishiDds', dds(MESETS, { nachislen: { stoynost_st: 1 } }));
    const minal = nahodkiteNaNap(iz.ogledalo(), DNES, KOGATO).nahodki.filter(
      (x) => x.proverka === 'fakturi-schetovodstvo',
    );
    expect(minal[0]?.kakvo).toMatch(/счетоводството още не е вкарало/);
    // ако „днес" е в СЪЩИЯ месец, числата още не се чакат
    const sasht = nahodkiteNaNap(iz.ogledalo(), '2026-08-20', KOGATO).nahodki.filter(
      (x) => x.proverka === 'fakturi-schetovodstvo',
    );
    expect(sasht).toEqual([]);
  });

  it('Контрагенти · без име и с две изписвания на едно име', async () => {
    const { iz, zapishi } = await otvori();
    const fakturi = nomerNaSektsiya(iz.ogledalo(), 'razhod', 'Фактури Кеш')!;
    await zapishi(
      'dv1',
      'smetki.dobaviDvizhenie',
      dvizhenie({ sektsiyaR: { nomer: fakturi }, suma: { stoynost_st: -1000 } }),
    );
    await zapishi(
      'dv2',
      'smetki.dobaviDvizhenie',
      dvizhenie({
        ime: { tekst: 'ЕВН България' },
        sektsiyaR: { nomer: fakturi },
        suma: { stoynost_st: -2000 },
      }),
    );
    await zapishi(
      'dv3',
      'smetki.dobaviDvizhenie',
      dvizhenie({
        ime: { tekst: 'ЕВН-България' },
        sektsiyaR: { nomer: fakturi },
        suma: { stoynost_st: -3000 },
      }),
    );
    const n = nahodkiteNaNap(iz.ogledalo(), DNES, KOGATO).nahodki;
    expect(n.filter((x) => x.proverka === 'kontragenti-bez-ime')).toHaveLength(1);
    const blizki = n.filter((x) => x.proverka === 'kontragenti-blizki');
    expect(blizki).toHaveLength(1);
    expect(blizki[0]?.kakvo).toMatch(/ЕВН България · ЕВН-България/);
  });

  it('Фактури · ред без Състояние и ред извън секция се казват', async () => {
    const { iz, zapishi } = await otvori();
    const fakturi = nomerNaSektsiya(iz.ogledalo(), 'razhod', 'Фактури Кеш')!;
    await zapishi(
      'dv1',
      'smetki.dobaviDvizhenie',
      dvizhenie({
        ime: { tekst: 'ЕВН' },
        sektsiyaR: { nomer: fakturi },
        sastoyanie: null,
        suma: { stoynost_st: -1000 },
      }),
    );
    const n = nahodkiteNaNap(iz.ogledalo(), DNES, KOGATO).nahodki;
    expect(n.filter((x) => x.proverka === 'fakturi-nesvereni')).toHaveLength(1);
    expect(n.every((x) => NIVA.includes(x.nivo))).toBe(true);
  });
});
