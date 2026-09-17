"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth/guards";
import { logActivity, diffOf } from "@/server/activity";

export type FormState = { error?: string; success?: string };

const teamSchema = z.object({
  teamId: z.string().optional(),
  name: z.string().trim().min(2, "Name der Kolonne fehlt").max(60),
  // Цвет задаёт полосу в календаре, поэтому принимаем только корректный hex.
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Farbe muss ein Hex-Wert sein, z. B. #1A4F7A"),
  sort: z.coerce.number().int().min(0).max(999).default(0),
  active: z.coerce.boolean(),
  members: z.array(z.string()).default([]),
});

export async function saveTeamAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER");

  const parsed = teamSchema.safeParse({
    teamId: formData.get("teamId") || undefined,
    name: formData.get("name"),
    color: formData.get("color"),
    sort: formData.get("sort") || 0,
    active: formData.get("active") === "on",
    members: formData.getAll("members"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }
  const d = parsed.data;

  const duplicate = await db.team.findFirst({
    where: { name: d.name, ...(d.teamId ? { id: { not: d.teamId } } : {}) },
  });
  if (duplicate) {
    return { error: `Eine Kolonne mit dem Namen „${d.name}“ existiert bereits` };
  }

  const data = { name: d.name, color: d.color, sort: d.sort, active: d.active };

  await db.$transaction(async (tx) => {
    const team = d.teamId
      ? await tx.team.update({ where: { id: d.teamId }, data })
      : await tx.team.create({ data });

    // Состав переписываем целиком: так проще и не оставляет призраков.
    await tx.teamMember.deleteMany({ where: { teamId: team.id } });
    if (d.members.length > 0) {
      await tx.teamMember.createMany({
        data: d.members.map((userId) => ({ teamId: team.id, userId })),
        skipDuplicates: true,
      });
    }

    await tx.activityLog.create({
      data: {
        entity: "User", // бригада — часть настроек персонала
        entityId: team.id,
        userId: actor.id,
        action: d.teamId ? "team.updated" : "team.created",
        diff: { name: [null, d.name], mitglieder: [null, d.members.length] },
      },
    });
  });

  revalidatePath("/einstellungen/teams");
  revalidatePath("/einsatzplan");
  return { success: d.teamId ? "Kolonne gespeichert" : "Kolonne angelegt" };
}

/**
 * Отключение бригады. Удаления нет: на бригаду ссылаются прошлые выезды,
 * и стирать её значило бы потерять историю, кто работал.
 */
export async function toggleTeamAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER");
  const teamId = String(formData.get("teamId") ?? "");

  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team) return { error: "Kolonne nicht gefunden" };

  await db.$transaction(async (tx) => {
    await tx.team.update({
      where: { id: teamId },
      data: { active: !team.active },
    });
    await tx.activityLog.create({
      data: {
        entity: "User",
        entityId: teamId,
        userId: actor.id,
        action: "team.updated",
        diff: diffOf({ active: team.active }, { active: !team.active }),
      },
    });
  });

  revalidatePath("/einstellungen/teams");
  revalidatePath("/einsatzplan");
  return { success: team.active ? "Kolonne deaktiviert" : "Kolonne aktiviert" };
}
