"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/server/activity";
import { requireRole } from "@/server/auth/guards";

export type ExtraDecisionState = { error?: string; success?: string };

const decisionSchema = z.object({
  extraId: z.string().min(1),
  decision: z.enum(["ANGENOMMEN", "ABGELEHNT"]),
  note: z.string().trim().max(500).optional(),
});

/**
 * Решение по сообщению о доплате (глава 5.6.7 ТЗ).
 *
 * Только владелец: это деньги. Жёсткое требование главы 4 — цену ставит и
 * меняет только Inhaber, — и решение о доплате из той же области. Диспетчер
 * сообщение видит, но согласовать не может.
 *
 * Согласие не меняет цену заказа само: владелец решает, войдёт ли доплата
 * в счёт, и ставит цену отдельным действием. Иначе одна кнопка на телефоне
 * монтажника двигала бы сумму заказа.
 */
export async function decideExtraAction(
  _prev: ExtraDecisionState,
  formData: FormData,
): Promise<ExtraDecisionState> {
  const actor = await requireRole("INHABER");

  const parsed = decisionSchema.safeParse({
    extraId: formData.get("extraId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: "Eingabe ungültig" };
  const d = parsed.data;

  const extra = await db.extraRequest.findUnique({
    where: { id: d.extraId },
    select: {
      id: true,
      status: true,
      appointmentId: true,
      appointment: { select: { dealId: true } },
    },
  });
  if (!extra) return { error: "Meldung nicht gefunden" };
  if (extra.status !== "OFFEN") {
    return { error: "Über diese Meldung wurde bereits entschieden" };
  }

  const decidedAt = new Date();

  await db.$transaction(async (tx) => {
    await tx.extraRequest.update({
      where: { id: d.extraId },
      data: {
        status: d.decision,
        decidedById: actor.id,
        decidedAt,
        decisionNote: d.note || null,
      },
    });
    await logActivity({
      entity: "Appointment",
      entityId: extra.appointmentId,
      action: "extra.decided",
      userId: actor.id,
      diff: {
        meldung: [null, d.extraId],
        entscheidung: ["OFFEN", d.decision],
        ...(d.note ? { notiz: [null, d.note] } : {}),
      },
      tx,
    });
  });

  revalidatePath("/heute");
  revalidatePath(`/m/auftrag/${extra.appointmentId}`);
  revalidatePath(`/anfragen/${extra.appointment.dealId}`);
  return { success: "Entscheidung gespeichert" };
}
