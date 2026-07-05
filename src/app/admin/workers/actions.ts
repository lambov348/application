"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export type WorkerFormState = { error?: string; success?: string };

const WorkerSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя"),
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  password: z.string().min(6, "Пароль минимум 6 символов"),
});

// Создать нового исполнителя с логином и паролем (пароль хэшируется).
export async function createWorker(
  _prev: WorkerFormState,
  formData: FormData
): Promise<WorkerFormState> {
  await requireAdmin();

  const parsed = WorkerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Пользователь с таким email уже существует" };
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "worker",
      active: true,
    },
  });

  revalidatePath("/admin/workers");
  return { success: `Исполнитель ${name} добавлен` };
}

// Включить/отключить исполнителя. Отключённый не может войти и не получает задачи.
export async function toggleWorkerActive(formData: FormData) {
  await requireAdmin();
  const workerId = String(formData.get("workerId") ?? "");
  if (!workerId) return;

  const worker = await prisma.user.findFirst({
    where: { id: workerId, role: "worker" },
  });
  if (!worker) return;

  await prisma.user.update({
    where: { id: workerId },
    data: { active: !worker.active },
  });

  revalidatePath("/admin/workers");
}
