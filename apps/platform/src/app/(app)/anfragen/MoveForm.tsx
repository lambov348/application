"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type { DealStatus } from "@prisma/client";
import { moveDealAction, type FormState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { ALL_STATUSES, LOST_REASONS, LOST_STATUS } from "@/lib/deals";

/**
 * Перевод заявки в другую колонку.
 *
 * Выпадающий список, а не перетаскивание: работает на телефоне, работает до
 * загрузки скриптов и не требует ни одной библиотеки. Перетаскивание можно
 * добавить сверху как удобство, но оно не должно быть единственным способом.
 */
export function MoveForm({
  dealId,
  status,
  compact = false,
}: {
  dealId: string;
  status: DealStatus;
  compact?: boolean;
}) {
  const t = useTranslations("deals");
  const [state, action] = useActionState<FormState, FormData>(moveDealAction, {});
  const [next, setNext] = useState<DealStatus>(status);

  return (
    <form action={action} className={compact ? "" : "mb-4"}>
      <input type="hidden" name="dealId" value={dealId} />

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && !compact && <Alert tone="success">{state.success}</Alert>}

      <div className="flex flex-wrap items-end gap-2">
        <select
          name="status"
          value={next}
          onChange={(e) => setNext(e.target.value as DealStatus)}
          aria-label={t("status")}
          className="border-linie bg-blatt rounded-[3px] border px-2 py-1.5 text-[13px]"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </select>

        {/* Правило 9.7: без причины «Verloren» не сохранится. */}
        {next === LOST_STATUS && (
          <>
            <select
              name="lostReason"
              required
              aria-label={t("lostReason")}
              className="border-linie bg-blatt rounded-[3px] border px-2 py-1.5 text-[13px]"
            >
              <option value="">{t("chooseReason")}</option>
              {LOST_REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`lostReasons.${r}`)}
                </option>
              ))}
            </select>
            <input
              name="lostNote"
              placeholder={t("lostNote")}
              className="border-linie bg-blatt rounded-[3px] border px-2 py-1.5 text-[13px]"
            />
          </>
        )}

        <MoveButton disabled={next === status} label={t("move")} />
      </div>
    </form>
  );
}

function MoveButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="bg-blau rounded-[3px] px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
    >
      {label}
    </button>
  );
}
