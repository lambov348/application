import { prisma } from "@/lib/db";
import { requireWorker } from "@/lib/auth";
import StatusBadge from "@/components/StatusBadge";
import PhotoGallery from "@/components/PhotoGallery";
import SubmitButton from "@/components/SubmitButton";
import { formatDate, parsePhotos } from "@/lib/format";
import { TASK_STATUS_FLOW, TaskStatus, isServiceSlug } from "@/lib/constants";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n.server";
import { updateTask } from "./actions";

// Кабинет исполнителя: ТОЛЬКО назначенные ему задачи.
// Запрос жёстко фильтруется по workerId — чужие задачи не попадают в выборку.
export default async function WorkerDashboard() {
  const worker = await requireWorker();
  const { t } = await getI18n();

  const tasks = await prisma.task.findMany({
    where: { workerId: worker.id },
    orderBy: { updatedAt: "desc" },
    include: { request: true },
  });

  const openCount = tasks.filter((tk) => tk.status !== "done").length;
  const svc = (slug: string) =>
    isServiceSlug(slug) ? t.services[slug].title : slug;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t.worker.title}</h1>
        <p className="text-sm text-gray-600">
          {fmt(t.worker.activeOf, { open: openCount, total: tasks.length })}
        </p>
      </div>

      {tasks.length === 0 && (
        <div className="card p-10 text-center text-gray-400">{t.worker.empty}</div>
      )}

      {tasks.map((task) => {
        const clientPhotos = parsePhotos(task.request.photos);
        const resultPhotos = parsePhotos(task.resultPhotos);
        return (
          <div key={task.id} className="card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">
                {fmt(t.worker.requestNo, { id: task.request.id })} · {svc(task.request.serviceType)}
              </h2>
              <StatusBadge status={task.request.status} />
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <Field label={t.worker.fClient} value={task.request.clientName} />
              <Field label={t.worker.fContact} value={task.request.clientContact} />
              <Field label={t.worker.fAddress} value={task.request.address} />
              <Field label={t.worker.fPreferredDate} value={formatDate(task.request.preferredDate)} />
            </dl>

            <div className="mt-3">
              <p className="label">{t.worker.description}</p>
              <p className="whitespace-pre-wrap text-sm text-gray-800">
                {task.request.description}
              </p>
            </div>

            {clientPhotos.length > 0 && (
              <div className="mt-3">
                <p className="label">{t.worker.clientPhotos}</p>
                <PhotoGallery photos={clientPhotos} alt={t.common.photo} />
              </div>
            )}

            {resultPhotos.length > 0 && (
              <div className="mt-3">
                <p className="label">{t.worker.uploadedResults}</p>
                <PhotoGallery photos={resultPhotos} alt={t.common.photo} />
              </div>
            )}

            {/* Обновление задачи */}
            <form action={updateTask} className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <input type="hidden" name="taskId" value={task.id} />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">{t.worker.statusLabel}</label>
                  <select name="status" className="input" defaultValue={task.status}>
                    {TASK_STATUS_FLOW.map((s: TaskStatus) => (
                      <option key={s} value={s}>
                        {t.taskStatus[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t.worker.resultPhotosLabel}</label>
                  <input
                    name="resultPhotos"
                    type="file"
                    accept="image/*"
                    multiple
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand"
                  />
                </div>
              </div>

              <div>
                <label className="label">{t.worker.commentLabel}</label>
                <textarea
                  name="comment"
                  className="input min-h-[70px]"
                  placeholder={t.worker.commentPlaceholder}
                  defaultValue=""
                />
                {task.workerComment && (
                  <p className="mt-1 text-xs text-gray-400">
                    {fmt(t.worker.currentComment, { comment: task.workerComment })}
                  </p>
                )}
              </div>

              <SubmitButton className="btn-primary">{t.worker.save}</SubmitButton>
            </form>
          </div>
        );
      })}
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
