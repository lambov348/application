import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Barlow, Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";

// next/font скачивает шрифты на этапе сборки и отдаёт их со своего домена.
// Браузер сотрудника не обращается к Google — требование DSGVO выполняется
// без отдельного согласия на шрифты.
//
// ВНИМАНИЕ: у Barlow нет кириллического начертания. Немецкий интерфейс
// выглядит как в макете, русский падает на запасной шрифт из стека в
// globals.css. Решение по единому шрифту для обоих языков — за владельцем.
const barlow = Barlow({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCond = Barlow_Semi_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  variable: "--font-barlow-cond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MöbelStock24",
  // Внутренний инструмент: индексация поисковиками не нужна.
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${barlow.variable} ${barlowCond.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
