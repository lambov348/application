import Link from "next/link";
import { prisma } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/format";
import {
  ALL_REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  RequestStatus,
} from "@/lib/constants";

// Дашборд админа: сводка, фильтр по статусу и список всех заявок.
export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter =
    status && ALL_REQUEST_STATUSES.includes(status as RequestStatus)
      ? (status as RequestStatus)
      : undefined;

  const [requests, grouped] = await Promise.all([
    prisma.request.findMany({
      where: activeFilter ? { status: activeFilter } : undefined,
      orderBy: { createdAt: "desc" },
      include: { task: { include: { worker: true } } },
    }),
    prisma.request.groupBy({ by: ["status"], _count: true }),
  ]);

  const countBy = (s: RequestStatus) =>
    grouped.find((g) => g.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      {/* Сводка */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Новые" value={countBy("new")} tone="text-blue-700" />
        <SummaryCard
          label="Назначены"
          value={countBy("assigned")}
          tone="text-amber-700"
        />
        <SummaryCard
          label="В работе"
          value={countBy("in_progress")}
          tone="text-purple-700"
        />
        <SummaryCard
          label="Выполнены"
          value={countBy("done")}
          tone="text-green-700"
        />
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        <FilterLink label="Все" href="/admin" active={!activeFilter} />
        {ALL_REQUEST_STATUSES.map((s) => (
          <FilterLink
            key={s}
            label={REQUEST_STATUS_LABELS[s]}
            href={`/admin?status=${s}`}
            active={activeFilter === s}
          />
        ))}
      </div>

      {/* Список заявок */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">№</th>
              <th className="px-4 py-3">Клиент</th>
              <th className="px-4 py-3">Услуга</th>
              <th className="hidden px-4 py-3 md:table-cell">Исполнитель</th>
              <th className="px-4 py-3">Статус</th>
              <th className="hidden px-4 py-3 lg:table-cell">Создана</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/requests/${r.id}`} className="text-brand">
                    № {r.id}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/requests/${r.id}`} className="block">
                    <span className="font-medium text-gray-900">
                      {r.clientName}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {r.clientContact}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{r.serviceType}</td>
                <td className="hidden px-4 py-3 text-gray-700 md:table-cell">
                  {r.task?.worker?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">
                  {formatDateTime(r.createdAt)}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Заявок нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function FilterLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm ${
        active
          ? "bg-brand text-white"
          : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}
