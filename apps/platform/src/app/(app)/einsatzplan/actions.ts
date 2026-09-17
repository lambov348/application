"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AppointmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { fromLocalInputValue } from "@/lib/datetime";
import { requireRole, requireUser } from "@/server/auth/guards";
import { logActivity, diffOf } from "@/server/activity";
import { appointmentsNear } from "@/server/queries/appointments";
import {
  checkCanPlan,
  checkInterval,
  findConflicts,
  type Conflict,
} from "@/server/rules/appointment";

export type PlanState = {
  error?: string;
  success?: string;
  /**
   * Предупреждения о конфликтах. Не отказ: диспетчер видит их и решает сам,
   * подтверждая галочкой «планировать всё равно» (глава 5.3 ТЗ).
   */
  conflicts?: Conflict[];
};

const planSchema = z.object({
  appointmentId: z.string().optional(),
  dealId: z.string().min(1),
  teamId: z.string().optional(),
  start: z.string().min(1, "Beginn fehlt"),
  end: z.string().min(1, "Ende fehlt"),
  dispatcherNote: z.string().trim().max(1000).optional(),
  assignees: z.array(z.string()).default([]),
  force: z.coerce.boolean().default(false),
});

/**
 * Создание и правка выезда.
 *
 * Правило 9.3 главы ТЗ проверяется здесь: Termin невозможен без адреса
 * и без фамилии либо фирмы клиента.
 */
export async function planAppointmentAction(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const actor = await requireRole("INHABER", "DISPONENT");

  const parsed = planSchema.safeParse({
    appointmentId: formData.get("appointmentId") || undefined,
    dealId: formData.get("dealId"),
    teamId: formData.get("teamId") || undefined,
    start: formData.get("start"),
    end: formData.get("end"),
    dispatcherNote: formData.get("dispatcherNote") ?? undefined,
    assignees: formData.getAll("assignees"),
    force: formData.get("force") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }
  const d = parsed.data;

  const deal = await db.deal.findUnique({
    where: { id: d.dealId },
    select: {
      id: true,
      number: true,
      addressId: true,
      status: true,
      customer: { select: { lastName: true, company: true } },
    },
  });
  if (!deal) return { error: "Anfrage nicht gefunden" };

  // Правило 9.3.
  const denied = checkCanPlan(deal);
  if (denied) return { error: denied.message };

  // Поля формы содержат берлинское время без указания пояса — переводим в UTC.
  const startAt = fromLocalInputValue(d.start);
  const endAt = fromLocalInputValue(d.end);
  if (!startAt || !endAt) {
    return { error: "Datum oder Uhrzeit ist ungültig" };
  }

  const badInterval = checkInterval(startAt, endAt);
  if (badInterval) return { error: badInterval.message };

  // Поиск конфликтов: занятая бригада и нехватка времени на переезд.
  let conflicts: Conflict[] = [];
  if (d.teamId) {
    const settings = await db.settings.findUnique({ where: { id: 1 } });
    const buffer = settings?.travelBufferMinutes ?? 30;
    const existing = await appointmentsNear(d.teamId, startAt, endAt);
    conflicts = findConflicts(
      {
        id: d.appointmentId,
        startAt,
        endAt,
        addressId: deal.addressId!,
        teamId: d.teamId,
      },
      existing,
      buffer,
    );
  }

  // Показываем предупреждения и ждём подтверждения. Второй раз с галочкой —
  // сохраняем.
  if (conflicts.length > 0 && !d.force) {
    return { conflicts };
  }

  const data = {
    dealId: d.dealId,
    addressId: deal.addressId!,
    teamId: d.teamId || null,
    startAt,
    endAt,
    dispatcherNote: d.dispatcherNote || null,
  };

  await db.$transaction(async (tx) => {
    const appointment = d.appointmentId
      ? await tx.appointment.update({ where: { id: d.appointmentId }, data })
      : await tx.appointment.create({ data });

    // Состав переписываем целиком — проще и без призраков.
    await tx.appointmentAssignee.deleteMany({
      where: { appointmentId: appointment.id },
    });
    if (d.assignees.length > 0) {
      await tx.appointmentAssignee.createMany({
        data: d.assignees.map((userId) => ({
          appointmentId: appointment.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    // Запланированный выезд двигает заявку в свою колонку: иначе доска
    // разойдётся с календарём.
    if (!d.appointmentId && deal.status !== "TERMIN_GEPLANT") {
      await tx.deal.update({
        where: { id: d.dealId },
        data: { status: "TERMIN_GEPLANT" },
      });
      await tx.activityLog.create({
        data: {
          entity: "Deal",
          entityId: d.dealId,
          userId: actor.id,
          action: "deal.status_changed",
          diff: { status: [deal.status, "TERMIN_GEPLANT"] },
        },
      });
    }

    await tx.activityLog.create({
      data: {
        entity: "Appointment",
        entityId: appointment.id,
        userId: actor.id,
        action: d.appointmentId ? "appointment.updated" : "appointment.created",
        diff: {
          von: [null, startAt.toISOString()],
          bis: [null, endAt.toISOString()],
          kolonne: [null, d.teamId ?? null],
          ...(conflicts.length > 0
            ? { trotzKonflikt: [null, conflicts.map((c) => c.code).join(", ")] }
            : {}),
        },
      },
    });
  });

  revalidatePath("/einsatzplan");
  revalidatePath(`/anfragen/${d.dealId}`);
  return {
    success: d.appointmentId ? "Termin gespeichert" : "Termin geplant",
  };
}

/** Отмена выезда. Удаления нет: история выездов не переписывается. */
export async function cancelAppointmentAction(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const actor = await requireRole("INHABER", "DISPONENT");
  const appointmentId = String(formData.get("appointmentId") ?? "");

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, status: true, dealId: true },
  });
  if (!appointment) return { error: "Termin nicht gefunden" };

  await db.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: "ABGESAGT" },
    });
    await tx.activityLog.create({
      data: {
        entity: "Appointment",
        entityId: appointmentId,
        userId: actor.id,
        action: "appointment.cancelled",
        diff: diffOf({ status: appointment.status }, { status: "ABGESAGT" }),
      },
    });
  });

  revalidatePath("/einsatzplan");
  revalidatePath(`/anfragen/${appointment.dealId}`);
  return { success: "Termin abgesagt" };
}

const statusSchema = z.object({
  appointmentId: z.string().min(1),
  status: z.enum([
    "GEPLANT",
    "UNTERWEGS",
    "ANGEKOMMEN",
    "IN_ARBEIT",
    "FERTIG",
    "ABGESAGT",
  ] as [AppointmentStatus, ...AppointmentStatus[]]),
});

/**
 * Смена статуса выезда.
 *
 * Доступна и монтажнику — но только по своему выезду: он отмечает
 * «выехал», «на месте», «в работе» с телефона (глава 5.6.3).
 */
export async function setAppointmentStatusAction(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const actor = await requireUser();

  const parsed = statusSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "Eingabe ungültig" };
  const { appointmentId, status } = parsed.data;

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      status: true,
      dealId: true,
      assignees: { select: { userId: true } },
    },
  });
  if (!appointment) return { error: "Termin nicht gefunden" };

  // Монтажник меняет статус только своего выезда.
  if (actor.role === "MONTEUR") {
    const isMine = appointment.assignees.some((a) => a.userId === actor.id);
    if (!isMine) return { error: "Dieser Termin gehört nicht zu Ihnen" };
  }

  if (appointment.status === status) return { success: "Keine Änderung" };

  await db.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id: appointmentId }, data: { status } });
    await tx.activityLog.create({
      data: {
        entity: "Appointment",
        entityId: appointmentId,
        userId: actor.id,
        action: "appointment.status_changed",
        diff: { status: [appointment.status, status] },
      },
    });
  });

  revalidatePath("/einsatzplan");
  revalidatePath("/m");
  revalidatePath(`/anfragen/${appointment.dealId}`);
  return { success: "Status geändert" };
}
