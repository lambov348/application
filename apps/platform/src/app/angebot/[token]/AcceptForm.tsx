"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { acceptOfferAction, type OfferState } from "@/app/(app)/angebote/actions";
import { Alert } from "@/components/ui/alert";

function Submit({
  label,
  decline,
}: {
  label: string;
  decline?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={decline ? "decline" : undefined}
      value={decline ? "true" : undefined}
      disabled={pending}
      className={
        decline
          ? "border-linie text-text-2 hover:bg-linie-2 rounded-[3px] border px-4 py-2.5 text-sm"
          : "bg-gruen rounded-[3px] px-4 py-2.5 text-sm font-semibold text-white"
      }
    >
      {label}
    </button>
  );
}

/**
 * Принятие или отклонение предложения клиентом.
 * Дата и IP фиксируются на сервере (глава 5.4 ТЗ).
 */
export function AcceptForm({ token }: { token: string }) {
  const t = useTranslations("publicOffer");
  const [state, action] = useActionState<OfferState, FormData>(
    acceptOfferAction,
    {},
  );

  // Ветки «успешно принято» здесь нет намеренно: после принятия страница
  // перерисовывается на сервере и показывает состояние «уже принято»
  // вместо этой формы. Дублировать его было бы мёртвым кодом.

  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="flex flex-wrap gap-3">
        <Submit label={t("accept")} />
        <Submit label={t("decline")} decline />
      </div>
      <p className="text-text-2 mt-2 text-xs">{t("acceptHint")}</p>
    </form>
  );
}
