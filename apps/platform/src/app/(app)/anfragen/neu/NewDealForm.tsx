"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { createDealAction, type FormState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SERVICES, SOURCES, CHECKLIST_KEYS } from "@/lib/deals";

export type CustomerOption = {
  id: string;
  label: string;
  addresses: { id: string; label: string }[];
};

const selectClass =
  "border-linie bg-blatt w-full rounded-[3px] border px-3 py-2 text-sm";

export function NewDealForm({ customers }: { customers: CustomerOption[] }) {
  const t = useTranslations("deals");
  const [state, action] = useActionState<FormState, FormData>(createDealAction, {});
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");

  const addresses = customers.find((c) => c.id === customerId)?.addresses ?? [];

  return (
    <form action={action} className="border-linie bg-blatt rounded-[3px] border p-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field label={t("customer")} htmlFor="customerId" hint={t("customerHint")}>
        <select
          id="customerId"
          name="customerId"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className={selectClass}
          required
        >
          <option value="">{t("chooseCustomer")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("address")} htmlFor="addressId" hint={t("addressHint")}>
        <select id="addressId" name="addressId" className={selectClass}>
          <option value="">{t("noAddress")}</option>
          {addresses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("title")} htmlFor="title" hint={t("titleHint")}>
        <Input id="title" name="title" required minLength={3} />
      </Field>

      {/* Источник обязателен: без него не посчитать, какой канал приносит
          деньги, а это одна из целей платформы (глава 1 ТЗ). */}
      <Field label={t("source")} htmlFor="source" hint={t("sourceHint")}>
        <select id="source" name="source" className={selectClass} required defaultValue="">
          <option value="" disabled>
            {t("chooseSource")}
          </option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {t(`sources.${s}`)}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="mb-4">
        <legend className="mb-1 block text-[13px] font-semibold">{t("services")}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {SERVICES.map((s) => (
            <label key={s} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="services" value={s} />
              {t(`services_list.${s}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label={t("notes")} htmlFor="notes">
        <textarea id="notes" name="notes" rows={3} className={selectClass} />
      </Field>

      <SubmitButton label={t("create")} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blau rounded-[3px] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
    >
      {label}
    </button>
  );
}
