/**
 * ОСЕМТЕ ПРОЗОРЕЦА · кой файл рисува кой ключ · един дом (правило 14).
 * Четири са построени (Профил · Имоти · ИИ · Настройки); другите четири казват кога идват.
 */

import type { KlyuchNaProzorets } from '../../src/model/klyuchove.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { narisuvayII } from './ii.js';
import { narisuvayImoti } from './imoti.js';
import { narisuvayNastroyki } from './nastroyki.js';
import { narisuvayOstanalite } from './ostanalite.js';
import { narisuvayProfil } from './profil.js';

export function narisuvayProzorets(klyuch: KlyuchNaProzorets, k: KonteksNaEkrana): void {
  switch (klyuch) {
    case 'profil':
      narisuvayProfil(k);
      return;
    case 'imoti':
      narisuvayImoti(k);
      return;
    case 'nastroyki':
      narisuvayNastroyki(k);
      return;
    case 'ii':
      narisuvayII(k);
      return;
    default:
      narisuvayOstanalite(k, klyuch);
  }
}
