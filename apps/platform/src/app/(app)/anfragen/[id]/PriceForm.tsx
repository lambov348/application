"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { setPriceAction, type FormState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

/**
 * Поле цены.
 *
 * Отрисовывается только для владельца: для остальных ролей страница этот
 * компонент вообще не выводит, а серверное действие дополнительно проверяет
 * роль и бросает исключение. Одного из двух рубежей мало — скрытая форма
 * всё равно отправляется вручную.
 */
export function PriceForm({
  dealId,
  priceNetCents,
  approvedBy,
  approvedAt,
}: {
  dealId: string;
  priceNetCents: number | null;
  approvedBy: string | null;
  approvedAt: string | null;
}) {
  const t = useTranslations("deals");
  const [state, action] = useActionState<FormState, FormData>(setPriceAction, {});

  return (
    <form action={action} className="border-gelb/50 bg-gelb/5 rounded-[3px] border p-4">
      <input type="hidden" name="dealId" value={dealId} />

      <h3 className="mb-1 text-sm font-semibold">{t("priceTitle")}</h3>
      <p className="text-text-2 mb-3 text-xs">{t("priceOwnerOnly")}</p>

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <div className="flex items-end gap-2">
        <div>
          <label htmlFor="priceNet" className="mb-1 block text-[13px] font-semibold">
            {t("priceNet")}
          </label>
          <Input
            id="priceNet"
            name="priceNet"
            inputMode="decimal"
            defaultValue={
              priceNetCents === null ? "" : (priceNetCents / 100).toFixed(2).replace(".", ",")
            }
            placeholder="0,00"
            className="w-40"
          />
        </div>
        <SaveButton label={t("savePrice")} />
      </div>

      <p className="text-text-2 mt-2 text-xs">{t("priceClearHint")}</p>

      {approvedBy && approvedAt && (
        <p className="text-gruen mt-2 text-xs">
          {t("approvedBy", { name: approvedBy, when: approvedAt })}
        </p>
      )}
    </form>
  );
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blau rounded-[3px] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
    >
      {label}
    </button>
  );
}
