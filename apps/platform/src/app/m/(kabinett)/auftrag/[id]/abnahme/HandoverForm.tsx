"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { signHandoverAction, type JobState } from "../../../actions";
import { HANDOVER_CHECKLIST } from "@/lib/job";
import { Alert } from "@/components/ui/alert";
import { SignaturePad } from "./SignaturePad";

/**
 * Протокол приёмки: чек-лист, замечания, согласие на фото, подпись клиента
 * (глава 5.6.5 ТЗ).
 *
 * Подписанный протокол не редактируется — это документ, который уходит
 * клиенту. Поэтому форма отправляется один раз, а дальше страница заказа
 * показывает готовый PDF.
 */
export function HandoverForm({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations("handover");
  const [state, action] = useActionState<JobState, FormData>(
    signHandoverAction,
    {},
  );

  return (
    <form action={action}>
      <input type="hidden" name="appointmentId" value={appointmentId} />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <h2 className="mb-2 text-sm font-semibold">{t("checklistTitle")}</h2>
      <ul className="mb-4 space-y-2">
        {HANDOVER_CHECKLIST.map((key) => (
          <li key={key}>
            <label className="flex items-start gap-2 text-[14px]">
              <input
                type="checkbox"
                name={key}
                defaultChecked
                className="mt-0.5 h-5 w-5"
              />
              <span>{t(`checklist.${key}`)}</span>
            </label>
          </li>
        ))}
      </ul>

      <label htmlFor="remarks" className="mb-1 block text-sm font-semibold">
        {t("remarks")}
      </label>
      <textarea
        id="remarks"
        name="remarks"
        rows={3}
        placeholder={t("remarksHint")}
        className="border-linie mb-4 w-full rounded-[3px] border px-3 py-2 text-sm"
      />

      <label className="mb-4 flex items-start gap-2 text-[14px]">
        <input
          type="checkbox"
          name="photoConsent"
          className="mt-0.5 h-5 w-5"
        />
        <span>{t("photoConsent")}</span>
      </label>

      <h2 className="mb-1 text-sm font-semibold">{t("signature")}</h2>
      <p className="text-text-2 mb-2 text-xs">{t("signatureLegal")}</p>
      <SignaturePad name="signature" />

      <div className="mt-4">
        <SignButton label={t("sign")} />
      </div>
      <p className="text-text-2 mt-2 text-xs">{t("signHint")}</p>
    </form>
  );
}

function SignButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blau w-full rounded-[3px] px-4 py-4 text-[17px] font-semibold text-white disabled:opacity-50"
    >
      {label}
    </button>
  );
}
