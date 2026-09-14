/**
 * Запросы по пользователям.
 *
 * Правило проекта: страницы и действия не ходят в db напрямую — только через
 * этот слой. Так добавление второй фирмы (мандант, Этап 4 ТЗ) сведётся к
 * правке одного слоя, а не к охоте по всему приложению.
 */
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  active: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export async function listUsers(): Promise<UserListItem[]> {
  const users = await db.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      active: true,
      totpEnabledAt: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  // Наружу отдаём факт «2FA включена», а не отметку времени и тем более
  // не секрет.
  return users.map(({ totpEnabledAt, ...rest }) => ({
    ...rest,
    twoFactorEnabled: totpEnabledAt !== null,
  }));
}

/** Сколько активных владельцев в системе. Нужно, чтобы не остаться без единого. */
export async function countActiveInhaber(excludeUserId?: string): Promise<number> {
  return db.user.count({
    where: {
      role: "INHABER",
      active: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}
