import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  PIPELINES,
  DEFAULT_PIPELINE,
  isPipeline,
  pipelineLabel,
} from "@/lib/crm";
import { moveDeal } from "./actions";
import KanbanBoard, { type BoardDeal } from "./KanbanBoard";

export const dynamic = "force-dynamic";

export default async function CrmBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string }>;
}) {
  const sp = await searchParams;
  const pipeline =
    sp.pipeline && isPipeline(sp.pipeline) ? sp.pipeline : DEFAULT_PIPELINE;

  const deals = await prisma.deal.findMany({
    where: { pipeline },
    orderBy: { updatedAt: "desc" },
    include: {
      contact: { select: { name: true } },
      _count: { select: { crmTasks: { where: { done: false } } } },
    },
  });

  const boardDeals: BoardDeal[] = deals.map((d) => ({
    id: d.id,
    title: d.title,
    stage: d.stage,
    amount: d.amount,
    serviceType: d.serviceType,
    team: d.team,
    paymentStatus: d.paymentStatus,
    scheduledAt: d.scheduledAt ? d.scheduledAt.toISOString() : null,
    contactName: d.contact?.name ?? null,
    openTasks: d._count.crmTasks,
  }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl font-bold text-gray-900">Воронка</h1>
        <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
          {PIPELINES.map((p) => {
            const active = p.key === pipeline;
            return (
              <Link
                key={p.key}
                href={`/crm?pipeline=${p.key}`}
                className={
                  "rounded-md px-3 py-1.5 text-sm font-medium transition " +
                  (active
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800")
                }
              >
                {p.label}
              </Link>
            );
          })}
        </div>
        <span className="ml-auto text-sm text-gray-500">
          {pipelineLabel(pipeline)} · {deals.length} сделок
        </span>
      </div>

      <KanbanBoard deals={boardDeals} moveDeal={moveDeal} />
    </div>
  );
}
