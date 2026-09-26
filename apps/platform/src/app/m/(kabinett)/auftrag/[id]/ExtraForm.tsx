"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { reportExtraAction, type JobState } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

/**
 * Материал и доплата (глава 5.6.7 ТЗ): «докупили силикон 12 €»,
 * «добавились 2 полки, +40 мин».
 *
 * Это сообщение владельцу. Цену заказа монтажник не видит и не меняет —
 * жёсткое требование главы 4; решение по доплате принимает владелец.
 */
export function ExtraForm({
  appointmentId,
  locked,
}: {
  appointmentId: string;
  locked: boolean;
}) {
  const t = useTranslations("monteur");
  const [kind, setKind] = useState<"MATERIAL" | "ZEIT">("MATERIAL");
  const [state, action] = useActionState<JobState, FormData>(
    reportExtraAction,
    {},
  );

  if (locked) return null;

  return (
    <form
      action={action}
      className="border-linie rounded-[3px] border bg-white p-3"
    >
      <input type="hidden" name="appointmentId" value={appointmentId} />

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <label
        htmlFor="extraKind"
        className="mb-1 block text-[13px] font-semibold"
      >
        {t("extraKind")}
      </label>
      <select
        id="extraKind"
        name="kind"
        value={kind}
        onChange={(event) => setKind(event.target.value as "MATERIAL" | "ZEIT")}
        className="border-linie mb-3 w-full rounded-[3px] border px-3 py-2 text-sm"
      >
        <option value="MATERIAL">{t("extraMaterial")}</option>
        <option value="ZEIT">{t("extraTime")}</option>
      </select>

      <label
        htmlFor="extraDescription"
        className="mb-1 block text-[13px] font-semibold"
      >
        {t("extraDescription")}
      </label>
      <Input
        id="extraDescription"
        name="description"
        placeholder={t("extraDescriptionHint")}
        className="mb-3"
      />

      {/* Без JavaScript видно оба поля — сервер берёт нужное по виду
          сообщения, а лишнее не сохраняет. */}
      {kind === "MATERIAL" ? (
        <div className="mb-3">
          <label
            htmlFor="extraAmount"
            className="mb-1 block text-[13px] font-semibold"
          >
            {t("extraAmount")}
          </label>
          <Input
            id="extraAmount"
            name="amount"
            inputMode="decimal"
            placeholder="12,00"
            className="w-32"
          />
        </div>
      ) : (
        <div className="mb-3">
          <label
            htmlFor="extraMinutes"
            className="mb-1 block text-[13px] font-semibold"
          >
            {t("extraMinutes")}
          </label>
          <Input
            id="extraMinutes"
            name="minutes"
            inputMode="numeric"
            placeholder="40"
            className="w-32"
          />
        </div>
      )}

      <p className="text-text-2 mb-3 text-xs">{t("extrasHint")}</p>
      <SendButton label={t("extraSend")} />
    </form>
  );
}

function SendButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blau w-full rounded-[3px] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
    >
      {label}
    </button>
  );
}
