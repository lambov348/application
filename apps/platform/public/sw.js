/**
 * Service worker приложения.
 *
 * Задача одна: чтобы приложение открывалось и осмысленно вело себя при
 * плохой связи — глава 5.6 ТЗ, «всё должно работать при слабом интернете
 * в подвале».
 *
 * ГЛАВНОЕ ПРАВИЛО БЕЗОПАСНОСТИ: страницы с данными никогда не кэшируются.
 * Телефон монтажника могут потерять или передать другому человеку; адреса,
 * телефоны клиентов и фотографии объектов не должны оставаться в кэше
 * браузера после выхода из системы. Кэшируются только неизменяемые файлы
 * сборки, иконки и страница-заглушка «нет связи».
 *
 * Очередь отправки фотографий из офлайна появится вместе с кабинетом
 * монтажника (кусок 9) — она требует IndexedDB и фоновой синхронизации.
 */

const VERSION = "v1";
const SHELL_CACHE = `ms24-shell-${VERSION}`;
const ASSET_CACHE = `ms24-assets-${VERSION}`;

/** Файлы, без которых не показать даже заглушку. */
const SHELL_FILES = [
  "/offline",
  "/icons/icon-192.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      // Новая версия вступает в силу сразу, без ожидания закрытия вкладок:
      // иначе исправление доедет до телефона через несколько дней.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== SHELL_CACHE && name !== ASSET_CACHE)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Неизменяемые файлы сборки: их имена содержат хеш содержимого, поэтому
 * старый файл никогда не «протухает» — его просто перестают запрашивать.
 */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Всё, что меняет состояние, идёт только в сеть. Кэшировать вход, отправку
  // форм и загрузку фотографий нельзя.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Чужие домены не трогаем.
  if (url.origin !== self.location.origin) return;

  // Ответы Auth.js и серверных действий — только сеть, никакого кэша.
  if (url.pathname.startsWith("/api/")) return;

  if (isImmutableAsset(url)) {
    // Сначала кэш: содержимое по этому адресу неизменно.
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Переходы между страницами: только сеть. Страницу с данными клиента
  // в кэш не кладём — при недоступной сети показываем заглушку.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match("/offline")
          .then(
            (cached) =>
              cached ??
              new Response("Keine Verbindung", {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              }),
          ),
      ),
    );
  }
});
