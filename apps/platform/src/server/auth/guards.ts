/**
 * Авторитетные проверки доступа. Исполняются в Node, где есть база.
 *
 * Middleware проверяет только claims из токена и потому отстаёт от реальности:
 * отключённого сотрудника его токен пропускал бы до истечения срока. Здесь
 * состояние читается из базы на каждом обращении.
 *
 * Правило проекта: ни одна страница и ни одно действие не обращается к
 * db напрямую — сначала сюда за пользователем, потом в src/server/queries/.
 */
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/** Пользователь, проверенный по базе в рамках текущего запроса. */
export type CurrentUser = Pick<
  User,
  "id" | "name" | "email" | "role" | "active" | "locale"
>;

/**
 * cache() из React держит результат в пределах одного запроса: страница,
 * макет и вложенные компоненты получают одного пользователя за один поход
 * в базу, а не за пять.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      locale: true,
      sessionsValidFrom: true,
    },
  });

  // Пользователя удалили или отключили — токен больше ничего не значит.
  if (!user || !user.active) return null;

  // Сессии отозваны: всё, что выдано до отметки, недействительно.
  // Секунда допуска — токен выписывается на мгновение позже записи в базу.
  const issuedAt = session.user.sessionsValidFrom ?? 0;
  if (issuedAt + 1000 < user.sessionsValidFrom.getTime()) return null;

  const { sessionsValidFrom: _unused, ...rest } = user;
  return rest;
});

/** Пользователь или перенаправление на вход. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Пользователь одной из перечисленных ролей, иначе — на свою страницу. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(user.role === "MONTEUR" ? "/m" : "/heute");
  }
  return user;
}

/**
 * Ошибка нарушения прав в серверном действии. В отличие от requireRole,
 * не перенаправляет: действие обязано отказать, а не увести пользователя.
 */
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Жёсткое требование главы 4 ТЗ: цену ставит и меняет только владелец.
 * Единственное место в коде, где это решается.
 */
export function assertCanSetPrice(user: CurrentUser): void {
  if (user.role !== "INHABER") {
    throw new ForbiddenError(
      "Preise dürfen nur vom Inhaber gesetzt oder geändert werden",
    );
  }
}

/**
 * Жёсткое требование главы 4 ТЗ: монтажник не видит цену заказа.
 * Используется как охрана в слое запросов — поля цены не должны даже
 * попадать в выборку, а не прятаться в разметке.
 */
export function canSeePrices(user: CurrentUser): boolean {
  return user.role !== "MONTEUR";
}

export function assertRole(user: CurrentUser, ...roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new ForbiddenError(
      `Diese Aktion ist für die Rolle ${user.role} nicht erlaubt`,
    );
  }
}

/**
 * IP клиента для журнала. За обратным прокси настоящий адрес приходит
 * в X-Forwarded-For; берём первый элемент цепочки.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return h.get("x-real-ip");
}
