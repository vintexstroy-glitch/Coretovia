/**
 * ДЖОБЪТ · служебният работник, който прави приложението офлайн продукт.
 *
 * Три правила, всяко взето заради Журнала (пренесени от MasterBook):
 *
 *   1. КЕШ-ПЪРВО, без изключение. Приложението няма нито една заявка навън.
 *   2. НИКАКВО АВТОМАТИЧНО ПРЕЗАРЕЖДАНЕ. Няма `skipWaiting()`. Новата версия
 *      чака всички раздели да се затворят. Страница, която се сменя под
 *      ръцете на човек, въвеждащ плащане, е по-опасна от стара страница.
 *   3. СТАРИТЕ КЕШОВЕ СЕ ТРИЯТ при активиране.
 *
 * Списъкът на черупката се ВПИСВА след `vite build` от `stroezh/pechat-sw.mjs`,
 * защото Vite слага хеш в имената.
 */

const VERSIYA = '__VERSIYA__';
const CHERUPKA = __CHERUPKA__;
const KESH = `coretovia-${VERSIYA}`;

self.addEventListener('install', (sabitie) => {
  sabitie.waitUntil(caches.open(KESH).then((kesh) => kesh.addAll(CHERUPKA)));
});

self.addEventListener('activate', (sabitie) => {
  sabitie.waitUntil(
    (async () => {
      for (const ime of await caches.keys()) {
        if (ime.startsWith('coretovia-') && ime !== KESH) await caches.delete(ime);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (sabitie) => {
  const iskane = sabitie.request;
  if (iskane.method !== 'GET') return;
  // ЧУЖДОТО НЕ МИНАВА ПРЕЗ ДЖОБА · нито се пази, нито се подменя.
  if (new URL(iskane.url).origin !== self.location.origin) return;

  sabitie.respondWith(
    (async () => {
      const otKesha = await caches.match(iskane, { ignoreSearch: true });
      if (otKesha) return otKesha;
      try {
        const otvod = await fetch(iskane);
        if (otvod.ok) {
          const kesh = await caches.open(KESH);
          await kesh.put(iskane, otvod.clone());
        }
        return otvod;
      } catch {
        if (iskane.mode === 'navigate') {
          const cherupka = await caches.match('./index.html');
          if (cherupka) return cherupka;
        }
        throw new Error('Офлайн, и това го няма в джоба.');
      }
    })(),
  );
});
