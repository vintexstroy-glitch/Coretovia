/**
 * РЕГИСТЪРЪТ НА ПРЕНОСА · сверка вход↔изход (правило 7 · ADR-001).
 *
 * Всеки стар файл получава ТОЧНО една присъда: ПРЕНОС · ПРЕНАПИСВАНЕ · ЧАКА ·
 * ОТПАДА. Сборът на четирите трябва да е равен на броя редове, и числата в
 * обобщението трябва да са броени от таблицата, не преписани.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const PRISADI = ['ПРЕНОС', 'ПРЕНАПИСВАНЕ', 'ЧАКА', 'ОТПАДА'] as const;
const tekst = readFileSync('docs/registar-na-prenosa.md', 'utf8');

/** Редовете на регистъра · първата клетка е път, третата — присъда. */
const redove = tekst
  .split('\n')
  .filter((r) => r.startsWith('| ') && !r.startsWith('| :') && !r.startsWith('| стар път'))
  .map((r) => r.split('|').map((k) => k.trim()))
  // ред на регистъра = първата клетка е ПЪТ (има точка на файл) · главата на обобщението не е
  .filter(
    (k) =>
      k.length >= 4 &&
      /\.(ts|mjs|md|sh|png)$/.test(k[1]!) &&
      PRISADI.some((p) => k[3]!.startsWith(p)),
  );

describe('регистърът на преноса', () => {
  it('има редове и всеки носи една от четирите присъди', () => {
    expect(redove.length).toBeGreaterThan(200);
    for (const k of redove) expect(PRISADI.filter((p) => k[3]!.startsWith(p))).toHaveLength(1);
  });

  it('сборът по присъди е равен на броя редове · и обобщението го казва', () => {
    const broy = Object.fromEntries(
      PRISADI.map((p) => [p, redove.filter((k) => k[3]!.startsWith(p)).length]),
    );
    const sbor = PRISADI.reduce((s, p) => s + broy[p]!, 0);
    expect(sbor).toBe(redove.length);
    const obobshtenie =
      /\*\*ОБЩО\*\*[^\n]*\*\*(\d+)\*\*[^\n]*\*\*(\d+)\*\*[^\n]*\*\*(\d+)\*\*[^\n]*\*\*(\d+)\*\*[^\n]*\*\*(\d+)\*\*/.exec(
        tekst,
      );
    expect(obobshtenie, 'редът **ОБЩО** с петте числа').not.toBeNull();
    const [, obshto, prenos, prenapisvane, chaka, otpada] = obobshtenie!.map(Number);
    expect([obshto, prenos, prenapisvane, chaka, otpada]).toEqual([
      redove.length,
      broy['ПРЕНОС'],
      broy['ПРЕНАПИСВАНЕ'],
      broy['ЧАКА'],
      broy['ОТПАДА'],
    ]);
  });

  it('нито един стар път не се повтаря', () => {
    const patishta = redove.map((k) => k[1]);
    expect(new Set(patishta).size).toBe(patishta.length);
  });

  /**
   * ДОШЛОТО СЕ БРОИ ОТ ДЪРВОТО, не от присъдата (резен 6е · ADR-016).
   *
   * Дотук тестът проверяваше три неща: една присъда на ред, сборът да е равен
   * на броя редове, и нито един повторен път. Нито едно от трите не поглежда
   * хранилището — тъй че ред с присъда ПРЕНАПИСВАНЕ и целеви файл, който го
   * няма, минаваше мълчаливо. Такива бяха 104 от 160.
   *
   * Това НЕ Е ЛЪЖА: присъдата казва какво ЩЕ стане. Дефектът е, че никоя от
   * четирите не казва „вече е тук" — и затова картата на дълга не различава
   * пренесеното от предстоящото.
   *
   * ПИНЪТ Е С РЪКА (обход В на честността): щом се пренесе още един файл,
   * числото мърда и тестът иска да се напише новото. Промяната се вижда в диф,
   * вместо да се промъкне.
   */
  it('и КАЗВА кои редове вече са ДОШЛИ · броено от дървото', () => {
    const zhivi = redove.filter(
      (k) => k[3]!.startsWith('ПРЕНОС') || k[3]!.startsWith('ПРЕНАПИСВАНЕ'),
    );
    // първо БРОЯТ · празен списък би направил всяко следващо очакване празно
    expect(zhivi).toHaveLength(160);

    // ДВА реда не сочат ЕДИН файл и това е вярно: `yadro/dnevnik.ts` носи
    // бележка в целта, а `domein/formuli.ts` се разляга в ЦЯЛА папка. Броят им се
    // пинва, за да не мине трети такъв незабелязано.
    const sTsel = zhivi.filter((k) => /\.(ts|mjs|md|sh|png)$/.test(k[4] ?? ''));
    expect(sTsel).toHaveLength(158);
    expect(zhivi.length - sTsel.length).toBe(2);

    const doshli = sTsel.filter((k) => existsSync(k[4]!));
    // 54 са пристигнали · останалите 104 чакат своя резен. Числото е СЪСТОЯНИЕ,
    // не дефект: резени 7 · 8 · 9+ ще го вдигат.
    expect(doshli).toHaveLength(54);
    expect(sTsel.length - doshli.length).toBe(104);
  });
});
