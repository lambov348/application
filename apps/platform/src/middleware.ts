import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Две задачи.
 *
 * Первая — грубая защита маршрутов по роли из токена (callback authorized).
 * Работает в edge-среде, поэтому базы здесь нет: авторитетные проверки делает
 * requireUser() в guards.ts.
 *
 * Вторая — прокинуть текущий путь в заголовок. Серверные компоненты своего
 * URL не знают, а переключателю языка нужно вернуть человека на ту же
 * страницу, а не на корень.
 */
export default auth((request) => {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-pathname",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    // Всё, кроме статики и файлов Next.js.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)",
  ],
};
