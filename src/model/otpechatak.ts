/**
 * ОТПЕЧАТЪКЪТ НА МОДЕЛА · каноничен четим низ на СТРУКТУРАТА (решение 13).
 *
 * Два различни отпечатъка с две имена: `kursor` е състоянието (докъде е
 * стигнала веригата), а това е структурата — версия · таблици · колони ·
 * номерация · номенклатури. БЕЗ стойности, бройки, инструкции и абсолютни
 * редове: изнесена Книга сочи с него „с кой Модел съм правена", и резен 2
 * знае дали може да я прочете, преди да е прочел клетка.
 *
 * Четим, не хеш: разминаване трябва да се вижда с очи — кое се е сменило.
 */

import type { Model } from './model.js';

export function otpechatakNaModela(m: Model): string {
  const redove: string[] = [`versiya ${m.versiya}`];
  for (const p of m.prozortsi) redove.push(`prozorets ${p.klyuch}`);
  for (const t of [...m.tablitsi.values()].sort((a, b) => a.klyuch.localeCompare(b.klyuch))) {
    const koloni = t.koloni
      .map((k) =>
        [
          k.klyuch,
          k.vid,
          k.nomenklatura ?? '',
          (k.vrazka ?? []).join('+'),
          k.zatvorena ? 'z' : '',
        ].join(':'),
      )
      .join(' ');
    const nomeratsiya = (t.nomeratsiya?.segmenti ?? [])
      .map((s) =>
        'kolona' in s ? `${s.ot}(${s.kolona})` : 'nomer' in s ? `${s.ot}(${s.nomer})` : s.ot,
      )
      .join('.');
    redove.push(`tablitsa ${t.klyuch} ${t.prozorets} ${t.sashtnost} | ${koloni} | ${nomeratsiya}`);
  }
  for (const n of [...m.nomenklaturi.values()].sort((a, b) => a.klyuch.localeCompare(b.klyuch))) {
    redove.push(
      `nomenklatura ${n.klyuch} ${n.vid}${n.podredbaPo === undefined ? '' : ` po ${n.podredbaPo}`}`,
    );
  }
  return redove.join('\n');
}
