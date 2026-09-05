/**
 * КАТАЛОГЪТ · броят е пин · ключ `prozorets.glagol` · всеки тип събитие има
 * писач (команда), проверка (регистър) и четец (Огледало).
 */

import { describe, expect, it } from 'vitest';
import { KATALOG, komandaPoKlyuch, opisNaKataloga } from '../src/komandi/katalog.js';
import { PROZORTSI } from '../src/model/osnova.js';
import { CHETTSI } from '../src/ogledalo/chettsi.js';
import { SABITIYA, TIP } from '../src/sabitiya/registar.js';

describe('каталогът', () => {
  it('петнайсет команди · уникални ключове · `prozorets.glagol`', () => {
    expect(KATALOG).toHaveLength(15);
    const klyuchove = KATALOG.map((k) => k.klyuch);
    expect(new Set(klyuchove).size).toBe(15);
    for (const k of klyuchove) expect(k).toMatch(/^[a-z]+\.[a-zA-Z]+$/);
    expect(komandaPoKlyuch('imoti.sazdayImot')?.ime).toBe('Създай имот');
    expect(komandaPoKlyuch('nyama.takava')).toBeUndefined();
  });

  it('всеки тип събитие има писач, проверка и четец · по регистрите', () => {
    const tipove = Object.values(TIP);
    const pisachi = new Set(KATALOG.flatMap((k) => k.proizvezhda));
    for (const t of tipove) {
      expect(pisachi.has(t), `няма команда за „${t}"`).toBe(true);
      expect(SABITIYA[t], `няма проверка за „${t}"`).toBeDefined();
      expect(CHETTSI[t], `няма четец за „${t}"`).toBeDefined();
    }
    for (const k of KATALOG) for (const t of k.proizvezhda) expect(tipove).toContain(t);
  });

  it('сочи само осемте прозореца · само откриването минава без Стопанин', () => {
    const prozortsi = new Set(PROZORTSI.map((p) => p.klyuch));
    for (const k of KATALOG) {
      expect(k.prozortsi.length).toBeGreaterThan(0);
      for (const p of k.prozortsi) expect(prozortsi.has(p), `${k.klyuch} → ${p}`).toBe(true);
      expect(['buton', 'desen-buton', 'kletka', 'sluzhebna']).toContain(k.myasto);
      expect(['chete', 'pishe']).toContain(k.stepen);
    }
    expect(KATALOG.filter((k) => k.bezStopanin === true).map((k) => k.klyuch)).toEqual([
      'stopanin.otkriy',
    ]);
  });

  it('описанието за екрана и агента няма dryRun и предусловия', () => {
    const opis = opisNaKataloga();
    expect(opis).toHaveLength(15);
    for (const o of opis) {
      expect(o).not.toHaveProperty('dryRun');
      expect(o).not.toHaveProperty('predusloviya');
      expect(o.opisanie.length).toBeGreaterThan(10);
    }
  });
});
