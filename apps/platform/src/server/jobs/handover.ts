/**
 * Подписание протокола приёмки (глава 5.6.5 ТЗ).
 *
 * Момент, после которого работа считается сданной: создаётся запись Handover,
 * сохраняется подпись клиента и собирается PDF. Дальше протокол не меняется —
 * фотографии и статус выезда блокируются (src/server/rules/job.ts).
 *
 * Здесь же выполняется правило 9.4: без подписанного протокола и фотографий
 * «после» заказ не может считаться выполненным.
 */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { decodeSignature, pngHasContent } from "@/lib/signature";
import { HANDOVER_CHECKLIST, minutesBetween } from "@/lib/job";
import { formatDateDocument, formatTime } from "@/lib/datetime";
import { displayNameOf } from "@/server/queries/customers";
import { getSettings } from "@/server/queries/settings";
import { logActivity } from "@/server/activity";
import type { CurrentUser } from "@/server/auth/guards";
import {
  checkAccess,
  checkPhotosForStatus,
  loadJobForRules,
  photoMinimums,
} from "@/server/rules/job";
import { renderHandoverPdf } from "@/server/pdf/handover";
import { checkTransition } from "@/server/rules/deal-status";

export type SignHandoverInput = {
  appointmentId: string;
  checklist: Record<string, boolean>;
  remarks: string | null;
  photoConsent: boolean;
  signatureDataUrl: string;
};

export type SignHandoverResult =
  | { ok: true; pdfKey: string }
  | { ok: false; code: string; message: string };

export async function signHandover(
  input: SignHandoverInput,
  user: CurrentUser,
): Promise<SignHandoverResult> {
  const job = await loadJobForRules(input.appointmentId);
  if (!job) {
    return { ok: false, code: "not_found", message: "Termin nicht gefunden" };
  }

  const denied = checkAccess(job, user);
  if (denied) return { ok: false, code: denied.code, message: denied.message };

  if (job.handoverSignedAt) {
    // Протокол не переписывается: подписанный документ уже у клиента.
    return {
      ok: false,
      code: "already_signed",
      message: "Das Abnahmeprotokoll ist bereits unterschrieben",
    };
  }
  if (job.status === "ABGESAGT") {
    return { ok: false, code: "cancelled", message: "Der Termin wurde abgesagt" };
  }

  // Правило 9.4: без фотографий «после» приёмки не бывает.
  const min = await photoMinimums();
  const photosMissing = checkPhotosForStatus("FERTIG", job.counts, min);
  if (photosMissing) {
    return { ok: false, code: photosMissing.code, message: photosMissing.message };
  }

  const signature = decodeSignature(input.signatureDataUrl);
  if (!signature) {
    return {
      ok: false,
      code: "signature_invalid",
      message: "Die Unterschrift konnte nicht gelesen werden",
    };
  }
  if (!pngHasContent(signature)) {
    return {
      ok: false,
      code: "signature_empty",
      message: "Bitte lassen Sie den Kunden unterschreiben",
    };
  }

  const settings = await getSettings();
  if (!settings.companyName.trim()) {
    // Протокол без названия фирмы ничего не подтверждает.
    return {
      ok: false,
      code: "company_missing",
      message:
        "Firmendaten fehlen. Der Inhaber muss sie in den Einstellungen ausfüllen",
    };
  }

  const appointment = await db.appointment.findUnique({
    where: { id: input.appointmentId },
    select: {
      startAt: true,
      endAt: true,
      dealId: true,
      deal: {
        select: {
          id: true,
          number: true,
          title: true,
          services: true,
          status: true,
          addressId: true,
          customer: {
            select: {
              type: true,
              firstName: true,
              lastName: true,
              company: true,
            },
          },
        },
      },
      address: { select: { street: true, zip: true, city: true, floor: true } },
      assignees: { select: { user: { select: { name: true } } } },
      timeEntries: { select: { minutes: true, startAt: true, endAt: true } },
      photos: { select: { kind: true } },
    },
  });
  if (!appointment) {
    return { ok: false, code: "not_found", message: "Termin nicht gefunden" };
  }

  const signedAt = new Date();

  // Чек-лист приводим к известным ключам: с телефона может прийти что угодно.
  const checklist: Record<string, boolean> = {};
  for (const key of HANDOVER_CHECKLIST) {
    checklist[key] = input.checklist[key] === true;
  }

  const workedMinutes = appointment.timeEntries.reduce(
    (sum, entry) =>
      sum +
      (entry.minutes ??
        (entry.endAt ? minutesBetween(entry.startAt, entry.endAt) : 0)),
    0,
  );

  const signatureKey =
    `handover/${input.appointmentId}/signature-${randomBytes(8).toString("hex")}.png`;
  await storage().put(signatureKey, signature, "image/png");

  const pdf = await renderHandoverPdf({
    company: settings,
    dealNumber: appointment.deal.number,
    dealTitle: appointment.deal.title,
    services: appointment.deal.services,
    customerName: displayNameOf(appointment.deal.customer),
    street: appointment.address.street,
    zip: appointment.address.zip,
    city: appointment.address.city,
    floor: appointment.address.floor,
    appointmentDate: formatDateDocument(appointment.startAt),
    appointmentTime: `${formatTime(appointment.startAt)}–${formatTime(appointment.endAt)}`,
    monteure: appointment.assignees.map((a) => a.user.name),
    workedMinutes: workedMinutes > 0 ? workedMinutes : null,
    checklist,
    remarks: input.remarks,
    photoConsent: input.photoConsent,
    photosBefore: appointment.photos.filter((p) => p.kind === "VORHER").length,
    photosAfter: appointment.photos.filter((p) => p.kind === "NACHHER").length,
    signature,
    signedAt: `${formatDateDocument(signedAt)} ${formatTime(signedAt)}`,
    signedBy: user.name,
  });

  const pdfKey =
    `handover/${input.appointmentId}/protokoll-${randomBytes(8).toString("hex")}.pdf`;
  await storage().put(pdfKey, pdf, "application/pdf");

  try {
    await db.$transaction(async (tx) => {
      await tx.handover.create({
        data: {
          appointmentId: input.appointmentId,
          checklist,
          remarks: input.remarks,
          signatureKey,
          photoConsent: input.photoConsent,
          pdfKey,
          signedAt,
        },
      });

      // Приёмка означает, что работа закончена — статус выезда догоняет факт.
      if (job.status !== "FERTIG") {
        await tx.appointment.update({
          where: { id: input.appointmentId },
          data: { status: "FERTIG" },
        });
      }

      // И закрывает незакрытые записи времени, как кнопка «Fertig».
      // Без этого таймер монтажника продолжал бы идти после подписи клиента
      // и до конца дня: время идёт в расчёт зарплаты, и лишние часы здесь
      // стоят денег.
      const running = await tx.timeEntry.findMany({
        where: { appointmentId: input.appointmentId, endAt: null },
        select: { id: true, startAt: true },
      });
      for (const entry of running) {
        await tx.timeEntry.update({
          where: { id: entry.id },
          data: {
            endAt: signedAt,
            minutes: minutesBetween(entry.startAt, signedAt),
          },
        });
      }

      await logActivity({
        entity: "Appointment",
        entityId: input.appointmentId,
        action: "handover.signed",
        userId: user.id,
        diff: {
          unterschrieben: [null, signedAt.toISOString()],
          fotofreigabe: [null, input.photoConsent],
          protokoll: [null, pdfKey],
        },
        tx,
      });
    });
  } catch (error) {
    // Запись не создалась — файлы в хранилище не нужны.
    await storage().delete(signatureKey).catch(() => {});
    await storage().delete(pdfKey).catch(() => {});
    throw error;
  }

  await maybeCloseDeal(appointment.deal, user);

  return { ok: true, pdfKey };
}

/**
 * Перевод заявки в «Ausgeführt», когда все выезды закончены.
 *
 * Проверка правила 9.4 вызывается честно, а не обходится: если чего-то не
 * хватает, заявка просто остаётся в прежней колонке — это решит офис.
 */
async function maybeCloseDeal(
  deal: {
    id: string;
    status: string;
    addressId: string | null;
    customer: { lastName: string | null; company: string | null };
  },
  user: CurrentUser,
): Promise<void> {
  if (deal.status === "AUSGEFUEHRT" || deal.status === "RECHNUNG") return;
  if (deal.status === "BEZAHLT" || deal.status === "VERLOREN") return;

  const open = await db.appointment.count({
    where: {
      dealId: deal.id,
      status: { notIn: ["FERTIG", "ABGESAGT"] },
    },
  });
  if (open > 0) return;

  const dealForTransition = {
    id: deal.id,
    status: deal.status as never,
    addressId: deal.addressId,
    customer: deal.customer,
  };

  const denied = await checkTransition(dealForTransition, "AUSGEFUEHRT", {});
  if (denied) return;

  await db.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: deal.id },
      data: { status: "AUSGEFUEHRT" },
    });
    await logActivity({
      entity: "Deal",
      entityId: deal.id,
      action: "deal.status_changed",
      userId: user.id,
      diff: { status: [deal.status, "AUSGEFUEHRT"] },
      tx,
    });
  });
}
