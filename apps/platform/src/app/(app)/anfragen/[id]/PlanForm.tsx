"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type { AppointmentStatus } from "@prisma/client";
import {
  planAppointmentAction,
  cancelAppointmentAction,
  setAppointmentStatusAction,
  type PlanState,
} from "@/app/(app)/einsatzplan/actions";
import { APPOINTMENT_FLOW } from "@/lib/deals";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export type TeamOption = { id: string; name: string };
export type MemberOption = { id: string; name: string };

export type AppointmentValues = {
  id: string;
  startLocal: string;
  endLocal: string;
  teamId: string | null;
  status: AppointmentStatus;
  dispatcherNote: string | null;
  assigneeIds: string[];
};

function Submit({ label, variant }: { label: string; variant?: "ghost" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {label}
    </Button>
  );
}

const selectClass =
  "border-linie bg-blatt w-full rounded-[3px] border px-3 py-2 text-sm";

/**
 * Планирование выезда.
 *
 * Конфликты — занятая бригада и нехватка времени на переезд — показываются
 * предупреждением, а не отказом (глава 5.3 ТЗ). Диспетчер видит, с каким
 * заказом столкнулся, и решает сам: соседний подъезд иногда стоит наложения.
 * Чтобы сохранить вопреки предупреждению, надо поставить галочку.
 */
export function PlanForm({
  dealId,
  teams,
  members,
  appointment,
  defaultStart,
  defaultEnd,
}: {
  dealId: string;
  teams: TeamOption[];
  members: MemberOption[];
  appointment?: AppointmentValues;
  defaultStart: string;
  defaultEnd: string;
}) {
  const t = useTranslations("plan");
  const [state, action] = useActionState<PlanState, FormData>(
    planAppointmentAction,
    {},
  );
  const [cancelState, cancelAction] = useActionState<PlanState, FormData>(
    cancelAppointmentAction,
    {},
  );
  const [statusState, statusAction] = useActionState<PlanState, FormData>(
    setAppointmentStatusAction,
    {},
  );

  const id = appointment?.id ?? "neu";
  const hasConflicts = (state.conflicts?.length ?? 0) > 0;

  return (
    <div className={appointment ? "border-linie border-t p-4" : ""}>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {cancelState.error && <Alert tone="error">{cancelState.error}</Alert>}
      {cancelState.success && <Alert tone="success">{cancelState.success}</Alert>}
      {statusState.error && <Alert tone="error">{statusState.error}</Alert>}

      {hasConflicts && (
        <Alert tone="warning">
          <b className="block">{t("conflictTitle")}</b>
          <ul className="mt-1 list-disc pl-4">
            {state.conflicts!.map((c) => (
              <li key={`${c.code}-${c.withAppointmentId}`}>
                {c.code === "overlap"
                  ? t("conflictOverlap", { number: c.dealNumber, city: c.city })
                  : t("conflictTravel", {
                      number: c.dealNumber,
                      city: c.city,
                      minutes: c.missingMinutes ?? 0,
                    })}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <form action={action}>
        <input type="hidden" name="dealId" value={dealId} />
        {appointment && (
          <input type="hidden" name="appointmentId" value={appointment.id} />
        )}

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label={t("start")} htmlFor={`start-${id}`} hint={t("timeHint")}>
            <Input
              id={`start-${id}`}
              name="start"
              type="datetime-local"
              defaultValue={appointment?.startLocal ?? defaultStart}
              required
            />
          </Field>
          <Field label={t("end")} htmlFor={`end-${id}`}>
            <Input
              id={`end-${id}`}
              name="end"
              type="datetime-local"
              defaultValue={appointment?.endLocal ?? defaultEnd}
              required
            />
          </Field>
        </div>

        <Field label={t("team")} htmlFor={`team-${id}`} hint={t("teamHint")}>
          <select
            id={`team-${id}`}
            name="teamId"
            defaultValue={appointment?.teamId ?? ""}
            className={selectClass}
          >
            <option value="">{t("noTeam")}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>

        <fieldset className="mb-4">
          <legend className="mb-1 block text-[13px] font-semibold">
            {t("assignees")}
          </legend>
          <p className="text-text-2 mb-1 text-xs">{t("assigneesHint")}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="assignees"
                  value={m.id}
                  defaultChecked={appointment?.assigneeIds.includes(m.id)}
                />
                {m.name}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label={t("note")} htmlFor={`note-${id}`} hint={t("noteHint")}>
          <Input
            id={`note-${id}`}
            name="dispatcherNote"
            defaultValue={appointment?.dispatcherNote ?? ""}
          />
        </Field>

        {hasConflicts && (
          <label className="text-rot mb-3 flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="force" />
            {t("planAnyway")}
          </label>
        )}

        <Submit label={appointment ? t("save") : t("plan")} />
      </form>

      {appointment && (
        <div className="border-linie mt-3 flex flex-wrap items-end gap-3 border-t pt-3">
          <form action={statusAction} className="flex items-end gap-2">
            <input type="hidden" name="appointmentId" value={appointment.id} />
            <Field label={t("status")} htmlFor={`status-${id}`} className="mb-0">
              <select
                id={`status-${id}`}
                name="status"
                defaultValue={appointment.status}
                className={selectClass}
              >
                {APPOINTMENT_FLOW.map((s) => (
                  <option key={s} value={s}>
                    {t(`statuses.${s}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Submit label={t("setStatus")} variant="ghost" />
          </form>

          {appointment.status !== "ABGESAGT" && (
            <form action={cancelAction}>
              <input type="hidden" name="appointmentId" value={appointment.id} />
              <Submit label={t("cancel")} variant="danger" />
            </form>
          )}
        </div>
      )}
    </div>
  );
}
