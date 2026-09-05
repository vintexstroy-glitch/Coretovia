/**
 * МОДЕЛЪТ КАТО ДАННИ · основата е здрава, и проверката ѝ хваща счупена основа.
 *
 * Пиновете с ръка тук са НЕГОВИТЕ думи: главите на трите таблици на
 * ИмотиОбектиБизнеси (ред 5 · 16 · 54) и базовите стойности на номенклатурите.
 * Сменят ли се в кода, тестът пада преди Книгата да се изнесе с чужда дума.
 */

import { describe, expect, it } from 'vitest';
import { DUMI_OT_KNIGATA } from '../src/model/dumi-ot-knigata.js';
import { slotNaKolonata, vlizaVSbor } from '../src/model/kolona.js';
import { type Model, nomenklaturata, proveriModela, tablitsata } from '../src/model/model.js';
import {
  MODEL,
  NOMENKLATURA,
  NOMENKLATURI,
  PROZORTSI,
  SLUZHEBEN_LIST,
  TABLITSI,
  BUTONI_NA_UPRAVLENIE,
  OBLIK_NA_UPRAVLENIE,
} from '../src/model/osnova.js';
import { poIzbor, shemaNaReda, strogObekt } from '../src/model/shema.js';
import { koloniNaReda } from '../src/model/tablitsa.js';

describe('основата на резен 1', () => {
  it('е здрава · проверката връща нула находки', () => {
    expect(proveriModela(MODEL)).toEqual([]);
  });

  it('шест таблици · три на Имоти, една на Управление, две на Сметки · с неговите глави', () => {
    expect(TABLITSI.map((t) => t.klyuch)).toEqual([
      'imoti',
      'obekti',
      'biznesi',
      'zadachi',
      'dvizheniya',
      'kesh',
      'dds',
    ]);
    expect(TABLITSI.map((t) => t.prozorets)).toEqual([
      'imoti',
      'imoti',
      'imoti',
      'upravlenie',
      'smetki',
      'smetki',
      'smetki',
    ]);
    const glavi = (k: string): string[] => koloniNaReda(tablitsata(MODEL, k)).map((c) => c.ime);
    expect(glavi('imoti')).toEqual([
      '№',
      'име Имот',
      'Състояние',
      '№',
      'площ',
      'цена',
      'папка в драйва',
      'адрес гугъл',
    ]);
    expect(glavi('obekti')).toEqual([
      '№',
      'име Имот',
      'Състояние',
      '№',
      'площ',
      'цена',
      'папка в драйва',
      'адрес в гугъл карти',
    ]);
    expect(glavi('biznesi')).toEqual([
      '№',
      'име Имот',
      'Състояние Бизнес',
      '№ Обект',
      'площ',
      'цена',
      'папка в драйва',
      'адрес в гугъл карти',
      'други(при нужда)',
    ]);
  });

  it('задачите на Управление · връзка към три таблици · слети клетки · подглави · ред „филтър"', () => {
    const z = tablitsata(MODEL, 'zadachi');
    expect(z.prozorets).toBe('upravlenie');
    expect(z.sashtnost).toBe('zadacha');
    expect(z.nomeratsiya).toBeUndefined();
    expect(z.koloni.map((k) => [k.klyuch, k.vid, k.zadalzhitelna])).toEqual([
      ['kam', 'vrazka', true],
      ['vid', 'izbor', true],
      ['ime', 'tekst', true],
      ['ot', 'data', false],
      ['do', 'data', false],
      ['otsenka', 'izbor', false],
      ['byudzhet', 'evro', false],
    ]);
    expect(z.koloni[0]?.vrazka).toEqual(['imoti', 'obekti', 'biznesi']);
    expect(z.koloni.map((k) => k.kratko)).toEqual([
      'към',
      'Вид',
      'име',
      'Начало',
      undefined,
      undefined,
      undefined,
    ]);
    // слятата клетка · две колони в една · опашката няма своя колона в Книгата
    expect(z.slyati).toEqual([
      { kolona: 'vid', opashka: 'ime', razdelitel: ' / ' },
      { kolona: 'ot', opashka: 'do', razdelitel: ' / ' },
    ]);
    expect(koloniNaReda(z).map((k) => k.klyuch)).toEqual([
      'kam',
      'vid',
      'ot',
      'otsenka',
      'byudzhet',
    ]);
    expect(z.podglava?.['ot']).toBe('Начало/Край');
    expect(z.redFiltar).toBe(true);
  });

  it('неговите десет глави на Управление · и четиринайсетте му бутона, дословно', () => {
    expect(OBLIK_NA_UPRAVLENIE.map((g) => g.glava)).toEqual([
      '№',
      'име Имот',
      ' Състояние за Имот или Състояние на Обект',
      '№',
      ' Задачи(нещо като състояние за Делата, Срещите и Преписките).',
      'Дата',
      'Оценка',
      'площ',
      'цена',
      'Бюджет Дела/ Бюджет Сметки',
    ]);
    expect(OBLIK_NA_UPRAVLENIE.map((g) => g.ot)).toEqual([
      'nomeratsiya',
      'roditel',
      'roditel',
      'roditel',
      'zadacha',
      'zadacha',
      'zadacha',
      'roditel',
      'roditel',
      'zadacha',
    ]);
    expect(BUTONI_NA_UPRAVLENIE).toHaveLength(14);
    expect(BUTONI_NA_UPRAVLENIE.map((b) => b.ime.split('(')[0]!.trim())).toEqual([
      'Отвори',
      'Запази',
      'Добавяне',
      'Свалифайл',
      'Добавяне на Състояние Дела от падащо меню се избира: Дела, Срещи, Преписки или се избира ФУнкция на парите в Приход и Разход: ВИждане, Смятане или Въвеждане.',
      'Скрий Дела',
      'Скрий Разходи',
      'Скрий Приходи',
      'Скрий Таблица',
      'Скрий Диаграма',
      'Обнови',
      'Период',
      'Начало Сега',
      'Времеви Такт Диаграма',
    ]);
    expect(BUTONI_NA_UPRAVLENIE.find((b) => b.klyuch === 'takt')?.izbor).toEqual([
      'ден',
      'месец',
      'тримесечие',
      'година',
    ]);
    expect(BUTONI_NA_UPRAVLENIE.map((b) => b.deystvie.vid)).toEqual([
      'idva',
      'idva',
      'ekran',
      'kniga',
      'nastroyki',
      'ekran',
      'idva',
      'idva',
      'ekran',
      'ekran',
      'ekran',
      'ekran',
      'ekran',
      'ekran',
    ]);
  });

  it('категорията на Обекта няма своя колона в Книгата · стои в клетката на Вида', () => {
    const obekti = tablitsata(MODEL, 'obekti');
    expect(obekti.koloni.map((k) => k.klyuch)).toContain('kategoriya');
    expect(koloniNaReda(obekti).map((k) => k.klyuch)).not.toContain('kategoriya');
    expect(obekti.grupirane).toEqual([
      { kolona: 'imot' },
      { kolona: 'kategoriya', vKletkataNa: 'vid' },
    ]);
  });

  it('единайсет номенклатури · с неговите думи · всички заключени', () => {
    expect(NOMENKLATURI).toHaveLength(11);
    expect(new Set(NOMENKLATURI.map((n) => n.klyuch)).size).toBe(11);
    expect(Object.values(NOMENKLATURA).sort()).toEqual(NOMENKLATURI.map((n) => n.klyuch).sort());
    for (const n of NOMENKLATURI) expect(n.vid).toBe('zaklyucheno');
    const teksti = (k: string): string[] => nomenklaturata(MODEL, k).bazovi.map((s) => s.tekst);
    expect(teksti(NOMENKLATURA.sastoyanieNaImot)).toEqual(['ПИ', 'УПИ', 'Строеж']);
    expect(teksti(NOMENKLATURA.kategoriya)).toEqual(['Сграда', 'Паркинг', 'Бизнес']);
    expect(teksti(NOMENKLATURA.vidNaObekt)).toEqual([
      'апартамент',
      'гараж',
      'офис',
      'склад',
      'Хале',
      'НПМ',
    ]);
    expect(teksti(NOMENKLATURA.sastoyanieNaBiznes)).toEqual(['ФЕЦ+Батерии', 'Батерии']);
    expect(teksti(NOMENKLATURA.vidNaZadacha)).toEqual(['Дело', 'Среща', 'Преписка', 'Проект']);
    expect(teksti(NOMENKLATURA.sastoyanieNaSmetki)).toEqual([
      'Сметнато',
      'Вкарано',
      'Прочетено (Сверено)',
    ]);
    expect(teksti(NOMENKLATURA.funktsiyaNaParite)).toEqual([
      'Въвеждане',
      'Сверяване с Банкови Извлечения',
      'Вкарване',
    ]);
    expect(teksti(NOMENKLATURA.otsenka)).toEqual([
      'Спешно и Важно',
      'Спешно',
      'Важно',
      'Нито едно',
    ]);
    expect(teksti(NOMENKLATURA.sektsiiPrihod)).toEqual([
      'Наем Банка',
      'Наем Кеш',
      'Бизнес',
      'Други',
    ]);
    // правописът му остава („Бнка") · той преименува от Настройки
    expect(teksti(NOMENKLATURA.sektsiiRazhodi)).toContain('Фактури Бнка');
    expect(teksti(NOMENKLATURA.dlazhnosti)).toEqual([
      'Стопанин',
      'Управител',
      'Помощник Управител',
      'Служител',
      'Наблюдател',
    ]);
  });

  it('видът на обекта се номерира В категорията · НПМ е 1 под Паркинг, не 6', () => {
    const vid = nomenklaturata(MODEL, NOMENKLATURA.vidNaObekt);
    expect(vid.podredbaPo).toBe('kategoriya');
    const npm = vid.bazovi.find((s) => s.tekst === 'НПМ');
    expect(npm?.nomer).toBe(1);
    expect(npm?.belezi).toEqual({ kategoriya: 2 });
    const sklad = vid.bazovi.find((s) => s.tekst === 'склад');
    expect(sklad?.nomer).toBe(4);
  });

  it('Бизнесът е трета категория без Вид · и Бизнесите се номерират с три сегмента', () => {
    const biznes = nomenklaturata(MODEL, NOMENKLATURA.kategoriya).bazovi[2];
    expect(biznes?.tekst).toBe('Бизнес');
    expect(biznes?.belezi).toEqual({ bezVid: true, tablitsa: 'biznesi' });
    expect(tablitsata(MODEL, 'biznesi').nomeratsiya?.segmenti).toEqual([
      { ot: 'roditel' },
      { ot: 'kategoriya-fiksirana', nomer: 3 },
      { ot: 'kolona', kolona: 'nomer' },
    ]);
  });

  it('служебният лист не е прозорец · и осемте остават осем', () => {
    expect(SLUZHEBEN_LIST.startsWith('_')).toBe(true);
    expect(PROZORTSI.some((p) => p.list === SLUZHEBEN_LIST)).toBe(false);
    expect(MODEL.prozortsi).toHaveLength(8);
  });

  it('неговите думи от Книгата · по прозорец · всяка с ред и номер', () => {
    for (const p of PROZORTSI) expect(DUMI_OT_KNIGATA[p.klyuch]).toBeDefined();
    expect(DUMI_OT_KNIGATA.imoti.map((d) => d.red)).toEqual([1, 2, 12, 13, 14, 50, 51, 52]);
    expect(DUMI_OT_KNIGATA.imoti[0]?.tekst).toMatch(/^Има един бутон \/Създай имот\//);
    expect(DUMI_OT_KNIGATA.profil.length + DUMI_OT_KNIGATA.nastroyki.length).toBeGreaterThan(0);
  });
});

describe('колоната · слотът е точно един и идва от вида', () => {
  it('евро → stoynost_st · число и процент → chislo · избор → nomer · текст, дата, връзка → tekst', () => {
    const imoti = tablitsata(MODEL, 'imoti');
    const obekti = tablitsata(MODEL, 'obekti');
    const slot = (t: typeof imoti, k: string): string | undefined =>
      slotNaKolonata(t.koloni.find((c) => c.klyuch === k)!);
    expect(slot(imoti, 'tsena')).toBe('stoynost_st');
    expect(slot(imoti, 'plosht')).toBe('chislo');
    expect(slot(imoti, 'sastoyanie')).toBe('nomer');
    expect(slot(imoti, 'ime')).toBe('tekst');
    expect(slot(obekti, 'imot')).toBe('tekst');
    expect(slot(obekti, 'nomeratsiya')).toBeUndefined();
  });

  it('в сбор влиза само еврото', () => {
    const imoti = tablitsata(MODEL, 'imoti');
    expect(imoti.koloni.filter(vlizaVSbor).map((k) => k.klyuch)).toEqual(['tsena']);
  });
});

describe('схемата на реда се ИЗВЕЖДА от Модела', () => {
  it('при създаване задължителните са required и не са nullable · затворените липсват', () => {
    const sh = shemaNaReda(tablitsata(MODEL, 'obekti'), 'sazdavane');
    expect(sh.additionalProperties).toBe(false);
    expect(sh.properties).not.toHaveProperty('nomeratsiya');
    expect(sh.required).toEqual(Object.keys(sh.properties ?? {}));
    expect(sh.properties?.['imot']?.type).toBe('object');
    expect(sh.properties?.['tsena']?.type).toEqual(['object', 'null']);
    expect(sh.properties?.['tsena']?.properties?.['stoynost_st']?.type).toBe('integer');
  });

  it('при поправка всяка клетка е по избор', () => {
    const sh = shemaNaReda(tablitsata(MODEL, 'imoti'), 'popravka');
    for (const p of Object.values(sh.properties ?? {})) expect(p.type).toEqual(['object', 'null']);
  });

  it('строгият обект и „по избор" са това, което казват', () => {
    const s = strogObekt({ a: { type: 'string' } });
    expect(s).toEqual({
      type: 'object',
      properties: { a: { type: 'string' } },
      required: ['a'],
      additionalProperties: false,
    });
    expect(poIzbor({ type: 'integer' }).type).toEqual(['integer', 'null']);
  });
});

describe('проверката на Модела хваща счупена основа', () => {
  const sChupka = (popravi: (m: Model) => Model): readonly string[] =>
    proveriModela(popravi(MODEL));

  it('избор без номенклатура · връзка към непозната таблица · номерация без родител', () => {
    const imoti = tablitsata(MODEL, 'imoti');
    const schupena = {
      ...imoti,
      koloni: [
        ...imoti.koloni,
        { klyuch: 'x', ime: 'x', vid: 'izbor' as const, zadalzhitelna: false, zatvorena: false },
        {
          klyuch: 'y',
          ime: 'y',
          vid: 'vrazka' as const,
          vrazka: ['nyama'],
          zadalzhitelna: false,
          zatvorena: false,
        },
      ],
      nomeratsiya: { razdelitel: '.' as const, segmenti: [{ ot: 'roditel' as const }] },
    };
    const nahodki = sChupka((m) => ({
      ...m,
      tablitsi: new Map([...m.tablitsi, ['imoti', schupena]]),
    }));
    expect(nahodki).toHaveLength(3);
    expect(nahodki.join('\n')).toMatch(/избор без номенклатура/);
    expect(nahodki.join('\n')).toMatch(/непозната таблица/);
    expect(nahodki.join('\n')).toMatch(/иска родител/);
  });

  it('два пъти един номер или един текст в номенклатура', () => {
    const n = nomenklaturata(MODEL, NOMENKLATURA.sastoyanieNaImot);
    const schupena = { ...n, bazovi: [...n.bazovi, n.bazovi[0]!] };
    const nahodki = sChupka((m) => ({
      ...m,
      nomenklaturi: new Map([...m.nomenklaturi, [n.klyuch, schupena]]),
    }));
    expect(nahodki).toHaveLength(2);
  });

  it('девети прозорец · и таблица към непознат прозорец', () => {
    const nahodki = sChupka((m) => ({
      ...m,
      prozortsi: [...m.prozortsi, { klyuch: 'profil', list: 'Девети', lenti: [] }],
    }));
    expect(nahodki).toEqual(['Прозорците са 9, а трябва да са 8.']);
  });
});
