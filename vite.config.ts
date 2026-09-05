import { defineConfig } from 'vite';

/**
 * ОТНОСИТЕЛНИ ПЪТИЩА · за да върви и от ПОДПАПКА (урок от MasterBook, ADR-054).
 *
 * GitHub Pages сервира проекта на `…/Coretovia/`, не в корена. Заковано `/`,
 * всеки път към `assets/` би сочил корена на домейна и страницата би била бяла
 * без нито едно съобщение. `'./'` работи и в корена, и в подпапка.
 */
export default defineConfig({
  base: './',
  root: 'app',
  server: { port: 5173, open: false },
  build: { outDir: '../dist', emptyOutDir: true },
});
