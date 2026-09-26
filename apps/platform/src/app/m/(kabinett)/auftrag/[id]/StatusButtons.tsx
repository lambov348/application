"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type { AppointmentStatus } from "@prisma/client";
import { setJobStatusAction, type JobState } from "../../actions";
import { JOB_FLOW } from "@/lib/job";
import { Alert } from "@/components/ui/alert";

/**
 * Статусы одним тапом (глава 5.6.3 ТЗ).
 *
 * Кнопка большая и одна: на объекте телефон держат в перчатках. Следующий
 * статус подсвечен, пройденные показаны как отметки. Форма обычная, поэтому
 * работает и без JavaScript — просто без сообщения об ошибке на месте.
 */
export function StatusButtons({
  appointmentId,
  status,
  locked,
}: {
  appointmentId: string;
  status: AppointmentStatus;
  locked: boolean;
}) {
  const t = useTranslations("monteur");
  const tp = useTranslations("plan");
  const [state, action] = useActionState<JobState, FormData>(
    setJobStatusAction,
    {},
  );

  const index = JOB_FLOW.indexOf(status);
  const next = JOB_FLOW[index + 1] ?? null;

  return (
    <section className="border-linie mb-4 rounded-[3px] border bg-white p-3">
      <h2 className="mb-2 text-sm font-semibold">{t("statusTitle")}</h2>

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      {/* Пройденный путь. Видно, на каком шаге выезд, без чтения истории. */}
      <ol className="text-text-2 mb-3 flex flex-wrap gap-x-2 gap-y-1 text-[12px]">
        {JOB_FLOW.map((step, i) => (
          <li
            key={step}
            className={
              i <= index ? "text-gruen font-semibold" : undefined
            }
          >
            {i <= index ? "✓ " : ""}
            {tp(`statuses.${step}`)}
          </li>
        ))}
      </ol>

      {next && !locked && (
        <form action={action}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <input type="hidden" name="to" value={next} />
          <NextButton label={tp(`statuses.${next}`)} />
        </form>
      )}

      {locked && <p className="text-text-2 text-xs">{t("handoverLocked")}</p>}

      <p className="text-text-2 mt-2 text-xs">{t("statusHint")}</p>
    </section>
  );
}

function NextButton({ label }: { label: string }) {
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
