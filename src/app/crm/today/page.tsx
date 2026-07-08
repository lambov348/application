import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  stageDef,
  serviceEmoji,
  labelOf,
  taskEmoji,
  TEAMS,
  SERVICE_TYPES,
  PAYMENT_STATUS,
} from "@/lib/crm";
import { formatMoney, formatDateTime } from "@/lib/format";
import { toggleTask } from "../actions";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const now = new Date();
  const startDay = new Date(now); startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(now); endDay.setHours(23, 59, 59, 999);

  const [tasks, todayJobs, unpaid, waiting] = await Promise.all([
    // Задачи на сегодня и просроченные
    prisma.crmTask.findMany({
      where: { done: false, dueAt: { lte: endDay } },
      orderBy: { dueAt: "asc" },
      include: { deal: { select: { id: true, title: true } } },
      take: 100,
    }),
    // Монтажи сегодня
    prisma.deal.findMany({
      where: { scheduledAt: { gte: startDay, lte: endDay } },
      orderBy: { scheduledAt: "asc" },
      include: { contact: { select: { name: true, address: true, phone: true } } },
    }),
    // Не оплачено (деньги к получению)
    prisma.deal.findMany({
      where: {
        paymentStatus: { in: ["unpaid", "partial"] },
        stage: { in: ["scheduled", "in_work", "done_paid", "warranty"] },
      },
      orderBy: { updatedAt: "desc" },
      include: { contact: { select: { name: true } } },
      take: 100,
    }),
    // Ждут ответа
    prisma.deal.findMany({
      where: { stage: { in: ["offer_sent", "thinking"] } },
      orderBy: { updatedAt: "desc" },
      include: { contact: { select: { name: true } } },
      take: 100,
    }),
  ]);

  const unpaidSum = unpaid.reduce((a, d) => a + (d.amount ?? 0), 0);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-gray-900">Сегодня</h1>
      <p className="mb-5 text-sm text-gray-500">
        {now.toLocaleDateString("ru-RU", { weekday: "long", day: "2-digit", month: "long" })}
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Монтажи сегодня */}
        <Panel title="🚚 Работы сегодня" count={todayJobs.length}>
          {todayJobs.map((d) => (
            <Link key={d.id} href={`/crm/deals/${d.id}`} className="block rounded-lg border border-gray-200 p-3 hover:border-brand/50">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  {serviceEmoji(d.serviceType)} {d.title}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {d.scheduledAt?.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                {d.team && <span>👷 {labelOf(TEAMS, d.team)}</span>}
                <span>📍 {d.workAddress || d.contact?.address || "адрес не указан"}</span>
                {d.contact?.phone && <span>📞 {d.contact.phone}</span>}
              </div>
            </Link>
          ))}
          {todayJobs.length === 0 && <Empty text="На сегодня работ нет" />}
        </Panel>

        {/* Задачи */}
        <Panel title="🔔 Задачи на сегодня" count={tasks.length}>
          {tasks.map((t) => {
            const overdue = t.dueAt && t.dueAt < startDay;
            return (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <form action={toggleTask}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="flex-none h-4 w-4 rounded border border-gray-300 bg-white" aria-label="Готово" />
                </form>
                <div className="flex-1 text-sm">
                  <span className="text-gray-800">{taskEmoji(t.kind)} {t.title}</span>
                  {t.deal && (
                    <Link href={`/crm/deals/${t.deal.id}`} className="ml-2 text-xs text-brand hover:underline">
                      → {t.deal.title}
                    </Link>
                  )}
                </div>
                <span className={"text-xs " + (overdue ? "font-semibold text-red-500" : "text-gray-400")}>
                  {overdue ? "просрочено" : t.dueAt ? formatDateTime(t.dueAt) : ""}
                </span>
              </div>
            );
          })}
          {tasks.length === 0 && <Empty text="Задач на сегодня нет" />}
        </Panel>

        {/* Не оплачено */}
        <Panel title="💶 Не оплачено" count={unpaid.length} note={unpaidSum > 0 ? formatMoney(unpaidSum) : undefined}>
          {unpaid.map((d) => {
            const ps = PAYMENT_STATUS.find((p) => p.key === d.paymentStatus);
            return (
              <Link key={d.id} href={`/crm/deals/${d.id}`} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-brand/50">
                <span className="font-medium text-gray-900">{d.title}
                  {d.contact?.name && <span className="ml-2 text-xs text-gray-400">{d.contact.name}</span>}
                </span>
                <span className="flex items-center gap-2">
                  {d.amount != null && <span className="font-semibold">{formatMoney(d.amount)}</span>}
                  {ps && <span className="text-xs" style={{ color: ps.color }}>{ps.label}</span>}
                </span>
              </Link>
            );
          })}
          {unpaid.length === 0 && <Empty text="Всё оплачено 👍" />}
        </Panel>

        {/* Ждут ответа */}
        <Panel title="⏳ Ждут ответа" count={waiting.length}>
          {waiting.map((d) => {
            const st = stageDef(d.stage);
            return (
              <Link key={d.id} href={`/crm/deals/${d.id}`} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-brand/50">
                <span className="font-medium text-gray-900">{d.title}
                  {d.contact?.name && <span className="ml-2 text-xs text-gray-400">{d.contact.name}</span>}
                </span>
                <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: st.color }}>
                  {st.short}
                </span>
              </Link>
            );
          })}
          {waiting.length === 0 && <Empty text="Никто не ждёт ответа" />}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  count,
  note,
  children,
}: {
  title: string;
  count: number;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <span className="rounded-full bg-gray-100 px-2 text-xs font-bold text-gray-600">{count}</span>
        {note && <span className="ml-auto text-sm font-bold text-red-500">{note}</span>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-gray-400">{text}</p>;
}
