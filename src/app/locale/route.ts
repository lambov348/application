import { NextRequest, NextResponse } from "next/server";
import { LOCALES, Locale } from "@/lib/i18n";

// Установка языка: сохраняем выбор в куке и возвращаемся на текущую страницу.
export async function GET(req: NextRequest) {
  const l = req.nextUrl.searchParams.get("l") ?? "";
  const next = req.nextUrl.searchParams.get("next") || "/";
  // next должен быть внутренним путём (защита от открытого редиректа).
  const safeNext = next.startsWith("/") ? next : "/";

  const res = NextResponse.redirect(new URL(safeNext, req.url));
  if (LOCALES.includes(l as Locale)) {
    res.cookies.set("locale", l, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return res;
}
