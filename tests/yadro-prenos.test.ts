/**
 * ПРЕНЕСЕНОТО ЯДРО · частите, чиито стари тестове живееха при домейна.
 *
 * MasterBook пазеше котвата, правата по верига, мярката на сверката и ключа
 * на звеното през тестове, които внасят домейн (наеми, действия). Домейнът
 * не се пренася — тестовете им не могат. Обходът за чистота брои изнесено име
 * без нито един викащ като МЪРТВО (праг нула), и с право: пренесено, но
 * непазено, е пренесено на вяра. Затова тук всяка от тези части получава
 * своя проверка, къса и без домейн — до резена, който я вика в живия код.
 */

import { describe, expect, it } from 'vitest';
import {
  KotvaVPametta,
  LichnoESamoTvoe,
  MERKA,
  PoSvoyataVeriga,
  SUMATA_NAD_NULA,
  VsichkoRazresheno,
  ZASHTO_I_NULATA,
  klyuchNaZveno,
  proveriKotvata,
  sverka,
} from '../src/yadro/index.js';

const KOGATO = '2026-09-05T09:00:00.000Z';
const svedi = (imeyl: string): string => imeyl.trim().toLowerCase();

describe('котвата · последното звено, записано ИЗВЪН Журнала', () => {
  it('в паметта · забива се и се чете · без котва е null', () => {
    const k = new KotvaVPametta();
    expect(k.cheti('x')).toBeNull();
    k.zabij('x', { seq: 3, hash: 'abc', kogato: KOGATO });
    expect(k.cheti('x')?.seq).toBe(3);
  });

  it('скъсен отзад Журнал не минава покрай котвата', () => {
    const kotva = { seq: 5, hash: 'h5', kogato: KOGATO };
    const hashove = (seq: number): string | undefined => (seq === 5 ? 'h5' : undefined);
    expect(proveriKotvata(kotva, 5, hashove).nared).toBe(true);
    // по-къс Журнал · липсват звена
    expect(proveriKotvata(kotva, 4, hashove).nared).toBe(false);
    // същият seq, друг хеш · подменено звено
    expect(proveriKotvata(kotva, 5, () => 'drug').nared).toBe(false);
    // Без котва няма с какво да се мери · това е „наред", казано на глас.
    expect(proveriKotvata(null, 9, hashove).nared).toBe(true);
  });
});

describe('правата по верига · всеки писач пише в СВОЯТА', () => {
  const s = { vid: 'zapis', id: 'Z-1' };

  it('PoSvoyataVeriga · чужда верига на писач се отказва, своята минава', async () => {
    const p = new PoSvoyataVeriga(
      new VsichkoRazresheno(),
      (naematel) => (naematel.includes('#pero:') ? naematel.split('#pero:')[1] : undefined),
      (naematel) => naematel.split('#')[0]!,
      () => 'stopanin@x.bg',
      svedi,
    );
    expect(await p.mozheDaPishe('ivo@x.bg', 'kniga#pero:ivo@x.bg', s)).toBe(true);
    expect(await p.mozheDaPishe('Ivo@X.bg', 'kniga#pero:ivo@x.bg', s)).toBe(true);
    expect(await p.mozheDaPishe('mira@x.bg', 'kniga#pero:ivo@x.bg', s)).toBe(false);
    // нулевата верига на книга с известен стопанин · пише само той
    expect(await p.mozheDaPishe('stopanin@x.bg', 'kniga', s)).toBe(true);
    expect(await p.mozheDaPishe('ivo@x.bg', 'kniga', s)).toBe(false);
  });

  it('LichnoESamoTvoe · личната верига е само на своя човек, служебната минава', async () => {
    const p = new LichnoESamoTvoe('#lichen', svedi);
    expect(await p.mozheDaPishe('ivo@x.bg', 'ivo@x.bg#lichen')).toBe(true);
    expect(await p.mozheDaPishe('mira@x.bg', 'ivo@x.bg#lichen')).toBe(false);
    expect(await p.mozheDaPishe('mira@x.bg', 'kniga')).toBe(true);
  });
});

describe('сверката и звеното', () => {
  it('нулата се записва с думите защо', () => {
    const sv = sverka('пренос', 224, 224, KOGATO);
    expect(sv.razlika).toBe(0);
    expect(sv.nared).toBe(true);
    expect(MERKA.pari).toBe('центове');
    expect(MERKA.broy).toBe('брой');
    expect(ZASHTO_I_NULATA.length).toBeGreaterThan(20);
  });

  it('ключът на звеното носи веригата, за да не се сблъскат еднаквите seq', () => {
    expect(klyuchNaZveno({ naematel: 'A', seq: 2 })).toBe('A#2');
    expect(klyuchNaZveno({ naematel: 'B', seq: 2 })).not.toBe(
      klyuchNaZveno({ naematel: 'A', seq: 2 }),
    );
  });

  it('думите за сумата над нула са едни', () => {
    expect(SUMATA_NAD_NULA).toBe('Сумата трябва да е повече от нула.');
  });
});
