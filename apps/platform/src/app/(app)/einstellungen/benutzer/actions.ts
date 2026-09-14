"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { requireRole, ForbiddenError } from "@/server/auth/guards";
import { logActivity, diffOf } from "@/server/activity";
import { countActiveInhaber } from "@/server/queries/users";

export type UserFormState = { error?: string; success?: string };

const ROLES = ["INHABER", "DISPONENT", "MONTEUR", "BUCHHALTUNG"] as const;

const createSchema = z.object({
  name: z.string().trim().min(2, "Name fehlt"),
  email: z.string().trim().toLowerCase().email("E-Mail ist ungültig"),
  phone: z.string().trim().optional(),
  role: z.enum(ROLES),
  password: z.string(),
});

/** Заведение нового сотрудника. Доступно только владельцу. */
export async function createUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireRole("INHABER");

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? undefined,
    role: formData.get("role"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }
  const { name, email, phone, role, password } = parsed.data;

  const weak = validatePasswordStrength(password);
  if (weak) return { error: weak };

  if (await db.user.findUnique({ where: { email } })) {
    return { error: `Ein Benutzer mit ${email} existiert bereits` };
  }

  const created = await db.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      role,
      passwordHash: await hashPassword(password),
    },
  });

  await logActivity({
    entity: "User",
    entityId: created.id,
    action: "user.created",
    userId: actor.id,
    diff: { name: [null, name], email: [null, email], role: [null, role] },
  });

  revalidatePath("/einstellungen/benutzer");
  return { success: `${name} wurde angelegt` };
}

const updateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2),
  phone: z.string().trim().optional(),
  role: z.enum(ROLES),
  active: z.coerce.boolean(),
});

/** Изменение данных, роли и доступа сотрудника. */
export async function updateUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireRole("INHABER");

  const parsed = updateSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    phone: formData.get("phone") ?? undefined,
    role: formData.get("role"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: "Eingabe ungültig" };

  const { userId, name, phone, role, active } = parsed.data;

  const before = await db.user.findUnique({ where: { id: userId } });
  if (!before) return { error: "Benutzer nicht gefunden" };

  // Нельзя остаться без единственного активного владельца: иначе цены
  // не сможет поставить никто, и в систему будет не войти.
  const losesInhaber =
    before.role === "INHABER" && (role !== "INHABER" || !active);
  if (losesInhaber && (await countActiveInhaber(userId)) === 0) {
    return {
      error:
        "Der letzte aktive Inhaber kann weder deaktiviert noch herabgestuft werden",
    };
  }

  const after = { name, phone: phone || null, role: role as Role, active };
  const changes = diffOf(before as unknown as Record<string, unknown>, after);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        ...after,
        // Отключение или смена роли обязаны действовать немедленно, а не
        // через восемь часов, когда истечёт выданный токен.
        ...(changes.active || changes.role
          ? { sessionsValidFrom: new Date() }
          : {}),
      },
    });
    await tx.activityLog.create({
      data: {
        entity: "User",
        entityId: userId,
        userId: actor.id,
        action: "user.updated",
        diff: changes,
      },
    });
  });

  revalidatePath("/einstellungen/benutzer");
  return { success: `${name} wurde gespeichert` };
}

/** Назначение нового пароля сотруднику, забывшему свой. */
export async function resetPasswordAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireRole("INHABER");

  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");

  const weak = validatePasswordStrength(password);
  if (weak) return { error: weak };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Benutzer nicht gefunden" };

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(password),
        // Смена пароля выкидывает все открытые сессии этого человека.
        sessionsValidFrom: new Date(),
      },
    });
    await tx.activityLog.create({
      data: {
        entity: "User",
        entityId: userId,
        userId: actor.id,
        action: "user.password_reset",
      },
    });
  });

  revalidatePath("/einstellungen/benutzer");
  return { success: `Neues Passwort für ${user.name} gesetzt` };
}

/**
 * Сброс второго фактора: телефон потерян, коды восстановления кончились.
 * Сам себе владелец 2FA сбросить не может — иначе достаточно увести его
 * открытую сессию, чтобы выключить защиту.
 */
export async function resetTotpAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireRole("INHABER");
  const userId = String(formData.get("userId") ?? "");

  if (userId === actor.id) {
    throw new ForbiddenError(
      "Die eigene Zwei-Faktor-Anmeldung kann nicht zurückgesetzt werden",
    );
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Benutzer nicht gefunden" };

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        totpEnabledAt: null,
        sessionsValidFrom: new Date(),
      },
    });
    await tx.recoveryCode.deleteMany({ where: { userId } });
    await tx.activityLog.create({
      data: {
        entity: "User",
        entityId: userId,
        userId: actor.id,
        action: "user.totp_reset",
      },
    });
  });

  revalidatePath("/einstellungen/benutzer");
  return {
    success: `Zwei-Faktor-Anmeldung für ${user.name} zurückgesetzt`,
  };
}
