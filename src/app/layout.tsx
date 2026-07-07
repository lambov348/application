import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "@/lib/i18n.server";

export const metadata: Metadata = {
  title: "MöbelStock24 — Möbeltransport & Montage",
  description:
    "Anfrage für Möbeltransport, Lieferung und Montage. MöbelStock24.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
