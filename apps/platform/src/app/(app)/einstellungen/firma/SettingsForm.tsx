"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { saveSettingsAction, type FormState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export type SettingsValues = {
  companyName: string;
  companyStreet: string;
  companyZip: string;
  companyCity: string;
  companyEmail: string;
  companyPhone: string;
  taxNumber: string;
  vatId: string;
  taxMode: "REGELBESTEUERUNG" | "KLEINUNTERNEHMER";
  vatPercent: string;
  hourlyRate: string;
  warrantyText: string;
  parkingText: string;
  scopeText: string;
  travelBufferMinutes: number;
  minPhotosBefore: number;
  minPhotosAfter: number;
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

const areaClass =
  "border-linie bg-blatt w-full rounded-[3px] border px-3 py-2 text-sm";

export function SettingsForm({
  values,
  legalPrefilled,
}: {
  values: SettingsValues;
  /** Правовые блоки в базе пусты и подставлено предложение. */
  legalPrefilled: boolean;
}) {
  const t = useTranslations("settings");
  const [state, action] = useActionState<FormState, FormData>(
    saveSettingsAction,
    {},
  );
  const [taxMode, setTaxMode] = useState(values.taxMode);

  return (
    <form action={action}>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      {/* ── Реквизиты §14 UStG ──────────────────────────────────────────── */}
      <section className="border-linie bg-blatt mb-5 rounded-[3px] border p-4">
        <h2 className="mb-1 font-semibold">{t("companyTitle")}</h2>
        <p className="text-text-2 mb-3 text-xs">{t("companyHint")}</p>

        <Field label={t("companyName")} htmlFor="companyName">
          <Input id="companyName" name="companyName" defaultValue={values.companyName} />
        </Field>

        <div className="grid gap-x-4 sm:grid-cols-4">
          <Field label={t("street")} htmlFor="companyStreet" className="sm:col-span-2">
            <Input id="companyStreet" name="companyStreet" defaultValue={values.companyStreet} />
          </Field>
          <Field label={t("zip")} htmlFor="companyZip">
            <Input id="companyZip" name="companyZip" defaultValue={values.companyZip} />
          </Field>
          <Field label={t("city")} htmlFor="companyCity">
            <Input id="companyCity" name="companyCity" defaultValue={values.companyCity} />
          </Field>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label={t("email")} htmlFor="companyEmail">
            <Input id="companyEmail" name="companyEmail" type="email" defaultValue={values.companyEmail} />
          </Field>
          <Field label={t("phone")} htmlFor="companyPhone">
            <Input id="companyPhone" name="companyPhone" defaultValue={values.companyPhone} />
          </Field>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label={t("taxNumber")} htmlFor="taxNumber" hint={t("taxNumberHint")}>
            <Input id="taxNumber" name="taxNumber" defaultValue={values.taxNumber} />
          </Field>
          <Field label={t("vatId")} htmlFor="vatId">
            <Input id="vatId" name="vatId" defaultValue={values.vatId} />
          </Field>
        </div>
      </section>

      {/* ── Налоги и ставки ─────────────────────────────────────────────── */}
      <section className="border-linie bg-blatt mb-5 rounded-[3px] border p-4">
        <h2 className="mb-3 font-semibold">{t("taxTitle")}</h2>

        <div className="grid gap-x-4 sm:grid-cols-3">
          <Field label={t("taxMode")} htmlFor="taxMode" hint={t("taxModeHint")}>
            <select
              id="taxMode"
              name="taxMode"
              value={taxMode}
              onChange={(e) => setTaxMode(e.target.value as SettingsValues["taxMode"])}
              className={areaClass}
            >
              <option value="REGELBESTEUERUNG">{t("regelbesteuerung")}</option>
              <option value="KLEINUNTERNEHMER">{t("kleinunternehmer")}</option>
            </select>
          </Field>

          <Field
            label={t("vatPercent")}
            htmlFor="vatPercent"
            hint={taxMode === "KLEINUNTERNEHMER" ? t("vatIgnored") : undefined}
          >
            <Input
              id="vatPercent"
              name="vatPercent"
              inputMode="decimal"
              defaultValue={values.vatPercent}
              disabled={taxMode === "KLEINUNTERNEHMER"}
            />
          </Field>

          <Field label={t("hourlyRate")} htmlFor="hourlyRate" hint={t("hourlyRateHint")}>
            <Input id="hourlyRate" name="hourlyRate" inputMode="decimal" defaultValue={values.hourlyRate} />
          </Field>
        </div>
      </section>

      {/* ── Правовые блоки Angebot ──────────────────────────────────────── */}
      <section className="border-linie bg-blatt mb-5 rounded-[3px] border p-4">
        <h2 className="mb-1 font-semibold">{t("legalTitle")}</h2>
        <p className="text-text-2 mb-3 text-xs">{t("legalHint")}</p>

        {legalPrefilled && <Alert tone="warning">{t("legalPrefilled")}</Alert>}

        <Field label={t("warrantyText")} htmlFor="warrantyText">
          <textarea id="warrantyText" name="warrantyText" rows={3} defaultValue={values.warrantyText} className={areaClass} />
        </Field>
        <Field label={t("parkingText")} htmlFor="parkingText">
          <textarea id="parkingText" name="parkingText" rows={3} defaultValue={values.parkingText} className={areaClass} />
        </Field>
        <Field label={t("scopeText")} htmlFor="scopeText">
          <textarea id="scopeText" name="scopeText" rows={3} defaultValue={values.scopeText} className={areaClass} />
        </Field>
      </section>

      {/* ── Правила работы ──────────────────────────────────────────────── */}
      <section className="border-linie bg-blatt mb-5 rounded-[3px] border p-4">
        <h2 className="mb-3 font-semibold">{t("rulesTitle")}</h2>

        <div className="grid gap-x-4 sm:grid-cols-3">
          <Field label={t("travelBuffer")} htmlFor="travelBufferMinutes" hint={t("travelBufferHint")}>
            <Input id="travelBufferMinutes" name="travelBufferMinutes" inputMode="numeric" defaultValue={values.travelBufferMinutes} />
          </Field>
          <Field label={t("minPhotosBefore")} htmlFor="minPhotosBefore">
            <Input id="minPhotosBefore" name="minPhotosBefore" inputMode="numeric" defaultValue={values.minPhotosBefore} />
          </Field>
          <Field label={t("minPhotosAfter")} htmlFor="minPhotosAfter" hint={t("minPhotosAfterHint")}>
            <Input id="minPhotosAfter" name="minPhotosAfter" inputMode="numeric" defaultValue={values.minPhotosAfter} />
          </Field>
        </div>
      </section>

      <Submit label={t("save")} />
    </form>
  );
}
