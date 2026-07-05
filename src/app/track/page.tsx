import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import StatusBadge from "@/components/StatusBadge";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";

// Публичное отслеживание заявки по номеру. Показываем только безопасные поля,
// без внутренних заметок и контактов исполнителя.
export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const numericId = id ? Number(id) : NaN;

  const request =
    id && Number.isInteger(numericId)
      ? await prisma.request.findUnique({ where: { id: numericId } })
      : null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">
          Отследить заявку
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Введите номер заявки, который вы получили после отправки.
        </p>

        <form method="get" className="card flex gap-2 p-4">
          <input
            name="id"
            defaultValue={id ?? ""}
            placeholder="Например: 3"
            className="input"
            inputMode="numeric"
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            Проверить
          </button>
        </form>

        {id && !request && (
          <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Заявка № {id} не найдена. Проверьте номер.
          </div>
        )}

        {request && (
          <div className="card mt-6 space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Заявка № {request.id}
              </h2>
              <StatusBadge status={request.status} />
            </div>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <Row label="Услуга" value={request.serviceType} />
              <Row label="Адрес" value={request.address} />
              <Row
                label="Желаемая дата"
                value={formatDate(request.preferredDate)}
              />
              <Row
                label="Создана"
                value={formatDateTime(request.createdAt)}
              />
            </dl>
          </div>
        )}

        <div className="mt-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← На главную
          </Link>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}
