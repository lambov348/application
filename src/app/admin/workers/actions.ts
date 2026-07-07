"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n.server";

export type WorkerFormState = { error?: string; success?: string };

// Создать нового исполнителя с логином и паролем (пароль хэшируется).
export async function createWorker(
  _prev: WorkerFormState,
  formData: FormData
): Promise<WorkerFormState> {
  await requireAdmin();
  const { t } = await getI18n();

  const schema = z.object({
    name: z.string().trim().min(2, t.workers.errName),
    email: z.string().trim().toLowerCase().email(t.workers.errEmail),
    password: z.string().min(6, t.workers.errPassword),
  });

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.orderErrors.generic };
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: t.workers.errExists };
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
  return { success: fmt(t.workers.added, { name }) };
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
