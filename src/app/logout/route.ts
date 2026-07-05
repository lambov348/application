import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

// Выход: чистим сессионную куку и возвращаем на страницу входа.
export async function POST(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", req.url));
}
