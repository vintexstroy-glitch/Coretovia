/**
 * ГАНТЪТ · решетката, лентите, сборовете по колона, светофарът и скриването.
 *
 * Всяко число тук е НЕГОВО и се пази поименно: 7 и 2 дни за светофара, 5× за
 * обхвата, „първата колона е днес". Пренесено от MasterBook върху реда на
 * задача (ADR-005).
 */

import { describe, expect, it } from 'vitest';
import {
  broyPokrivashti,
  dniDoSroka,
  dumataNaButona,
  type KoeSeVizhda,
  lentaNa,
  prevkluchi,
  reshetka,
  sboroveVKolonite,
  svetofarNaSroka,
} from '../src/smetach/gant.js';
import {
  koloniNaTakta as koloni,
  kolkoSeVizhdat,
  KRATNOST_NA_OBHVATA,
  TAKTOVE,
} from '../src/smetach/vreme.js';

const DNES = '2026-08-23';

describe('решетката · днес е вътре, а вляво има история', () => {
  it('всеки такт носи днешна колона · и НЕ я слага първа', () => {
    for (const takt of TAKTOVE) {
      if (takt === 'svoy') continue;
      const k = koloni(takt, DNES);
      const dnesni = k.filter((x) => x.dnes);
      expect(dnesni.length > 0, takt).toBe(true);
      expect(k.indexOf(dnesni[0]!) >= 1, takt).toBe(true);
    }
  });

  it('неговите числа стоят непокътнати · обхватът е пет пъти видимото', () => {
    expect(KRATNOST_NA_OBHVATA).toBe(5); // негово (р51·[141]·07.08)
    expect(kolkoSeVizhdat('den', DNES)).toBe(8); // „ДЕН с 8 часа"
    expect(kolkoSeVizhdat('godina', DNES)).toBe(12);
  });

  it('и напред остава поне една цяла видима крачка', () => {
    for (const takt of TAKTOVE) {
      if (takt === 'svoy') continue;
      const k = koloni(takt, DNES);
      const posleden = k.findIndex((x) => x.dnes);
      expect(k.length - posleden > kolkoSeVizhdat(takt, DNES), takt).toBe(true);
    }
  });
});

describe('лентата · от коя колона до коя', () => {
  const k = koloni('mesets', DNES);

  it('еднодневната задача дава ЕДНА колона', () => {
    const l = lentaNa({ id: 'A', ot: DNES, do: DNES }, k)!;
    expect(l.broy).toBe(1);
    expect(k[l.ot]!.ot).toBe(DNES);
  });

  it('седемдневната дава СЕДЕМ', () => {
    const l = lentaNa({ id: 'A', ot: '2026-08-23', do: '2026-08-29' }, k)!;
    expect(l.broy).toBe(7);
  });

  it('излизането се БЕЛЯЗВА, не се отрязва тихо', () => {
    const staro = lentaNa({ id: 'A', ot: '2020-01-01', do: DNES }, k)!;
    expect(staro.izlizaNalyavo).toBe(true);
    expect(staro.izlizaNadyasno).toBe(false);
    const dalgo = lentaNa({ id: 'B', ot: DNES, do: '2030-01-01' }, k)!;
    expect(dalgo.izlizaNadyasno).toBe(true);
  });

  it('задача изцяло извън прозореца НЕ дава лента · без дати също', () => {
    expect(lentaNa({ id: 'A', ot: '2019-01-01', do: '2019-02-01' }, k)).toBe(null);
    expect(lentaNa({ id: 'A', ot: '', do: '' }, k)).toBe(null);
  });

  it('само начало или само край = еднодневна лента там', () => {
    expect(lentaNa({ id: 'A', ot: DNES, do: '' }, k)!.broy).toBe(1);
    expect(lentaNa({ id: 'A', ot: '', do: DNES }, k)!.broy).toBe(1);
  });

  it('при такт ДЕН еднодневната задача покрива осемте часа, не първия', () => {
    const den = koloni('den', DNES);
    const l = lentaNa({ id: 'A', ot: DNES, do: DNES }, den)!;
    expect(l.broy).toBe(8);
  });

  it('решетката връща лента само за редовете, които се виждат в нея', () => {
    const r = reshetka(
      [
        { id: 'A', ot: DNES, do: DNES },
        { id: 'B', ot: '2019-01-01', do: '2019-01-02' },
      ],
      'mesets',
      DNES,
    );
    expect(r.lenti.map((l) => l.id)).toEqual(['A']);
    expect(r.vidimi).toBe(31);
  });
});

describe('сборовете по колона · „в зависимост от времевия такт"', () => {
  it('събира по КОЛОНА на решетката, не по календарен месец', () => {
    const k = koloni('godina', DNES);
    const s = sboroveVKolonite(k, [
      { data: '2026-08-05', chislo: 1000_00 },
      { data: '2026-08-20', chislo: 500_00 },
      { data: '2026-09-01', chislo: 700_00 },
    ]);
    const avgust = k.findIndex((x) => x.ot === '2026-08-01');
    expect(s[avgust]).toEqual({ sbor: 1500_00, obhvat: 1 });
    expect(s[avgust + 1]).toEqual({ sbor: 700_00, obhvat: 1 });
  });

  it('при такт СЕДМИЦА същите числа падат в РАЗНИ колони', () => {
    const k = koloni('sedmitsa', DNES);
    const s = sboroveVKolonite(k, [
      { data: '2026-08-23', chislo: 100_00 },
      { data: '2026-08-24', chislo: 200_00 },
    ]);
    const i = k.findIndex((x) => x.ot === '2026-08-23');
    expect(s[i]!.sbor).toBe(100_00);
    expect(s[i + 1]!.sbor).toBe(200_00);
  });

  it('при такт ДЕН числото стои ВЕДНЪЖ над осемте часа', () => {
    const k = koloni('den', DNES);
    const s = sboroveVKolonite(k, [{ data: DNES, chislo: 5 }]);
    const parvi = k.findIndex((x) => x.dnes);
    expect(s[parvi]).toEqual({ sbor: 5, obhvat: 8 });
    expect(s[parvi + 1]).toEqual({ sbor: 0, obhvat: 0 });
  });

  it('дава по една клетка за ВСЯКА колона · и брои покриващите ленти', () => {
    const k = koloni('sedmitsa', DNES);
    expect(sboroveVKolonite(k, []).length).toBe(k.length);
    const r = reshetka(
      [
        { id: 'A', ot: '2026-08-23', do: '2026-08-25' },
        { id: 'B', ot: '2026-08-24', do: '2026-08-24' },
      ],
      'sedmitsa',
      DNES,
    );
    const b = broyPokrivashti(r.koloni, r.lenti);
    const i = k.findIndex((x) => x.ot === '2026-08-23');
    expect(b.slice(i, i + 4)).toEqual([1, 2, 1, 0]);
  });
});

describe('светофарът · неговите 7 и 2 дни', () => {
  it('свети нормално, докато остава повече от седмица · празният срок не свети', () => {
    expect(svetofarNaSroka('2026-09-30', DNES)).toBe('normalno');
    expect(svetofarNaSroka('', DNES)).toBe('normalno');
  });

  it('жълто ТОЧНО от седмия ден · червено ТОЧНО от втория', () => {
    expect(svetofarNaSroka('2026-08-30', DNES)).toBe('zhalto');
    expect(svetofarNaSroka('2026-08-31', DNES)).toBe('normalno');
    expect(svetofarNaSroka('2026-08-25', DNES)).toBe('cherveno');
    expect(svetofarNaSroka('2026-08-26', DNES)).toBe('zhalto');
  });

  it('просрочено е СВОЕ състояние · нечетимата дата КРЕЩИ', () => {
    expect(svetofarNaSroka('2026-08-22', DNES)).toBe('prosrocheno');
    expect(dniDoSroka('2026-08-22', DNES)).toBe(-1);
    expect(() => svetofarNaSroka('няма', DNES)).toThrow(/Нечетима дата/);
  });
});

describe('кое се вижда · скриването е избор, не решение на кода', () => {
  const DVETE: KoeSeVizhda = { tablitsa: true, diagrama: true };

  it('от двете видими се скрива всяко · и скритото се връща', () => {
    expect(prevkluchi(DVETE, 'tablitsa').sled).toEqual({ tablitsa: false, diagrama: true });
    expect(prevkluchi(prevkluchi(DVETE, 'tablitsa').sled, 'tablitsa').sled).toEqual(DVETE);
  });

  it('последният видим не се скрива · и отказът се КАЗВА · показването никога не се отказва', () => {
    const samo: KoeSeVizhda = { tablitsa: true, diagrama: false };
    const r = prevkluchi(samo, 'tablitsa');
    expect(r.sled).toEqual(samo);
    expect(r.otkaz).toBe('Последният изглед не се скрива — иначе секцията остава празна.');
    expect(prevkluchi({ tablitsa: false, diagrama: true }, 'diagrama').otkaz).not.toBe('');
    expect(prevkluchi({ tablitsa: false, diagrama: false }, 'tablitsa').otkaz).toBe('');
  });

  it('думите на бутона казват какво ЩЕ стане · с неговите думи от Книгата', () => {
    expect(dumataNaButona(DVETE, 'tablitsa')).toBe('Скрий Таблица');
    expect(dumataNaButona({ tablitsa: false, diagrama: true }, 'tablitsa')).toBe('Покажи Таблица');
    expect(dumataNaButona(DVETE, 'diagrama')).toBe('Скрий Диаграма');
  });
});
