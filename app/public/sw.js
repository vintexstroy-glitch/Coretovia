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
  // `cache: 'reload'` ЗАОБИКАЛЯ HTTP кеша · измерено: живият адрес връща
  // `max-age=600`, тоест `./` идва от кеша и новият работник инсталира СТАРАТА
  // черупка — бял екран до следващото пускане, без нищо счупено в кода.
  sabitie.waitUntil(
    caches
      .open(KESH)
      .then((kesh) => kesh.addAll(CHERUPKA.map((u) => new Request(u, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (sabitie) => {
  sabitie.waitUntil(
    (async () => {
      // ВСЕКИ чужд кеш пада, не само нашите стари. Кеш, създаден от друг код
      // на този произход, преживяваше всяко пускане — и печелеше пред нашия по
      // ред на създаване. Филтър по наше име пази нас от нас, не нас от чужд.
      for (const ime of await caches.keys()) {
        if (ime !== KESH) await caches.delete(ime);
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
      // СВОЯ кеш, не CacheStorage · голото `caches.match` обхожда ВСИЧКИ кешове
      // на произхода, включително чужди. Това беше трайният път за подмяна на
      // скрипт: преживява презареждане и работи офлайн.
      const kesh = await caches.open(KESH);
      const otKesha = await kesh.match(iskane, { ignoreSearch: true });
      if (otKesha) return otKesha;
      try {
        const otvod = await fetch(iskane);
        if (otvod.ok) await kesh.put(iskane, otvod.clone());
        return otvod;
      } catch {
        if (iskane.mode === 'navigate') {
          const cherupka = await kesh.match('./index.html');
          if (cherupka) return cherupka;
        }
        throw new Error('Офлайн, и това го няма в джоба.');
      }
    })(),
  );
});
