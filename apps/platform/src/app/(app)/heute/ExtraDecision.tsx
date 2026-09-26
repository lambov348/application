"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { decideExtraAction, type ExtraDecisionState } from "./actions";
import { Alert } from "@/components/ui/alert";

/**
 * Две кнопки для решения по доплате. Отрисовывается только владельцу;
 * серверное действие всё равно проверяет роль — скрытая форма отправляется
 * вручную.
 */
export function ExtraDecision({ extraId }: { extraId: string }) {
  const t = useTranslations("heute");
  const [state, action] = useActionState<ExtraDecisionState, FormData>(
    decideExtraAction,
    {},
  );

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="extraId" value={extraId} />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <input
        name="note"
        placeholder={t("extraNote")}
        className="border-linie mb-2 w-full rounded-[3px] border px-2 py-1.5 text-[13px]"
      />
      <div className="flex gap-2">
        <DecisionButton
          value="ANGENOMMEN"
          label={t("extraAccept")}
          className="bg-gruen text-white"
        />
        <DecisionButton
          value="ABGELEHNT"
          label={t("extraReject")}
          className="border-linie border"
        />
      </div>
    </form>
  );
}

function DecisionButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="decision"
      value={value}
      disabled={pending}
      className={`rounded-[3px] px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50 ${className}`}
    >
      {label}
    </button>
  );
}
