/**
 * КАЛКУЛАТОРЪТ · трите подхода, съгласуването и оценката над Продажбите (ADR-012).
 *
 * Ядрата са пренесени от MasterBook и тестовете им идват с тях: всичко се смята
 * в цели числа и се дели ВЕДНЪЖ, накрая. Тук се пази и онова, което пренесеното
 * научи по трудния начин — че земята не овехтява, че нулевият подход се
 * ИЗКЛЮЧВА, а не се смята, и че липсващото число не ражда половин сметка.
 */

import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/model/osnova.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import {
  GreshkaMatritsa,
  ochakvanNaem_st,
  ostavashtiOtSgradata_bt,
  saglasuvana,
  teglataZatvaryat,
  tsenaOtChasti,
  tsenaPazarno,
  tsenaPoRazhod,
  tsenaPoSastoyanie,
} from '../src/smetach/kalkulator/matritsa.js';
import {
  bazataENegova,
  EDINITSA_BT,
  NEGOVI_BAZI,
  NEGOVI_PARAMETRI,
  PO_PODRAZBIRANE,
  razhodniyatNeVodi,
  sboratNaTeglata,
  VIDOVE_OBEKT,
} from '../src/smetach/kalkulator/nastroyki.js';
import { otseni, otsenkata, vidatOtImeto } from '../src/smetach/kalkulator/stoynost.js';
import { KNIGA, knigaZaTest, STOPANIN } from './pomoshtni.js';

const KOGATO = '2026-09-06T10:00:00.000Z';
/** сто квадратни метра в цели кв. см */
const STO_KVM = 1_000_000;

describe('числата и чии са', () => {
  it('мерната единица и петте вида са ЗАКОВАНИ с ръка', () => {
    // 1,00 = 10 000 базисни точки · оттук тръгва всяко умножение
    expect(EDINITSA_BT).toBe(10_000);
    expect(VIDOVE_OBEKT).toEqual(['apartament', 'garazh', 'parkomyasto', 'sklad', 'drug']);
  });

  it('и петте бази са НЕГОВИ · апартаментът е 3 000 €/м² (И53 · И55)', () => {
    expect(PO_PODRAZBIRANE.baza_st.apartament).toBe(300_000);
    for (const vid of VIDOVE_OBEKT) {
      if (vid === 'apartament') continue;
      expect(PO_PODRAZBIRANE.baza_st[vid], vid).toBe(200_000);
    }
    expect([...NEGOVI_BAZI]).toEqual([...VIDOVE_OBEKT]);
    expect(VIDOVE_OBEKT.every((v) => bazataENegova(v))).toBe(true);
  });

  it('нито един параметър на разходния подход не е негов · и това е СЪСТОЯНИЕ', () => {
    expect(NEGOVI_PARAMETRI).toEqual([]);
    // проученото (ADR-072): полезният живот е 100 г., поправен от 70
    expect(PO_PODRAZBIRANE.polezen_zhivot_g).toBe(100);
    expect(PO_PODRAZBIRANE.zemya_st_kvm.apartament).toBe(60_000);
    expect(PO_PODRAZBIRANE.stroitelna_st_kvm.apartament).toBe(120_000);
  });

  it('теглата затварят на 100 % · и разходният НЕ води', () => {
    expect(sboratNaTeglata(PO_PODRAZBIRANE.tegla)).toBe(EDINITSA_BT);
    expect(teglataZatvaryat(PO_PODRAZBIRANE.tegla)).toBe(true);
    expect(PO_PODRAZBIRANE.tegla).toEqual({
      pazaren_bt: 5_000,
      dohoden_bt: 1_000,
      razhoden_bt: 4_000,
    });
    expect(razhodniyatNeVodi(PO_PODRAZBIRANE.tegla)).toBe(true);
    expect(razhodniyatNeVodi({ pazaren_bt: 3_000, dohoden_bt: 1_000, razhoden_bt: 6_000 })).toBe(
      false,
    );
  });
});

describe('трите подхода', () => {
  it('А · пазарният е площ × база · сто кв. м апартамент са 300 000 €', () => {
    expect(tsenaPazarno({ obshta_kvsm: STO_KVM, vid: 'apartament' })).toBe(30_000_000);
    expect(tsenaPazarno({ obshta_kvsm: STO_KVM, vid: 'garazh' })).toBe(20_000_000);
  });

  it('коефициентите се умножават ЦЕЛИ · 1,05 × 0,97 не е 1,0184999999999998', () => {
    // във float 1,05 × 0,97 дава 1,0184999999999998; в базисни точки — 10 185
    const sKoef = tsenaOtChasti({
      obshta_kvsm: STO_KVM,
      baza_st: 300_000,
      koefitsienti_bt: [10_500, 9_700],
    });
    expect(sKoef).toBe(30_555_000);
    // добавката влиза НАКРАЯ и не се умножава по нищо
    expect(
      tsenaOtChasti({
        obshta_kvsm: STO_KVM,
        baza_st: 300_000,
        koefitsienti_bt: [10_500],
        dobavka_st: 500_000,
      }),
    ).toBe(32_000_000);
    expect(() => tsenaOtChasti({ obshta_kvsm: 1.5, baza_st: 1, koefitsienti_bt: [] })).toThrow(
      GreshkaMatritsa,
    );
  });

  it('Б · доходният капитализира ЧОД · нулевият наем дава нула, и това е отговор', () => {
    const naem = ochakvanNaem_st(STO_KVM, 'apartament');
    expect(naem).toBe(85_000); // 8,50 €/м² × 100 м²
    // 85 000 × 12 × 0,92 × 0,85 ÷ 0,032
    expect(tsenaPoSastoyanie({ naem_mesechen_st: naem })).toBe(24_926_250);
    expect(tsenaPoSastoyanie({ naem_mesechen_st: 0 })).toBe(0);
  });

  it('В · разходният · ЗЕМЯТА не овехтява', () => {
    // нова сграда: остават 100 % · 600 + 1 200 = 1 800 €/м² × 100 м²
    expect(ostavashtiOtSgradata_bt()).toBe(EDINITSA_BT);
    expect(tsenaPoRazhod({ obshta_kvsm: STO_KVM, vid: 'apartament' })).toBe(18_000_000);
    // сграда на 50 години · строителната пада наполовина, ЗЕМЯТА остава цяла
    const na50 = { ...PO_PODRAZBIRANE, vazrast_g: 50 };
    expect(ostavashtiOtSgradata_bt(na50)).toBe(5_000);
    expect(tsenaPoRazhod({ obshta_kvsm: STO_KVM, vid: 'apartament', nastroyki: na50 })).toBe(
      12_000_000,
    );
    // изхабена докрай · остава САМО земята, не нула
    const stara = { ...PO_PODRAZBIRANE, vazrast_g: 200 };
    expect(tsenaPoRazhod({ obshta_kvsm: STO_KVM, vid: 'apartament', nastroyki: stara })).toBe(
      6_000_000,
    );
  });

  it('ЕДНО липсващо число не ражда половин сметка · подходът отпада цял', () => {
    const bezZemya = {
      ...PO_PODRAZBIRANE,
      zemya_st_kvm: { ...PO_PODRAZBIRANE.zemya_st_kvm, apartament: 0 },
    };
    expect(tsenaPoRazhod({ obshta_kvsm: STO_KVM, vid: 'apartament', nastroyki: bezZemya })).toBe(0);
    // само земя (Имот със статут „земя") · сграда няма да овехтява
    expect(tsenaPoRazhod({ obshta_kvsm: STO_KVM, vid: 'apartament', samoZemya: true })).toBe(
      6_000_000,
    );
  });
});

describe('съгласуването', () => {
  it('претегля трите · и сборът на теглата трябва да затваря', () => {
    const s = saglasuvana({
      pazaren_st: 30_000_000,
      dohoden_st: 24_926_250,
      razhoden_st: 18_000_000,
      tegla: PO_PODRAZBIRANE.tegla,
    });
    // 0,5 × 30 000 000 + 0,1 × 24 926 250 + 0,4 × 18 000 000
    expect(s.tochno_st).toBe(24_692_625);
    expect(s.otpadnali).toEqual([]);
    expect(s.deystvashti).toEqual(PO_PODRAZBIRANE.tegla);
    expect(() =>
      saglasuvana({
        pazaren_st: 1,
        dohoden_st: 1,
        razhoden_st: 1,
        tegla: { pazaren_bt: 5_000, dohoden_bt: 1_000, razhoden_bt: 5_000 },
      }),
    ).toThrow(/Тегло, което не затваря/);
  });

  it('НУЛЕВИЯТ подход се ИЗКЛЮЧВА · теглото му се пренасочва и се КАЗВА', () => {
    const s = saglasuvana({
      pazaren_st: 30_000_000,
      dohoden_st: 0,
      razhoden_st: 18_000_000,
      tegla: PO_PODRAZBIRANE.tegla,
    });
    expect(s.otpadnali).toEqual(['доходен']);
    // 5 000 и 4 000 се пренормират до 10 000 · остатъкът отива на най-голямото
    expect(s.deystvashti).toEqual({ pazaren_bt: 5_556, dohoden_bt: 0, razhoden_bt: 4_444 });
    expect(sboratNaTeglata(s.deystvashti)).toBe(EDINITSA_BT);
    // и резултатът е МЕЖДУ двата оцелели, не под тях
    expect(s.tochno_st).toBeGreaterThan(18_000_000);
    expect(s.tochno_st).toBeLessThan(30_000_000);
  });

  it('всички нули дават нула · и трите отпаднали са назовани', () => {
    const s = saglasuvana({
      pazaren_st: 0,
      dohoden_st: 0,
      razhoden_st: 0,
      tegla: PO_PODRAZBIRANE.tegla,
    });
    expect([s.tochno_st, s.otpadnali]).toEqual([0, ['пазарен', 'доходен', 'разходен']]);
  });
});

describe('видът се чете от НЕГОВОТО име', () => {
  it('петте му думи от листа Продажби', () => {
    expect(vidatOtImeto('апарт. № 1')).toEqual({ vid: 'apartament', poDumata: 'апарт' });
    expect(vidatOtImeto('ателие № 1').vid).toBe('apartament');
    expect(vidatOtImeto('гараж № 4').vid).toBe('garazh');
    expect(vidatOtImeto('НПМ № 12').vid).toBe('parkomyasto');
    expect(vidatOtImeto('мазе 2').vid).toBe('sklad');
    // нищо не съвпада · „друго", и думата е празна, за да го КАЖЕ екранът
    expect(vidatOtImeto('обект 7')).toEqual({ vid: 'drug', poDumata: '' });
  });
});

describe('калкулаторът над Продажбите', () => {
  it('дава втора ценова колона до неговата · и разликата помежду им', async () => {
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
    };
    await zapishi('k0', 'stopanin.otkriy', { imeyl: STOPANIN });
    await zapishi('p1', 'prodazhbi.dobaviParva', {
      kletki: {
        apartament: { tekst: 'апарт. № 1' },
        telefon: null,
        ime: null,
        imeyl: null,
        garazh: null,
        pMyasto: null,
        maze: null,
        kvadratura: { chislo: STO_KVM },
        tsena: { stoynost_st: 30_000_000 },
        tsenaBanka: null,
        tsenaSmr: null,
        pdBanka: null,
        pdSmr: null,
        nsBanka: null,
        nsSmr: null,
        akt15Smr: null,
        akt15: null,
        akt16: null,
      },
    });
    const ots = otsenkata(iz.ogledalo(), KOGATO);
    const r = ots.redove[0]!;
    expect([r.vid, r.kvadratura]).toEqual(['apartament', STO_KVM]);
    expect([r.pazaren_st, r.dohoden_st, r.razhoden_st]).toEqual([
      30_000_000, 24_926_250, 18_000_000,
    ]);
    expect(r.saglasuvane.tochno_st).toBe(24_692_625);
    // договорената е 300 000 €, оценената е под нея · разликата е ОТРИЦАТЕЛНА
    expect(r.dogovorena_st).toBe(30_000_000);
    expect(r.razlika_st).toBe(-5_307_375);
    // неговата производна колона · евро на квадрат, и по двете цени
    expect([r.dogovoreni_st_kvm, r.otseneni_st_kvm]).toEqual([300_000, 246_926]);
    expect([ots.dogovoreni_st, ots.otseneni_st, ots.razlika_st]).toEqual([
      30_000_000, 24_692_625, -5_307_375,
    ]);
    expect(ots.otpadnali).toEqual([]);
    // същата сметка, викната за ЕДИН ред · екранът и сборът минават през нея
    expect(otseni(r as never, PO_PODRAZBIRANE).saglasuvane.tochno_st).toBe(r.saglasuvane.tochno_st);
  });
});
