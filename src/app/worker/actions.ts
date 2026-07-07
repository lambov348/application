"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireWorker } from "@/lib/auth";
import { saveUploadedFiles } from "@/lib/uploads";
import { parsePhotos } from "@/lib/format";
import { TASK_STATUS_FLOW, TaskStatus } from "@/lib/constants";

// Статус задачи исполнителя однозначно определяет статус заявки.
const TASK_TO_REQUEST_STATUS: Record<TaskStatus, string> = {
  assigned: "assigned",
  in_progress: "in_progress",
  done: "done",
};

// Исполнитель обновляет свою задачу: статус, комментарий, фото результата.
// КЛЮЧЕВАЯ проверка прав: задача должна принадлежать текущему исполнителю.
// В историю пишем коды (статус) — подпись рендерится по языку при показе.
export async function updateTask(formData: FormData) {
  const worker = await requireWorker();

  const taskId = String(formData.get("taskId") ?? "");
  const newStatus = String(formData.get("status") ?? "") as TaskStatus;
  const comment = String(formData.get("comment") ?? "").trim();

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  // Чужую или несуществующую задачу трогать нельзя.
  if (!task || task.workerId !== worker.id) return;

  const statusValid = TASK_STATUS_FLOW.includes(newStatus);
  const statusChanged = statusValid && newStatus !== task.status;

  // Сохраняем фото результата (добавляем к уже существующим).
  const files = formData
    .getAll("resultPhotos")
    .filter((f): f is File => f instanceof File);
  const newPhotos = await saveUploadedFiles(files);
  const mergedPhotos = [...parsePhotos(task.resultPhotos), ...newPhotos];

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: statusValid ? newStatus : task.status,
      workerComment: comment.length > 0 ? comment : task.workerComment,
      resultPhotos: JSON.stringify(mergedPhotos),
    },
  });

  // Синхронизируем статус заявки и пишем историю.
  if (statusChanged) {
    const requestStatus = TASK_TO_REQUEST_STATUS[newStatus];
    await prisma.request.update({
      where: { id: task.requestId },
      data: { status: requestStatus },
    });
    await prisma.activityLog.create({
      data: {
        requestId: task.requestId,
        actorId: worker.id,
        action: "status_changed",
        note: requestStatus,
      },
    });
  }

  // Отдельная запись, если добавлен только комментарий/фото без смены статуса.
  if (!statusChanged && (comment.length > 0 || newPhotos.length > 0)) {
    await prisma.activityLog.create({
      data: {
        requestId: task.requestId,
        actorId: worker.id,
        action: "worker_update",
        note: null,
      },
    });
  }

  revalidatePath("/worker");
}
