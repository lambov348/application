import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Barlow } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

// next/font скачивает шрифты на этапе сборки и отдаёт их со своего домена.
// Браузер сотрудника не обращается к Google — требование DSGVO выполняется
// без отдельного согласия на шрифты.
//
// ВНИМАНИЕ: у Barlow нет кириллического начертания. Немецкий интерфейс
// выглядит как в макете, русский падает на запасной шрифт из стека в
// globals.css. Решение по единому шрифту для обоих языков — за владельцем.
// Только то, что реально используется в интерфейсе.
//
// Было 12 файлов и 153 КБ: четыре насыщенности и два набора символов для
// двух семейств. Узкое начертание из макета не применялось ни в одном
// компоненте, насыщенность 500 тоже; набор latin-ext нужен для
// восточноевропейских языков, которых у нас нет (немецкие ä ö ü ß входят
// в основной набор latin). Осталось два файла.
//
// Для телефона монтажника это не косметика: на слабой связи каждый
// лишний файл шрифта — отдельный круг обращения к серверу.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MöbelStock24",
  // Внутренний инструмент: индексация поисковиками не нужна.
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    // iOS запускает приложение с домашнего экрана без адресной строки.
    capable: true,
    title: "MöbelStock24",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1E2326",
  width: "device-width",
  initialScale: 1,
  // Масштабирование не запрещаем: монтажник в перчатках и на солнце должен
  // иметь возможность увеличить адрес объекта.
  maximumScale: 5,
  viewportFit: "cover", // учёт «чёлки» на телефонах
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={barlow.variable}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
