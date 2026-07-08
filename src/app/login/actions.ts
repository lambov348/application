"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { getI18n } from "@/lib/i18n.server";

export type LoginState = { error?: string };

// Вход по email + паролю. Роль определяется записью пользователя в БД.
export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const { t } = await getI18n();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: t.login.fillBoth };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Одинаковое сообщение для несуществующего/отключённого/неверного пароля.
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return { error: t.login.error };
  }

  await createSession({
    id: user.id,
    name: user.name,
    role: user.role === "admin" ? "admin" : "worker",
  });

  // Админ работает в CRM (воронка). Работник — в своём кабинете.
  redirect(user.role === "admin" ? "/crm" : "/worker");
}
