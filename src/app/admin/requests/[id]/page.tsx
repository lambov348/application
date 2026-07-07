import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import PhotoGallery from "@/components/PhotoGallery";
import SubmitButton from "@/components/SubmitButton";
import { formatDate, formatDateTime, parsePhotos } from "@/lib/format";
import {
  ALL_REQUEST_STATUSES,
  TaskStatus,
  isServiceSlug,
} from "@/lib/constants";
import { fmt, renderLog } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n.server";
import { assignRequest, updateRequestStatus, addNote } from "../../actions";

// Карточка заявки для админа: все данные, фото, назначение, статус, заметки, история.
export default async function RequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getI18n();
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
  const serviceLabel = isServiceSlug(request.serviceType)
    ? t.services[request.serviceType].title
    : request.serviceType;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← {t.admin.backToRequests}
        </Link>
        <StatusBadge status={request.status} />
      </div>

      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold text-gray-900">№ {request.id}</h1>
        <span className="text-gray-500">{serviceLabel}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Данные клиента */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-gray-900">{t.admin.clientData}</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field label={t.admin.fName} value={request.clientName} />
              <Field label={t.admin.fContact} value={request.clientContact} />
              <Field label={t.admin.fAddress} value={request.address} />
              <Field label={t.admin.fPreferredDate} value={formatDate(request.preferredDate)} />
              <Field label={t.admin.fCreated} value={formatDateTime(request.createdAt)} />
            </dl>
            <div className="mt-4">
              <p className="label">{t.admin.description}</p>
              <p className="whitespace-pre-wrap text-sm text-gray-800">
                {request.description}
              </p>
            </div>
            <div className="mt-4">
              <p className="label">{t.admin.clientPhotos}</p>
              <PhotoGallery photos={clientPhotos} alt={t.common.photo} />
            </div>
          </section>

          {/* Работа исполнителя */}
          {request.task && (
            <section className="card p-6">
              <h2 className="mb-4 font-semibold text-gray-900">{t.admin.workerWork}</h2>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Field label={t.admin.worker} value={request.task.worker.name} />
                <Field
                  label={t.admin.taskStatusLabel}
                  value={t.status[request.task.status as TaskStatus] ?? request.task.status}
                />
              </dl>
              <div className="mt-4">
                <p className="label">{t.admin.workerComment}</p>
                <p className="text-sm text-gray-800">{request.task.workerComment || "—"}</p>
              </div>
              <div className="mt-4">
                <p className="label">{t.admin.resultPhotos}</p>
                <PhotoGallery photos={resultPhotos} alt={t.common.photo} />
              </div>
            </section>
          )}

          {/* История */}
          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-gray-900">{t.admin.history}</h2>
            <ol className="space-y-3">
              {request.logs.map((log) => (
                <li key={log.id} className="flex gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <div>
                    <p className="text-gray-800">{renderLog(log.action, log.note, t)}</p>
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
          <section className="card p-6">
            <h2 className="mb-3 font-semibold text-gray-900">{t.admin.assignTitle}</h2>
            {workers.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t.admin.noWorkers}{" "}
                <Link href="/admin/workers" className="text-brand">
                  {t.admin.addLink}
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
                    {t.admin.chooseWorker}
                  </option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <SubmitButton className="btn-primary w-full">
                  {request.task ? t.admin.reassign : t.admin.assign}
                </SubmitButton>
              </form>
            )}
          </section>

          <section className="card p-6">
            <h2 className="mb-3 font-semibold text-gray-900">{t.admin.statusTitle}</h2>
            <form action={updateRequestStatus} className="space-y-3">
              <input type="hidden" name="requestId" value={request.id} />
              <select name="status" className="input" defaultValue={request.status}>
                {ALL_REQUEST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t.status[s]}
                  </option>
                ))}
              </select>
              <SubmitButton className="btn-secondary w-full">
                {t.admin.saveStatus}
              </SubmitButton>
            </form>
          </section>

          <section className="card p-6">
            <h2 className="mb-3 font-semibold text-gray-900">{t.admin.noteTitle}</h2>
            <form action={addNote} className="space-y-3">
              <input type="hidden" name="requestId" value={request.id} />
              <textarea
                name="note"
                className="input min-h-[80px]"
                placeholder={t.admin.notePlaceholder}
                required
              />
              <SubmitButton className="btn-secondary w-full">
                {t.admin.addNote}
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
