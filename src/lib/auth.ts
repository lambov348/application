import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

// Сессия хранится в httpOnly-куке в виде подписанного JWT.
// Проверка подписи и ролей выполняется на сервере (в actions и layout'ах),
// поэтому подделать роль на клиенте невозможно.

export type SessionUser = {
  id: string;
  name: string;
  role: "admin" | "worker";
};

const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 дней

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET не задан или слишком короткий. Проверьте файл .env"
    );
  }
  return new TextEncoder().encode(secret);
}

// Создаёт сессию и кладёт JWT в куку.
export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Возвращает текущего пользователя или null (для необязательных проверок).
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.id === "string" &&
      typeof payload.name === "string" &&
      (payload.role === "admin" || payload.role === "worker")
    ) {
      return { id: payload.id, name: payload.name, role: payload.role };
    }
    return null;
  } catch {
    // Невалидный или просроченный токен.
    return null;
  }
}

// Требует авторизованного пользователя, иначе редирект на логин.
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

// Требует роль admin.
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/worker");
  return user;
}

// Требует роль worker.
export async function requireWorker(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "worker") redirect("/admin");
  return user;
}
