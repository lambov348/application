import { NextResponse } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

/**
 * Переключение языка. Кука, а не префикс в URL: ссылка на заявку, отправленная
 * коллеге, должна открываться одинаково у всех.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const locale = form.get("locale");
  const back = form.get("back");

  if (typeof locale !== "string" || !isLocale(locale)) {
    return NextResponse.json({ error: "Unbekannte Sprache" }, { status: 400 });
  }

  // Возврат только на внутренний путь: открытое перенаправление —
  // готовый инструмент для фишинга.
  const target =
    typeof back === "string" && back.startsWith("/") && !back.startsWith("//")
      ? back
      : "/";

  // Перенаправление относительным адресом, а не через new URL(..., request.url).
  // В standalone-режиме и за обратным прокси request.url собирается не из
  // заголовка Host: получался переход на localhost, куда кука, выставленная
  // для настоящего хоста, уже не отправляется — язык молча не менялся.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: target },
  });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}
