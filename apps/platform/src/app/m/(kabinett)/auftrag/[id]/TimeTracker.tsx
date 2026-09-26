"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { startTimeAction, stopTimeAction, type JobState } from "../../actions";
import { Alert } from "@/components/ui/alert";

/**
 * Учёт рабочего времени (глава 5.6.6 ТЗ).
 *
 * Бегущих часов здесь нет намеренно: они требуют таймера в браузере и
 * расходятся с сервером. Показано время начала — оно и есть отметка,
 * которая пойдёт в расчёт.
 */
export function TimeTracker({
  appointmentId,
  runningSince,
  runningElsewhereNumber,
  totalLabel,
  locked,
}: {
  appointmentId: string;
  runningSince: string | null;
  runningElsewhereNumber: number | null;
  totalLabel: string | null;
  locked: boolean;
}) {
  const t = useTranslations("monteur");
  const [state, action] = useActionState<JobState, FormData>(
    runningSince ? stopTimeAction : startTimeAction,
    {},
  );

  return (
    <section className="border-linie mb-4 rounded-[3px] border bg-white p-3">
      <h2 className="mb-2 text-sm font-semibold">{t("timeTitle")}</h2>

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      {runningSince && (
        <p className="text-gruen mb-2 text-sm font-semibold">
          {t("timeRunning", { since: runningSince })}
        </p>
      )}

      {!runningSince && runningElsewhereNumber !== null && (
        <Alert tone="warning">
          {t("timeRunningElsewhere", { number: runningElsewhereNumber })}
        </Alert>
      )}

      <p className="text-text-2 mb-3 text-[13px]">
        {totalLabel ? `${t("timeTotal")}: ${totalLabel}` : t("timeNone")}
      </p>

      {/* Остановить время можно всегда, даже после подписи протокола:
          идущий таймер иначе некому закрыть, и он до вечера копит минуты,
          которые пойдут в расчёт зарплаты. Запускать новое время на закрытом
          выезде нельзя. */}
      {(runningSince || !locked) && (
        <form action={action}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <SubmitButton
            label={runningSince ? t("timeStop") : t("timeStart")}
            stop={Boolean(runningSince)}
          />
        </form>
      )}
    </section>
  );
}

function SubmitButton({ label, stop }: { label: string; stop: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        "w-full rounded-[3px] px-4 py-3 text-[15px] font-semibold disabled:opacity-50 " +
        (stop ? "bg-rot text-white" : "border-linie border")
      }
    >
      {label}
    </button>
  );
}
