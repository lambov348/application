import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Локаль хранится в куке, без префикса в URL: это внутренний инструмент,
// ссылки на заявку должны быть одинаковыми у всех сотрудников.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone", // компактный образ для Docker

  // Без этого Next принимает за корень весь репозиторий (там лежит package.json
  // старого приложения), кладёт server.js в .next/standalone/apps/platform/ и
  // тащит в образ чужие файлы. Прибиваем корень к папке платформы.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  poweredByHeader: false,

  // Сборка PDF (@react-pdf/renderer → pdfkit) подгружает данные встроенных
  // шрифтов обычным require по вычисляемому пути. Трассировщик Next такие
  // обращения не видит, и в образ они не попадают: PDF ломался бы только
  // в продакшене — в разработке файлы лежат в node_modules.
  // Проверено: без этой строки standalone-сборка падает с
  // MODULE_NOT_FOUND pdfkit/js/standard-fonts/Helvetica.cjs.
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/pdfkit/js/standard-fonts/**",
      "./node_modules/pdfkit/js/data/**",
    ],
  },
  experimental: {
    // Server Actions вызываются только из приложения; ограничиваем источники.
    serverActions: { bodySizeLimit: "12mb" }, // фото с телефона монтажника
  },
};

export default withNextIntl(nextConfig);
