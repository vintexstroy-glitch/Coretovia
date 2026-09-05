/**
 * ОСЕМТЕ ПРОЗОРЕЦА · кой файл рисува кой ключ · един дом (правило 14).
 * Осемте са построени; онова, което още го няма ВЪТРЕ в тях, го казват сами.
 */

import type { KlyuchNaProzorets } from '../../src/model/klyuchove.js';
import type { KonteksNaEkrana } from '../kontekst.js';
import { narisuvayII } from './ii.js';
import { narisuvayImoti } from './imoti.js';
import { narisuvayNastroyki } from './nastroyki.js';
import { narisuvayOstanalite } from './ostanalite.js';
import { narisuvayProdazhbi } from './prodazhbi.js';
import { narisuvaySluzhiteli } from './sluzhiteli.js';
import { narisuvaySmetki } from './smetki.js';
import { narisuvayProfil } from './profil.js';
import { narisuvayUpravlenie } from './upravlenie.js';

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
    case 'upravlenie':
      narisuvayUpravlenie(k);
      return;
    case 'smetki':
      narisuvaySmetki(k);
      return;
    case 'sluzhiteli':
      narisuvaySluzhiteli(k);
      return;
    case 'prodazhbi':
      narisuvayProdazhbi(k);
      return;
    default:
      narisuvayOstanalite(k, klyuch);
  }
}
