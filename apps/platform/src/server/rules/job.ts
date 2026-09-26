/**
 * Правила работы на объекте (глава 5.6 ТЗ).
 *
 * Здесь решается, что монтажнику позволено: чей выезд он может трогать,
 * куда двигать статус и когда работа считается законченной.
 *
 * Проверки серверные. Кнопку в телефоне легко нажать в обход интерфейса —
 * запросом из консоли браузера, — поэтому «нельзя» живёт здесь, а не
 * в разметке.
 */
import type { AppointmentStatus, PhotoKind, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/server/auth/guards";
import { isForwardTransition, JOB_FLOW, nextJobStatus } from "@/lib/job";

export { JOB_FLOW, nextJobStatus, isForwardTransition };

/** Отказ с кодом для словаря интерфейса и текстом на случай, если кода нет. */
export class JobDenied extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "JobDenied";
  }
}

export type JobAccess = {
  id: string;
  status: AppointmentStatus;
  assigneeIds: string[];
  handoverSignedAt: Date | null;
};

/**
 * Доступ к выезду. Монтажник видит и меняет только свои выезды —
 * ни чужие адреса, ни чужие фотографии клиентов ему не нужны.
 * Владелец и диспетчер видят все: они и планируют.
 */
export function checkAccess(
  job: Pick<JobAccess, "assigneeIds">,
  user: CurrentUser,
): JobDenied | null {
  if (user.role !== "MONTEUR") return null;
  if (job.assigneeIds.includes(user.id)) return null;
  return new JobDenied(
    "not_assigned",
    "Dieser Termin ist Ihnen nicht zugeteilt",
  );
}

/**
 * Чистая часть проверки смены статуса — без базы, чтобы её покрывали
 * тесты без поднятого PostgreSQL.
 */
export function checkStatusChangeSync(
  job: Pick<JobAccess, "status">,
  to: AppointmentStatus,
): JobDenied | null {
  if (job.status === "ABGESAGT") {
    return new JobDenied(
      "cancelled",
      "Der Termin wurde abgesagt und kann nicht geändert werden",
    );
  }
  if (to === "ABGESAGT") {
    // Отмена — решение диспетчера, у неё своё действие с причиной.
    return new JobDenied(
      "cancel_not_here",
      "Absagen erfolgen in der Einsatzplanung",
    );
  }
  if (job.status === to) {
    return new JobDenied("same_status", "Dieser Status ist bereits gesetzt");
  }
  if (!isForwardTransition(job.status, to)) {
    return new JobDenied(
      "backwards",
      "Ein gesetzter Status kann nicht zurückgenommen werden",
    );
  }
  return null;
}

/** Сколько фотографий каждого вида уже есть и сколько требуется. */
export type PhotoCounts = { vorher: number; nachher: number };
export type PhotoMinimums = { before: number; after: number };

/**
 * Требование главы 5.6.4 ТЗ: минимум по две фотографии «до» и «после».
 * Числа настраиваются владельцем (Settings.minPhotosBefore/After).
 *
 * Фотографии «до» спрашиваются при переходе в работу, «после» — при
 * завершении: снимать «до» после сборки кухни уже поздно.
 */
export function checkPhotosForStatus(
  to: AppointmentStatus,
  counts: PhotoCounts,
  min: PhotoMinimums,
): JobDenied | null {
  if (to === "IN_ARBEIT" && counts.vorher < min.before) {
    return new JobDenied(
      "photos_before_missing",
      `Vor Arbeitsbeginn werden mindestens ${min.before} Fotos „vorher“ benötigt`,
    );
  }
  if (to === "FERTIG" && counts.nachher < min.after) {
    return new JobDenied(
      "photos_after_missing",
      `Zum Abschluss werden mindestens ${min.after} Fotos „nachher“ benötigt`,
    );
  }
  return null;
}

/** Фотографировать можно, пока выезд жив и протокол не подписан. */
export function checkCanUploadPhoto(
  job: Pick<JobAccess, "status" | "handoverSignedAt">,
): JobDenied | null {
  if (job.status === "ABGESAGT") {
    return new JobDenied("cancelled", "Der Termin wurde abgesagt");
  }
  if (job.handoverSignedAt) {
    return new JobDenied(
      "handover_signed",
      "Das Abnahmeprotokoll ist unterschrieben, Fotos sind gesperrt",
    );
  }
  return null;
}

/**
 * Учёт времени (глава 5.6.6 ТЗ). Время идёт в расчёт зарплаты, поэтому
 * запись создаёт и закрывает сервер: длительность не приходит от телефона.
 */
export function checkCanStartTime(
  job: Pick<JobAccess, "status">,
  hasRunningEntry: boolean,
): JobDenied | null {
  if (job.status === "ABGESAGT") {
    return new JobDenied("cancelled", "Der Termin wurde abgesagt");
  }
  if (job.status === "GEPLANT") {
    return new JobDenied(
      "not_started",
      "Zeiterfassung beginnt frühestens mit „Unterwegs“",
    );
  }
  if (hasRunningEntry) {
    return new JobDenied("already_running", "Die Zeit läuft bereits");
  }
  return null;
}

/**
 * Данные выезда для проверок. Собираются одним запросом, чтобы
 * каждое нажатие кнопки на объекте не превращалось в пять походов в базу.
 */
export async function loadJobForRules(
  appointmentId: string,
  client: PrismaClient | typeof db = db,
): Promise<(JobAccess & { counts: PhotoCounts; dealId: string }) | null> {
  const row = await client.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      status: true,
      dealId: true,
      assignees: { select: { userId: true } },
      handover: { select: { signedAt: true } },
      photos: { select: { kind: true } },
    },
  });
  if (!row) return null;

  const count = (kind: PhotoKind) =>
    row.photos.filter((p) => p.kind === kind).length;

  return {
    id: row.id,
    status: row.status,
    dealId: row.dealId,
    assigneeIds: row.assignees.map((a) => a.userId),
    handoverSignedAt: row.handover?.signedAt ?? null,
    counts: { vorher: count("VORHER"), nachher: count("NACHHER") },
  };
}

/** Минимумы по фотографиям из настроек, со значениями по умолчанию из ТЗ. */
export async function photoMinimums(
  client: PrismaClient | typeof db = db,
): Promise<PhotoMinimums> {
  const settings = await client.settings.findUnique({ where: { id: 1 } });
  return {
    before: settings?.minPhotosBefore ?? 2,
    after: settings?.minPhotosAfter ?? 2,
  };
}
