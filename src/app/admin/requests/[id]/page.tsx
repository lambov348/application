import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import PhotoGallery from "@/components/PhotoGallery";
import SubmitButton from "@/components/SubmitButton";
import { formatDate, formatDateTime, parsePhotos } from "@/lib/format";
import {
  ALL_REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  TASK_STATUS_LABELS,
  TaskStatus,
} from "@/lib/constants";
import { assignRequest, updateRequestStatus, addNote } from "../../actions";

// Карточка заявки для админа: все данные, фото, назначение, статус,
// заметки и история изменений.
export default async function RequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId)) notFound();

  const [request, workers] = await Promise.all([
    prisma.request.findUnique({
      where: { id: requestId },
      include: {
        task: { include: { worker: true } },
        logs: { include: { actor: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({
      where: { role: "worker", active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!request) notFound();

  const clientPhotos = parsePhotos(request.photos);
  const resultPhotos = parsePhotos(request.task?.resultPhotos);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Ко всем заявкам
        </Link>
        <StatusBadge status={request.status} />
      </div>

      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Заявка № {request.id}</h1>
        <span className="text-gray-500">{request.serviceType}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Данные клиента */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-gray-900">Данные клиента</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field label="Имя" value={request.clientName} />
              <Field label="Контакт" value={request.clientContact} />
              <Field label="Адрес" value={request.address} />
              <Field
                label="Желаемая дата"
                value={formatDate(request.preferredDate)}
              />
              <Field
                label="Создана"
                value={formatDateTime(request.createdAt)}
              />
            </dl>
            <div className="mt-4">
              <p className="label">Описание задачи</p>
              <p className="whitespace-pre-wrap text-sm text-gray-800">
                {request.description}
              </p>
            </div>
            <div className="mt-4">
              <p className="label">Фото от клиента</p>
              <PhotoGallery photos={clientPhotos} />
            </div>
          </section>

          {/* Работа исполнителя */}
          {request.task && (
            <section className="card p-6">
              <h2 className="mb-4 font-semibold text-gray-900">
                Работа исполнителя
              </h2>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Field label="Исполнитель" value={request.task.worker.name} />
                <Field
                  label="Статус задачи"
                  value={
                    TASK_STATUS_LABELS[request.task.status as TaskStatus] ??
                    request.task.status
                  }
                />
              </dl>
              <div className="mt-4">
                <p className="label">Комментарий исполнителя</p>
                <p className="text-sm text-gray-800">
                  {request.task.workerComment || "—"}
                </p>
              </div>
              <div className="mt-4">
                <p className="label">Фото результата</p>
                <PhotoGallery photos={resultPhotos} />
              </div>
            </section>
          )}

          {/* История */}
          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-gray-900">
              История изменений
            </h2>
            <ol className="space-y-3">
              {request.logs.map((log) => (
                <li key={log.id} className="flex gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <div>
                    <p className="text-gray-800">{log.note ?? log.action}</p>
                    <p className="text-xs text-gray-400">
                      {log.actor?.name ? `${log.actor.name} · ` : ""}
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Управление */}
        <div className="space-y-6">
          {/* Назначение исполнителя */}
          <section className="card p-6">
            <h2 className="mb-3 font-semibold text-gray-900">
              Назначить исполнителя
            </h2>
            {workers.length === 0 ? (
              <p className="text-sm text-gray-500">
                Нет активных исполнителей.{" "}
                <Link href="/admin/workers" className="text-brand">
                  Добавить
                </Link>
              </p>
            ) : (
              <form action={assignRequest} className="space-y-3">
                <input type="hidden" name="requestId" value={request.id} />
                <select
                  name="workerId"
                  className="input"
                  defaultValue={request.task?.workerId ?? ""}
                  required
                >
                  <option value="" disabled>
                    Выберите исполнителя
                  </option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <SubmitButton className="btn-primary w-full">
                  {request.task ? "Переназначить" : "Назначить"}
                </SubmitButton>
              </form>
            )}
          </section>

          {/* Смена статуса */}
          <section className="card p-6">
            <h2 className="mb-3 font-semibold text-gray-900">Статус заявки</h2>
            <form action={updateRequestStatus} className="space-y-3">
              <input type="hidden" name="requestId" value={request.id} />
              <select
                name="status"
                className="input"
                defaultValue={request.status}
              >
                {ALL_REQUEST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {REQUEST_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <SubmitButton className="btn-secondary w-full">
                Сохранить статус
              </SubmitButton>
            </form>
          </section>

          {/* Внутренняя заметка */}
          <section className="card p-6">
            <h2 className="mb-3 font-semibold text-gray-900">
              Внутренняя заметка
            </h2>
            <form action={addNote} className="space-y-3">
              <input type="hidden" name="requestId" value={request.id} />
              <textarea
                name="note"
                className="input min-h-[80px]"
                placeholder="Заметка видна только сотрудникам"
                required
              />
              <SubmitButton className="btn-secondary w-full">
                Добавить заметку
              </SubmitButton>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
