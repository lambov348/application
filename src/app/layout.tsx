import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MöbelStock24 — заявки на перевозку мебели",
  description:
    "Оставьте заявку на перевозку, доставку и сборку мебели. MöbelStock24.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
