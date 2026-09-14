"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  createCustomerAction,
  updateCustomerAction,
  type FormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const LANGS = ["DE", "EN", "RU", "RO"] as const;

export type CustomerFormValues = {
  id?: string;
  type: "PRIVAT" | "FIRMA";
  salutation: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  language: string;
  notes: string | null;
  tags: string[];
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

const selectClass =
  "border-linie bg-blatt w-full rounded-[3px] border px-3 py-2 text-sm";

export function CustomerForm({ customer }: { customer?: CustomerFormValues }) {
  const t = useTranslations("customers");
  const isEdit = Boolean(customer?.id);

  const [state, action] = useActionState<FormState, FormData>(
    isEdit ? updateCustomerAction : createCustomerAction,
    {},
  );

  // Поля частного лица и фирмы различаются, поэтому тип нужен на клиенте.
  // При выключенном JavaScript видны оба набора — форма остаётся рабочей.
  const [type, setType] = useState<"PRIVAT" | "FIRMA">(
    customer?.type ?? "PRIVAT",
  );

  return (
    <form action={action} className="border-linie bg-blatt rounded-[3px] border p-4">
      {customer?.id && <input type="hidden" name="customerId" value={customer.id} />}

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t("type")} htmlFor="type">
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as "PRIVAT" | "FIRMA")}
            className={selectClass}
          >
            <option value="PRIVAT">{t("types.PRIVAT")}</option>
            <option value="FIRMA">{t("types.FIRMA")}</option>
          </select>
        </Field>

        <Field label={t("language")} htmlFor="language" hint={t("languageHint")}>
          <select
            id="language"
            name="language"
            defaultValue={customer?.language ?? "DE"}
            className={selectClass}
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {t(`langs.${l}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {type === "FIRMA" && (
        <Field label={t("company")} htmlFor="company">
          <Input id="company" name="company" defaultValue={customer?.company ?? ""} />
        </Field>
      )}

      <div className="grid gap-x-4 sm:grid-cols-3">
        <Field label={t("salutation")} htmlFor="salutation">
          <select
            id="salutation"
            name="salutation"
            defaultValue={customer?.salutation ?? ""}
            className={selectClass}
          >
            <option value="">—</option>
            <option value="Herr">Herr</option>
            <option value="Frau">Frau</option>
          </select>
        </Field>
        <Field label={t("firstName")} htmlFor="firstName">
          <Input id="firstName" name="firstName" defaultValue={customer?.firstName ?? ""} />
        </Field>
        <Field label={t("lastName")} htmlFor="lastName">
          <Input id="lastName" name="lastName" defaultValue={customer?.lastName ?? ""} />
        </Field>
      </div>

      {type === "PRIVAT" && (
        // Частное лицо иногда оказывается фирмой — поле остаётся доступным.
        <Field label={t("companyOptional")} htmlFor="company-privat">
          <Input id="company-privat" name="company" defaultValue={customer?.company ?? ""} />
        </Field>
      )}

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t("phone")} htmlFor="phone" hint={t("phoneHint")}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={customer?.phone ?? ""}
          />
        </Field>
        <Field label={t("email")} htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} />
        </Field>
      </div>

      <Field label={t("tags")} htmlFor="tags" hint={t("tagsHint")}>
        <Input id="tags" name="tags" defaultValue={customer?.tags.join(", ") ?? ""} />
      </Field>

      <Field label={t("notes")} htmlFor="notes" hint={t("notesHint")}>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={customer?.notes ?? ""}
          className="border-linie bg-blatt w-full rounded-[3px] border px-3 py-2 text-sm"
        />
      </Field>

      <Submit label={isEdit ? t("save") : t("create")} />
    </form>
  );
}
