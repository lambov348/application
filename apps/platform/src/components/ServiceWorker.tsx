"use client";

import { useEffect } from "react";

/**
 * Регистрация service worker'а.
 *
 * Только в продакшене: в режиме разработки он перехватывал бы файлы сборки
 * и пришлось бы вручную чистить кэш после каждой правки.
 *
 * Компонент ничего не рисует и весит несколько строк — на скорость загрузки
 * не влияет.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Регистрация может не пройти в приватном окне или при запрете
      // хранилища. Приложение обязано работать и без него.
    });
  }, []);

  return null;
}
