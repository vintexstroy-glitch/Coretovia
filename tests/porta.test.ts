/**
 * ПОРТАТА · агентът получава `PortaZaChetene` и тя НЯМА `izpalni` (K3);
 * бутоните идват от каталога с предусловията, сметнати върху избрания ред.
 */

import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/model/osnova.js';
import { Izpalnitel } from '../src/porta/izpalnitel.js';
import type { PortaZaChetene } from '../src/porta/porta.js';
import { KNIGA, knigaZaTest, STOPANIN } from './pomoshtni.js';

async function otvori() {
  const k = knigaZaTest();
  let takt = 0;
  return Izpalnitel.otvori({
    vrata: k.vrata,
    dnevnik: k.dnevnik,
    model: MODEL,
    veriga: KNIGA,
    aktor: () => STOPANIN,
    sega: () => {
      takt += 1;
      return new Date(Date.parse('2026-09-05T12:00:00.000Z') + takt * 1000).toISOString();
    },
  });
}

describe('Портата', () => {
  it('за четене няма izpalni · типът го пази', async () => {
    const iz = await otvori();
    const samoChete: PortaZaChetene = iz;
    // @ts-expect-error — агентът не пише: PortaZaChetene няма izpalni (K3)
    expect(typeof samoChete.izpalni).toBe('function');
    expect(samoChete.katalog()).toHaveLength(23);
    expect(samoChete.ogledalo().stopanin).toBe('');
  });

  it('бутоните на Имоти · неговите три · разрешени след откриването', async () => {
    const iz = await otvori();
    const predi = iz.butoniZa('imoti');
    expect(predi.map((b) => [b.ime, b.razreshena])).toEqual([
      ['Създай имот', false],
      ['Добави Обект', false],
      ['Добави Бизнес', false],
    ]);
    expect(predi[0]?.zashto).toBe('Книгата не е открита — първо Стопанинът.');
    expect(iz.butoniZa('profil').map((b) => [b.ime, b.razreshena])).toEqual([
      ['Открий Книгата', true],
    ]);

    await iz.izpalni('k0', 'stopanin.otkriy', { imeyl: STOPANIN });
    expect(iz.butoniZa('imoti').every((b) => b.razreshena)).toBe(true);
    expect(iz.butoniZa('profil')[0]?.razreshena).toBe(false);
  });

  it('десните бутони върху избран ред · с предусловията и с товара', async () => {
    const iz = await otvori();
    await iz.izpalni('k0', 'stopanin.otkriy', { imeyl: STOPANIN });
    await iz.izpalni('k1', 'imoti.sazdayImot', {
      kletki: {
        ime: { tekst: 'Герман' },
        sastoyanie: { nomer: 1 },
        nomer: null,
        plosht: null,
        tsena: null,
        papka: null,
        adres: null,
      },
    });
    const desni = iz
      .butoniZa('imoti', { tablitsa: 'imoti', id: 'imot:k1' })
      .filter((b) => b.myasto === 'desen-buton');
    expect(desni.map((b) => [b.klyuch, b.razreshena, b.zashto])).toEqual([
      ['red.izklyuchi', true, ''],
      ['red.varni', false, 'Редът не е изключен.'],
      ['obshto.storno', true, ''],
    ]);
    expect(desni[0]?.tovar).toEqual({ tablitsa: 'imoti', id: 'imot:k1' });
    expect(desni[2]?.tovar).toEqual({ veriga: KNIGA, seq: 2, prichina: 'сторно от таблицата' });
    expect(
      iz
        .butoniZa('imoti', { tablitsa: 'imoti', id: 'imot:nyama' })
        .filter((b) => b.myasto === 'desen-buton'),
    ).toHaveLength(2);
  });
});
