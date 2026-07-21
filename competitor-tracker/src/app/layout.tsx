import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Competitor Tracker — анализ конкурентов",
  description:
    "Введите сайт конкурента и получите разбор: рекламные и трекинг-системы, SEO, техстек, сравнение с вами и рекомендации что делать.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="text-slate-200 antialiased">{children}</body>
    </html>
  );
}
