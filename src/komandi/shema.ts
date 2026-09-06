/**
 * ВАЛИДАТОРЪТ · собствен, върху подмножеството на JSON Schema от `model/shema.ts`.
 *
 * Библиотека тук би решавала проблем, който не е наш: схемите са малки,
 * строги и се извеждат от Модела. Отказът е с ДУМИ и с път до полето
 * (правило 12), защото и човекът, и агентът трябва да разберат кое не минава.
 */

import type { ShemaJSON } from '../model/shema.js';

type Tip = 'object' | 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'null';

function tipNa(v: unknown): Tip {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'boolean') return 'boolean';
  return 'object';
}

function pozvoleniTipove(sh: ShemaJSON): readonly string[] {
  return typeof sh.type === 'string' ? [sh.type] : sh.type;
}

/** Проверява `v` срещу схемата · връща думи; празно = минава. */
export function proveriPoShema(sh: ShemaJSON, v: unknown, pat = 'товарът'): readonly string[] {
  const n: string[] = [];
  const tip = tipNa(v);
  const pozvoleni = pozvoleniTipove(sh);
  const tipMinava =
    pozvoleni.includes(tip) ||
    (tip === 'integer' && pozvoleni.includes('number')) ||
    (tip === 'object' && typeof v === 'object' && pozvoleni.includes('object'));
  if (!tipMinava) {
    n.push(`${pat}: очаква се ${pozvoleni.join(' или ')}, а е ${tip}.`);
    return n;
  }
  if (v === null) return n;

  if (sh.enum !== undefined && !sh.enum.includes(v as string | number)) {
    n.push(`${pat}: „${String(v)}" не е сред позволените (${sh.enum.map(String).join(' · ')}).`);
  }
  if (typeof v === 'string') {
    if (sh.minLength !== undefined && v.length < sh.minLength)
      n.push(`${pat}: най-малко ${sh.minLength} знака.`);
    if (sh.maxLength !== undefined && v.length > sh.maxLength)
      n.push(`${pat}: най-много ${sh.maxLength} знака.`);
    if (sh.pattern !== undefined && !new RegExp(sh.pattern, 'u').test(v))
      n.push(`${pat}: не е във вида, който се очаква.`);
  }
  if (typeof v === 'number') {
    if (sh.minimum !== undefined && v < sh.minimum) n.push(`${pat}: най-малко ${sh.minimum}.`);
    if (sh.maximum !== undefined && v > sh.maximum) n.push(`${pat}: най-много ${sh.maximum}.`);
  }
  if (Array.isArray(v)) {
    if (sh.minItems !== undefined && v.length < sh.minItems)
      n.push(`${pat}: най-малко ${sh.minItems} елемента.`);
    if (sh.items !== undefined)
      for (const [i, el] of v.entries()) n.push(...proveriPoShema(sh.items, el, `${pat}[${i}]`));
  }
  if (tip === 'object' && typeof v === 'object') {
    const obekt = v as Record<string, unknown>;
    const properties = sh.properties ?? {};
    for (const klyuch of sh.required ?? []) {
      if (!Object.hasOwn(obekt, klyuch)) n.push(`${pat}: липсва „${klyuch}".`);
    }
    for (const [klyuch, stoynost] of Object.entries(obekt)) {
      // `Object.hasOwn`, не гол достъп · иначе `constructor`, `toString`,
      // `valueOf`, `hasOwnProperty` и `__proto__` идват от прототипа и връщат
      // ФУНКЦИЯ вместо `undefined`. Тогава проверката ХВЪРЛЯ, вместо да откаже
      // с думи — а строгата схема съществува точно за да откаже с думи
      // (правило 12). Идиомът вече стои три реда по-горе.
      const pod = Object.hasOwn(properties, klyuch) ? properties[klyuch] : undefined;
      if (pod === undefined) {
        if (sh.additionalProperties === false) n.push(`${pat}: „${klyuch}" не е познато поле.`);
        continue;
      }
      n.push(...proveriPoShema(pod, stoynost, `${pat}.${klyuch}`));
    }
  }
  return n;
}
