import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n.server";
import WorkerForm from "./WorkerForm";
import { toggleWorkerActive } from "./actions";

// Управление исполнителями: список, добавление, включение/отключение.
export default async function WorkersPage() {
  const { t } = await getI18n();
  const workers = await prisma.user.findMany({
    where: { role: "worker" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{t.workers.title}</h1>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t.workers.thName}</th>
                <th className="px-4 py-3">{t.workers.thEmail}</th>
                <th className="hidden px-4 py-3 sm:table-cell">{t.workers.thTasks}</th>
                <th className="px-4 py-3">{t.workers.thStatus}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workers.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{w.name}</td>
                  <td className="px-4 py-3 text-gray-600">{w.email}</td>
                  <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                    {w._count.tasks}
                  </td>
                  <td className="px-4 py-3">
                    {w.active ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        {t.workers.active}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {t.workers.disabled}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={toggleWorkerActive}>
                      <input type="hidden" name="workerId" value={w.id} />
                      <button type="submit" className="text-sm text-brand hover:underline">
                        {w.active ? t.workers.disable : t.workers.enable}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {workers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    {t.workers.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <WorkerForm labels={t.workers} />
      </div>
    </div>
  );
}
