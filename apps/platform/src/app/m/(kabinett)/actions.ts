"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AppointmentStatus, PhotoKind } from "@prisma/client";
import { db } from "@/lib/db";
import { parseAmountToCents } from "@/lib/money";
import { HANDOVER_CHECKLIST, minutesBetween } from "@/lib/job";
import { logActivity } from "@/server/activity";
import { requireMonteurArea } from "@/server/auth/guards";
import { savePhoto } from "@/server/jobs/photos";
import { signHandover } from "@/server/jobs/handover";
import {
  checkAccess,
  checkCanStartTime,
  checkPhotosForStatus,
  checkStatusChangeSync,
  loadJobForRules,
  photoMinimums,
} from "@/server/rules/job";
import { runningTimeEntry } from "@/server/queries/monteur";

export type JobState = { error?: string; success?: string };

/** Обновление экранов, на которые влияет работа на объекте. */
function revalidateJob(appointmentId: string, dealId: string) {
  revalidatePath("/m");
  revalidatePath(`/m/auftrag/${appointmentId}`);
  // Владелец видит происходящее в реальном времени (глава 5.6.3).
  revalidatePath("/heute");
  revalidatePath("/einsatzplan");
  revalidatePath(`/anfragen/${dealId}`);
}

const statusSchema = z.object({
  appointmentId: z.string().min(1),
  to: z.enum(["UNTERWEGS", "ANGEKOMMEN", "IN_ARBEIT", "FERTIG"]),
});

/**
 * Статус одним тапом: Unterwegs → Angekommen → In Arbeit → Fertig
 * (глава 5.6.3 ТЗ).
 *
 * Здесь же проверяется требование главы 5.6.4 — минимум фотографий:
 * без снимков «до» нельзя начать работу, без снимков «после» — закончить.
 */
export async function setJobStatusAction(
  _prev: JobState,
  formData: FormData,
): Promise<JobState> {
  const user = await requireMonteurArea();

  const parsed = statusSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    to: formData.get("to"),
  });
  if (!parsed.success) return { error: "Eingabe ungültig" };
  const { appointmentId, to } = parsed.data;

  const job = await loadJobForRules(appointmentId);
  if (!job) return { error: "Termin nicht gefunden" };

  const denied =
    checkAccess(job, user) ??
    checkStatusChangeSync(job, to as AppointmentStatus);
  if (denied) return { error: denied.message };

  const min = await photoMinimums();
  const photosMissing = checkPhotosForStatus(to as AppointmentStatus, job.counts, min);
  if (photosMissing) return { error: photosMissing.message };

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: to as AppointmentStatus },
    });

    // «Готово» закрывает незакрытые записи времени по этому выезду: иначе
    // таймер идёт до ночи и портит расчёт зарплаты.
    if (to === "FERTIG") {
      const running = await tx.timeEntry.findMany({
        where: { appointmentId, endAt: null },
        select: { id: true, startAt: true },
      });
      for (const entry of running) {
        await tx.timeEntry.update({
          where: { id: entry.id },
          data: { endAt: now, minutes: minutesBetween(entry.startAt, now) },
        });
      }
    }

    await logActivity({
      entity: "Appointment",
      entityId: appointmentId,
      action: "appointment.status_changed",
      userId: user.id,
      diff: { status: [job.status, to] },
      tx,
    });
  });

  revalidateJob(appointmentId, job.dealId);
  return { success: "Status gespeichert" };
}

const photoSchema = z.object({
  appointmentId: z.string().min(1),
  kind: z.enum(["VORHER", "NACHHER", "SCHADEN"]),
});

/**
 * Загрузка снимка обычной формой — путь без JavaScript.
 * Очередь отправки в телефоне идёт через /api/photos, но правила общие.
 */
export async function uploadPhotoAction(
  _prev: JobState,
  formData: FormData,
): Promise<JobState> {
  const user = await requireMonteurArea();

  const parsed = photoSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) return { error: "Eingabe ungültig" };

  const files = formData
    .getAll("file")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Kein Foto ausgewählt" };

  let saved = 0;
  for (const file of files) {
    const result = await savePhoto(
      {
        appointmentId: parsed.data.appointmentId,
        kind: parsed.data.kind as PhotoKind,
        contentType: file.type,
        data: Buffer.from(await file.arrayBuffer()),
      },
      user,
    );
    if (!result.ok) return { error: result.message };
    saved += 1;
  }

  const job = await loadJobForRules(parsed.data.appointmentId);
  if (job) revalidateJob(parsed.data.appointmentId, job.dealId);

  return { success: saved === 1 ? "Foto gespeichert" : `${saved} Fotos gespeichert` };
}

/**
 * Учёт рабочего времени (глава 5.6.6 ТЗ).
 *
 * Отметки ставит сервер: длительность идёт в расчёт зарплаты и не должна
 * приходить с телефона, где время легко перевести.
 */
export async function startTimeAction(
  _prev: JobState,
  formData: FormData,
): Promise<JobState> {
  const user = await requireMonteurArea();
  const appointmentId = String(formData.get("appointmentId") ?? "");

  const job = await loadJobForRules(appointmentId);
  if (!job) return { error: "Termin nicht gefunden" };

  const running = await runningTimeEntry(user.id);
  const denied = checkAccess(job, user) ?? checkCanStartTime(job, Boolean(running));
  if (denied) return { error: denied.message };

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.timeEntry.create({
      data: { appointmentId, userId: user.id, startAt: now },
    });
    await logActivity({
      entity: "Appointment",
      entityId: appointmentId,
      action: "time.started",
      userId: user.id,
      diff: { beginn: [null, now.toISOString()] },
      tx,
    });
  });

  revalidateJob(appointmentId, job.dealId);
  return { success: "Zeit läuft" };
}

export async function stopTimeAction(
  _prev: JobState,
  formData: FormData,
): Promise<JobState> {
  const user = await requireMonteurArea();
  const appointmentId = String(formData.get("appointmentId") ?? "");

  const job = await loadJobForRules(appointmentId);
  if (!job) return { error: "Termin nicht gefunden" };
  const denied = checkAccess(job, user);
  if (denied) return { error: denied.message };

  // Закрываем только свою запись: чужое время не наше дело.
  const entry = await db.timeEntry.findFirst({
    where: { appointmentId, userId: user.id, endAt: null },
    orderBy: { startAt: "desc" },
    select: { id: true, startAt: true },
  });
  if (!entry) return { error: "Es läuft keine Zeiterfassung" };

  const now = new Date();
  const minutes = minutesBetween(entry.startAt, now);

  await db.$transaction(async (tx) => {
    await tx.timeEntry.update({
      where: { id: entry.id },
      data: { endAt: now, minutes },
    });
    await logActivity({
      entity: "Appointment",
      entityId: appointmentId,
      action: "time.stopped",
      userId: user.id,
      diff: { minuten: [null, minutes] },
      tx,
    });
  });

  revalidateJob(appointmentId, job.dealId);
  return { success: `Zeit gestoppt: ${minutes} Min.` };
}

const extraSchema = z.object({
  appointmentId: z.string().min(1),
  kind: z.enum(["MATERIAL", "ZEIT"]),
  description: z.string().trim().min(3, "Beschreibung fehlt").max(500),
  amount: z.string().optional(),
  minutes: z.string().optional(),
});

/**
 * Материал и доплата (глава 5.6.7 ТЗ): «докупили силикон 12 €»,
 * «добавились 2 полки, +40 мин».
 *
 * Это сообщение владельцу, а не изменение цены заказа. Жёсткое требование
 * главы 4 — цену ставит только владелец — не нарушается: сумма заказа не
 * меняется, пока владелец не примет решение.
 */
export async function reportExtraAction(
  _prev: JobState,
  formData: FormData,
): Promise<JobState> {
  const user = await requireMonteurArea();

  const parsed = extraSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    kind: formData.get("kind"),
    description: formData.get("description"),
    amount: formData.get("amount") ?? undefined,
    minutes: formData.get("minutes") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }
  const d = parsed.data;

  const job = await loadJobForRules(d.appointmentId);
  if (!job) return { error: "Termin nicht gefunden" };
  const denied = checkAccess(job, user);
  if (denied) return { error: denied.message };

  let amountCents: number | null = null;
  let extraMinutes: number | null = null;

  if (d.kind === "MATERIAL") {
    amountCents = d.amount ? parseAmountToCents(d.amount) : null;
    if (amountCents === null) return { error: "Betrag ist ungültig" };
    if (amountCents < 0) return { error: "Betrag darf nicht negativ sein" };
  } else {
    const minutes = Number(d.minutes);
    if (!Number.isInteger(minutes) || minutes <= 0) {
      return { error: "Minuten sind ungültig" };
    }
    if (minutes > 24 * 60) return { error: "So viele Minuten sind nicht plausibel" };
    extraMinutes = minutes;
  }

  await db.$transaction(async (tx) => {
    const extra = await tx.extraRequest.create({
      data: {
        appointmentId: d.appointmentId,
        kind: d.kind,
        description: d.description,
        amountCents,
        extraMinutes,
        reportedById: user.id,
      },
      select: { id: true },
    });
    await logActivity({
      entity: "Appointment",
      entityId: d.appointmentId,
      action: "extra.reported",
      userId: user.id,
      diff: {
        art: [null, d.kind],
        beschreibung: [null, d.description],
        ...(amountCents !== null ? { betragCent: [null, amountCents] } : {}),
        ...(extraMinutes !== null ? { minuten: [null, extraMinutes] } : {}),
        id: [null, extra.id],
      },
      tx,
    });
  });

  revalidateJob(d.appointmentId, job.dealId);
  return { success: "Meldung an den Inhaber gesendet" };
}

const handoverSchema = z.object({
  appointmentId: z.string().min(1),
  remarks: z.string().trim().max(2000).optional(),
  photoConsent: z.boolean(),
  signature: z.string().min(1, "Unterschrift fehlt"),
});

/**
 * Подписание протокола приёмки (глава 5.6.5 ТЗ).
 *
 * Действие только принимает форму; проверки, подпись, PDF и перевод заявки
 * в «Ausgeführt» живут в src/server/jobs/handover.ts.
 */
export async function signHandoverAction(
  _prev: JobState,
  formData: FormData,
): Promise<JobState> {
  const user = await requireMonteurArea();

  const parsed = handoverSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    remarks: formData.get("remarks") ?? undefined,
    photoConsent: formData.get("photoConsent") === "on",
    signature: formData.get("signature"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  // Чек-лист приходит галочками; неизвестные ключи отбрасывает сервер.
  const checklist: Record<string, boolean> = {};
  for (const key of HANDOVER_CHECKLIST) {
    checklist[key] = formData.get(key) === "on";
  }

  const result = await signHandover(
    {
      appointmentId: parsed.data.appointmentId,
      checklist,
      remarks: parsed.data.remarks || null,
      photoConsent: parsed.data.photoConsent,
      signatureDataUrl: parsed.data.signature,
    },
    user,
  );

  if (!result.ok) return { error: result.message };

  const job = await loadJobForRules(parsed.data.appointmentId);
  if (job) revalidateJob(parsed.data.appointmentId, job.dealId);

  redirect(`/m/auftrag/${parsed.data.appointmentId}`);
}
