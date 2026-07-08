"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  STAGES,
  serviceEmoji,
  SERVICE_TYPES,
  PAYMENT_STATUS,
  TEAMS,
  labelOf,
} from "@/lib/crm";
import { formatMoney } from "@/lib/format";

export type BoardDeal = {
  id: number;
  title: string;
  stage: string;
  amount: number | null;
  serviceType: string | null;
  team: string | null;
  paymentStatus: string;
  scheduledAt: string | null;
  contactName: string | null;
  openTasks: number;
};

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function KanbanBoard({
  deals,
  moveDeal,
}: {
  deals: BoardDeal[];
  moveDeal: (dealId: number, stage: string) => Promise<void>;
}) {
  const router = useRouter();
  const [items, setItems] = useState<BoardDeal[]>(deals);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Синхронизация с сервером после router.refresh().
  useEffect(() => setItems(deals), [deals]);

  function onDrop(stage: string) {
    const id = dragId;
    setOverStage(null);
    setDragId(null);
    if (id == null) return;
    const cur = items.find((d) => d.id === id);
    if (!cur || cur.stage === stage) return;
    // Оптимистично переносим карточку.
    setItems((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
    startTransition(async () => {
      await moveDeal(id, stage);
      router.refresh();
    });
  }

  const sumOf = (stage: string) =>
    items
      .filter((d) => d.stage === stage)
      .reduce((acc, d) => acc + (d.amount ?? 0), 0);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map((s) => {
        const colDeals = items.filter((d) => d.stage === s.key);
        const isOver = overStage === s.key;
        return (
          <div
            key={s.key}
            className="flex w-[250px] flex-none flex-col rounded-xl bg-gray-100"
            onDragOver={(e) => {
              e.preventDefault();
              if (overStage !== s.key) setOverStage(s.key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setOverStage((v) => (v === s.key ? null : v));
            }}
            onDrop={() => onDrop(s.key)}
          >
            <div
              className="flex items-center justify-between rounded-t-xl px-3 py-2 text-white"
              style={{ backgroundColor: s.color }}
            >
              <span className="text-[13px] font-semibold leading-tight">
                {s.label}
              </span>
              <span className="rounded-full bg-white/25 px-2 text-xs font-bold">
                {colDeals.length}
              </span>
            </div>
            <div className="px-3 py-1 text-[11px] font-medium text-gray-500">
              {sumOf(s.key) > 0 ? formatMoney(sumOf(s.key)) : "—"} · {s.probability}%
            </div>

            <div
              className={
                "flex min-h-[80px] flex-1 flex-col gap-2 p-2 transition " +
                (isOver ? "bg-brand/10 outline-dashed outline-2 outline-brand/40 rounded-b-xl" : "")
              }
            >
              {colDeals.map((d) => (
                <DealCardMini
                  key={d.id}
                  deal={d}
                  onDragStart={() => setDragId(d.id)}
                  onClick={() => router.push(`/crm/deals/${d.id}`)}
                />
              ))}
              {colDeals.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-gray-400">
                  Перетащите сюда
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DealCardMini({
  deal,
  onDragStart,
  onClick,
}: {
  deal: BoardDeal;
  onDragStart: () => void;
  onClick: () => void;
}) {
  const dragging = useRef(false);
  const ps = PAYMENT_STATUS.find((p) => p.key === deal.paymentStatus);
  return (
    <div
      draggable
      onDragStart={(e) => {
        dragging.current = true;
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={() => {
        setTimeout(() => (dragging.current = false), 50);
      }}
      onClick={() => {
        if (!dragging.current) onClick();
      }}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-2.5 text-sm shadow-sm hover:border-brand/50 hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium leading-tight text-gray-900">{deal.title}</span>
        {deal.openTasks > 0 && (
          <span
            className="flex-none rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-700"
            title="Открытые задачи"
          >
            🔔{deal.openTasks}
          </span>
        )}
      </div>
      {deal.contactName && (
        <div className="mt-0.5 truncate text-xs text-gray-500">{deal.contactName}</div>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
        {deal.serviceType && (
          <span>
            {serviceEmoji(deal.serviceType)} {labelOf(SERVICE_TYPES, deal.serviceType)}
          </span>
        )}
        {deal.amount != null && (
          <span className="font-semibold text-gray-900">{formatMoney(deal.amount)}</span>
        )}
        {deal.team && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5">
            {labelOf(TEAMS, deal.team)}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        {deal.scheduledAt ? (
          <span className="text-[11px] text-gray-500">🗓 {shortDate(deal.scheduledAt)}</span>
        ) : (
          <span />
        )}
        {ps && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium"
            style={{ color: ps.color }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: ps.color }}
            />
            {ps.label}
          </span>
        )}
      </div>
    </div>
  );
}
