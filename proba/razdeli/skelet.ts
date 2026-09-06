import { fileURLToPath } from 'node:url';
import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { otvori, tekstNa, tekstoveNa } from '../yadro/pomoshtni.ts';

const MOSTRA = fileURLToPath(new URL('../../tests/mostri/Coretovia-mostra.xlsx', import.meta.url));

/** 0 · скелетът · страницата · хранилището · осемте прозореца · Книгата се чете в браузъра */
import { tishina } from '../yadro/tishina.ts';

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

  // ══ 0д · ВРАТАТА · Trusted Types действа ли НАИСТИНА ═════════════════
  //
  // Директивата стои в `<meta>`, а спецификацията пренебрегва там само
  // `frame-ancestors`, `report-uri` и `sandbox`. „Би трябвало да работи" не е
  // проверка (ADR-056): тук се ОПИТВА гол `innerHTML` в живата страница и се
  // иска ОТКАЗ. Мине ли, вратата е надпис и това пада ТУК, не при нападение.
  razdel = '0д · вратата';
  // НАРОЧНИЯТ шум се обявява · браузърът пише за всеки блокиран опит, а тук
  // блокирането Е очакваният резултат (същият флаг, който §16 ползва за мрежата)
  tishina.ochakvana = true;
  proveri(
    'гол innerHTML е ОТКАЗАН от браузъра · политиката е в сила',
    await p.evaluate(() => {
      try {
        document.createElement('div').innerHTML = '<b>проба</b>';
        return 'мина';
      } catch {
        return 'отказано';
      }
    }),
    'отказано',
  );
  tishina.ochakvana = false;
  proveri(
    'и през запечатаната врата МИНАВА · инак екранът щеше да е празен',
    await p.$$eval('[data-prozortsi] a', (es) => es.length),
    8,
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
    '8 листа · 8 познати · 0 служебни · 0 непознати · сверка: 8 = 8 + 0 + 0 · разлика 0',
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
