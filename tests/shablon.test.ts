/**
 * ЗАПЕЧАТАНИЯТ HTML · доказателството, че вратата се затваря (резен 6м · ADR-019).
 *
 * Тук се пази ЕДНО нещо: няма път от чужд текст до изпълним код. Всичко друго в
 * този файл е следствие.
 */

import { describe, expect, it } from 'vitest';
import { h, nashHTML } from '../app/reshetka/shablon.js';

/** Само за теста · вижда какво е сглобил шаблонът, без да минава през възел. */
const kato = (z: { readonly __zapechatanHTML: string }): string => z.__zapechatanHTML;

describe('запечатаният HTML', () => {
  it('екранира ПЕТТЕ знака · и апострофът е петият', () => {
    // `ekraniraj` пазеше четири и оставяше апострофа. Днес дупка нямаше, защото
    // нито един атрибут не се пише с единични кавички — но това го пазеше НАВИК.
    expect(kato(h`${'&'}`)).toBe('&amp;');
    expect(kato(h`${'<'}`)).toBe('&lt;');
    expect(kato(h`${'>'}`)).toBe('&gt;');
    expect(kato(h`${'"'}`)).toBe('&quot;');
    expect(kato(h`${"'"}`)).toBe('&#39;');
  });

  it('чуждото име от негов xlsx НЕ става изпълним код', () => {
    // точната форма, с която се влиза през клетка на внесена Книга
    const chuzhdo = '<img src=x onerror="fetch(\'//zle\')">';
    const iz = kato(h`<td>${chuzhdo}</td>`);
    // ТОЧНИЯТ изход, не „не съдържа" · думата `onerror=` ОСТАВА, но като ТЕКСТ,
    // а не като атрибут — и точно това е разликата, която трябва да се твърди.
    expect(iz).toBe('<td>&lt;img src=x onerror=&quot;fetch(&#39;//zle&#39;)&quot;&gt;</td>');
    // и нито един нов ъгъл · тагът не се сглобява
    expect(iz.replace(/<td>|<\/td>/g, '')).not.toContain('<');
  });

  it('и в АТРИБУТ с единични кавички · там `ekraniraj` пускаше', () => {
    const zlo = "x' onmouseover='zle()";
    const iz = kato(h`<td data-ime='${zlo}'></td>`);
    expect(iz).not.toContain("onmouseover='");
    expect(iz).toContain('&#39;');
  });

  it('вложеният шаблон влиза КАКТО СИ Е · инак разметката би се екранирала', () => {
    const red = h`<td>${'Иван'}</td>`;
    expect(kato(h`<tr>${red}</tr>`)).toBe('<tr><td>Иван</td></tr>');
  });

  it('списък от шаблони се слепва · това е формата на всяка таблица', () => {
    const redove = ['а', 'б'].map((x) => h`<td>${x}</td>`);
    expect(kato(h`<tr>${redove}</tr>`)).toBe('<tr><td>а</td><td>б</td></tr>');
  });

  it('празното е ЛИПСА, а не думата „undefined"', () => {
    // платено в MasterBook: `undefined` се показа на екрана като текст
    expect(kato(h`<td>${undefined}</td>`)).toBe('<td></td>');
    expect(kato(h`<td>${null}</td>`)).toBe('<td></td>');
    expect(kato(h`<td>${0}</td>`)).toBe('<td>0</td>');
  });

  it('числото влиза като число, не като „[object Object]"', () => {
    expect(kato(h`${1500}`)).toBe('1500');
    expect(kato(h`${true}`)).toBe('true');
  });

  it('и НАШИЯТ готов HTML влиза цял · но само през назована врата', () => {
    // `nashHTML` е РЕШЕНИЕ и се вижда в диф · обходът на чистотата брои виканията
    expect(kato(h`${nashHTML('<svg><rect/></svg>')}`)).toBe('<svg><rect/></svg>');
  });

  it('запечатаното НЕ се строи с обикновен обект · типът не се подправя тихо', () => {
    // ако някой напише `{ __zapechatanHTML: chuzhdo }` на ръка, това ЛИЧИ в диф;
    // тук се пази само, че полето се казва така, а не нещо, което се пише случайно
    const z = h`<b>${'а'}</b>`;
    expect(Object.keys(z)).toEqual(['__zapechatanHTML']);
  });

  it('и вмъкнато в ОБИКНОВЕН шаблон ХВЪРЛЯ · вместо да даде „[object Object]"', () => {
    /**
     * Това е единствената грешка, която типовете НЕ ловят: `${zapechatan}` в
     * обикновен низ се превръща в „[object Object]" без нито едно оплакване —
     * нито от компилатора, нито при сглобяването. Вижда се чак на екрана, ако
     * някой погледне точно там.
     *
     * Тихото се прави ШУМНО: първата такава грешка пада на място, с думи.
     */
    const z = h`<b>${'а'}</b>`;
    expect(() => `${z}`).toThrow(/Запечатан HTML/);
    expect(() => [z].join('')).toThrow(/Запечатан HTML/);
  });
});
