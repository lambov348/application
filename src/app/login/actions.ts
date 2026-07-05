"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";

export type LoginState = { error?: string };

// Вход по email + паролю. Роль определяется записью пользователя в БД.
export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Введите email и пароль" };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Одинаковое сообщение для несуществующего/отключённого/неверного пароля,
  // чтобы не раскрывать, какие логины существуют.
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Неверный email или пароль" };
  }

  await createSession({
    id: user.id,
    name: user.name,
    role: user.role === "admin" ? "admin" : "worker",
  });

  redirect(user.role === "admin" ? "/admin" : "/worker");
}
