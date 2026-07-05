"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  ALL_REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  RequestStatus,
} from "@/lib/constants";

// Назначить заявку исполнителю. Создаёт (или переназначает) Task
// и переводит заявку в статус "assigned".
export async function assignRequest(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = Number(formData.get("requestId"));
  const workerId = String(formData.get("workerId") ?? "");
  if (!Number.isInteger(requestId) || !workerId) return;

  const worker = await prisma.user.findFirst({
    where: { id: workerId, role: "worker", active: true },
  });
  if (!worker) return;

  // Task связан с заявкой один-к-одному — используем upsert для переназначения.
  await prisma.task.upsert({
    where: { requestId },
    create: { requestId, workerId, status: "assigned" },
    update: { workerId, status: "assigned" },
  });

  await prisma.request.update({
    where: { id: requestId },
    data: {
      status: "assigned",
      logs: {
        create: {
          actorId: admin.id,
          action: "assigned",
          note: `Назначен исполнитель: ${worker.name}`,
        },
      },
    },
  });

  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin");
}

// Ручная смена статуса заявки админом.
export async function updateRequestStatus(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = Number(formData.get("requestId"));
  const status = String(formData.get("status") ?? "") as RequestStatus;
  if (!Number.isInteger(requestId)) return;
  if (!ALL_REQUEST_STATUSES.includes(status)) return;

  await prisma.request.update({
    where: { id: requestId },
    data: {
      status,
      logs: {
        create: {
          actorId: admin.id,
          action: "status_changed",
          note: `Статус изменён на «${REQUEST_STATUS_LABELS[status]}»`,
        },
      },
    },
  });

  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin");
}

// Добавить внутреннюю заметку админа к заявке.
export async function addNote(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = Number(formData.get("requestId"));
  const note = String(formData.get("note") ?? "").trim();
  if (!Number.isInteger(requestId) || note.length === 0) return;

  await prisma.activityLog.create({
    data: {
      requestId,
      actorId: admin.id,
      action: "note",
      note,
    },
  });

  revalidatePath(`/admin/requests/${requestId}`);
}
