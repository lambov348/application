"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  updateDealAction,
  updateChecklistAction,
  markFirstResponseAction,
  type FormState,
} from "../actions";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SERVICES, SOURCES, CHECKLIST_KEYS } from "@/lib/deals";

function Submit({ label }: { label: string }) {
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

function Result({ state }: { state: FormState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

const selectClass =
  "border-linie bg-blatt w-full rounded-[3px] border px-3 py-2 text-sm";

export function DealDetailsForm({
  deal,
  addresses,
}: {
  deal: {
    id: string;
    title: string;
    addressId: string | null;
    source: string;
    services: string[];
    estHours: string | null;
    estMonteure: number | null;
    notes: string | null;
  };
  addresses: { id: string; street: string; zip: string; city: string }[];
}) {
  const t = useTranslations("deals");
  const [state, action] = useActionState<FormState, FormData>(updateDealAction, {});

  return (
    <form action={action} className="border-linie bg-blatt rounded-[3px] border p-4">
      <input type="hidden" name="dealId" value={deal.id} />
      <Result state={state} />

      <Field label={t("title")} htmlFor="title">
        <Input id="title" name="title" defaultValue={deal.title} required />
      </Field>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t("address")} htmlFor="addressId" hint={t("addressHint")}>
          <select
            id="addressId"
            name="addressId"
            defaultValue={deal.addressId ?? ""}
            className={selectClass}
          >
            <option value="">{t("noAddress")}</option>
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.street}, {a.zip} {a.city}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("source")} htmlFor="source" hint={t("sourceHint")}>
          <select
            id="source"
            name="source"
            defaultValue={deal.source}
            className={selectClass}
            required
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {t(`sources.${s}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="mb-4">
        <legend className="mb-1 block text-[13px] font-semibold">
          {t("services")}
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {SERVICES.map((s) => (
            <label key={s} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="services"
                value={s}
                defaultChecked={deal.services.includes(s)}
              />
              {t(`services_list.${s}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t("estHours")} htmlFor="estHours">
          <Input
            id="estHours"
            name="estHours"
            inputMode="decimal"
            defaultValue={deal.estHours ?? ""}
          />
        </Field>
        <Field label={t("estMonteure")} htmlFor="estMonteure">
          <Input
            id="estMonteure"
            name="estMonteure"
            inputMode="numeric"
            defaultValue={deal.estMonteure ?? ""}
          />
        </Field>
      </div>

      <Field label={t("notes")} htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={deal.notes ?? ""}
          className={selectClass}
        />
      </Field>

      <Submit label={t("save")} />
    </form>
  );
}

export function ChecklistForm({
  dealId,
  checklist,
}: {
  dealId: string;
  checklist: Record<string, boolean>;
}) {
  const t = useTranslations("deals");
  const [state, action] = useActionState<FormState, FormData>(
    updateChecklistAction,
    {},
  );

  return (
    <form action={action} className="border-linie bg-blatt rounded-[3px] border p-4">
      <input type="hidden" name="dealId" value={dealId} />
      <h3 className="mb-2 text-sm font-semibold">{t("checklistTitle")}</h3>
      <Result state={state} />

      <div className="mb-3 grid gap-1">
        {CHECKLIST_KEYS.map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={key} defaultChecked={checklist[key] === true} />
            {t(`checklist.${key}`)}
          </label>
        ))}
      </div>

      <Submit label={t("save")} />
    </form>
  );
}

export function FirstResponseForm({ dealId }: { dealId: string }) {
  const t = useTranslations("deals");
  const [state, action] = useActionState<FormState, FormData>(
    markFirstResponseAction,
    {},
  );

  return (
    <form action={action}>
      <input type="hidden" name="dealId" value={dealId} />
      <Result state={state} />
      <Submit label={t("markFirstResponse")} />
      <p className="text-text-2 mt-1 text-xs">{t("firstResponseHint")}</p>
    </form>
  );
}
