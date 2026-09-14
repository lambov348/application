import type { MetadataRoute } from "next";

/**
 * Манифест PWA. Благодаря ему телефон предлагает «Добавить на домашний экран»,
 * и приложение запускается на весь экран без адресной строки браузера.
 *
 * Магазины приложений намеренно не используются (глава 5.6 ТЗ): Apple
 * отклоняет обёртки вокруг сайта по правилу 4.2, а ревью каждого обновления
 * занимает дни. Установка по ссылке даёт тот же результат за секунды.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MöbelStock24",
    short_name: "MöbelStock24",
    description: "Interne Plattform für Montage und Einsatzplanung",
    lang: "de",
    // Запуск сразу в кабинете монтажника: приложение на телефоне ставят они.
    start_url: "/m",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1E2326",
    theme_color: "#1E2326",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        // Android обрезает значок под форму системы: содержимое уведено внутрь.
        purpose: "maskable",
      },
    ],
  };
}
