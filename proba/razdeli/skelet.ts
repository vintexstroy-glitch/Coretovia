import { fileURLToPath } from 'node:url';
import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { otvori, tekstNa, tekstoveNa } from '../yadro/pomoshtni.ts';

const MOSTRA = fileURLToPath(new URL('../../tests/mostri/Coretovia-mostra.xlsx', import.meta.url));

/** 0 · скелетът · страницата · хранилището · осемте прозореца · Книгата се чете в браузъра */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // ══ 0а · страницата ═══════════════════════════════════════════════════
  razdel = '0а · страницата';
  await otvori(p);
  proveri('заглавието', await p.title(), 'Coretovia');
  proveri('Книгата е празна', await tekstNa(p, '[data-vest]'), 'Книгата е празна · 0 събития');
  proveri(
    'хранилището докладва',
    (await tekstNa(p, '[data-hranilishte]')).startsWith('постоянство:'),
    true,
  );
  proveri(
    'Вратата е отворена',
    (await tekstNa(p, '[data-hranilishte]')).endsWith('Вратата е отворена'),
    true,
  );

  // ══ 0б · веригата ═════════════════════════════════════════════════════
  razdel = '0б · веригата';
  await p.click('[data-proveri]');
  await p.waitForFunction(() =>
    (document.querySelector('[data-veriga]')?.textContent ?? '').includes('Веригата'),
  );
  proveri(
    'празната верига е цяла',
    await tekstNa(p, '[data-veriga]'),
    'Веригата е цяла · 0 от 0 звена.',
  );

  // ══ 0в · осемте прозореца ═════════════════════════════════════════════
  razdel = '0в · осемте прозореца';
  const prozortsi = await tekstoveNa(p, '[data-prozorets]');
  proveri('осем са', prozortsi.length, 8);
  proveri(
    'в реда на Книгата',
    prozortsi.join(' · '),
    'Профил · ИмотиОбектиБизнеси · УправлениеДелаПреписки · Сметки · Служители · Продажби · ИИ · Настройки(Стопанин)',
  );

  // ══ 0г · Книгата се чете в браузъра ══════════════════════════════════
  razdel = '0г · Книгата в браузъра';
  await p.setInputFiles('[data-kniga]', MOSTRA);
  await p.waitForFunction(() =>
    (document.querySelector('[data-kniga-vest]')?.textContent ?? '').includes('листа'),
  );
  proveri(
    'осем листа · осем познати · нула непознати · сверка нула',
    await tekstNa(p, '[data-kniga-vest]'),
    '8 листа · 8 познати · 0 непознати · сверка: 8 = 8 + 0 · разлика 0',
  );
  const listove = await tekstoveNa(p, '[data-listove] tbody tr td:first-child');
  proveri(
    'листовете са по име и в ред',
    listove.join(' · '),
    'Профил · ИмотиОбектиБизнеси · УправлениеДелаПреписки · Сметки · Служители · Продажби · ИИ · Настройки(Стопанин)',
  );
  const slivaniya = await tekstoveNa(p, '[data-list="ИмотиОбектиБизнеси"] td:last-child');
  proveri('слетите клетки на Имотите са четири', slivaniya[0], '4');
  proveri(
    'Журналът не е пипнат от четенето',
    await tekstNa(p, '[data-vest]'),
    'Книгата е празна · 0 събития',
  );
}
