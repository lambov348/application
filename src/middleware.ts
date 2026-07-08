import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Middleware — первый барьер защиты маршрутов /admin и /worker.
// Основная проверка ролей всё равно дублируется на сервере (в layout'ах и actions),
// это лишь ранний редирект неавторизованных пользователей.

const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "");

async function readRole(token?: string): Promise<"admin" | "worker" | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "admin" || payload.role === "worker"
      ? payload.role
      : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;
  const role = await readRole(token);

  const wantsAdmin = pathname.startsWith("/admin");
  const wantsWorker = pathname.startsWith("/worker");
  const wantsCrm = pathname.startsWith("/crm");

  if ((wantsAdmin || wantsWorker || wantsCrm) && !role) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (wantsAdmin && role !== "admin") {
    return NextResponse.redirect(new URL("/worker", req.url));
  }
  if (wantsWorker && role !== "worker") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  // CRM доступна и админу, и работнику — достаточно быть авторизованным.

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/worker/:path*", "/crm/:path*"],
};
