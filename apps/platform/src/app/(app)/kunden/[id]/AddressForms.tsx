"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  saveAddressAction,
  deleteAddressAction,
  archiveCustomerAction,
  anonymizeCustomerAction,
  type FormState,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export type AddressValues = {
  id: string;
  label: string | null;
  street: string;
  zip: string;
  city: string;
  floor: string | null;
  elevator: boolean;
  parkingNote: string | null;
};

function Submit({
  label,
  variant,
  size = "sm",
}: {
  label: string;
  variant?: "danger" | "ghost" | "quiet";
  size?: "sm" | "default";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size={size} variant={variant} disabled={pending}>
      {label}
    </Button>
  );
}

function Result({ state }: { state: FormState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

export function AddressForm({
  customerId,
  address,
}: {
  customerId: string;
  address?: AddressValues;
}) {
  const t = useTranslations("customers");
  const [state, action] = useActionState<FormState, FormData>(saveAddressAction, {});
  const [delState, delAction] = useActionState<FormState, FormData>(
    deleteAddressAction,
    {},
  );

  return (
    <div className="border-linie border-t p-4">
      <Result state={state} />
      <Result state={delState} />

      <form action={action}>
        <input type="hidden" name="customerId" value={customerId} />
        {address && <input type="hidden" name="addressId" value={address.id} />}

        <div className="grid gap-x-4 sm:grid-cols-4">
          <Field label={t("addressLabel")} htmlFor={`label-${address?.id ?? "neu"}`}>
            <Input
              id={`label-${address?.id ?? "neu"}`}
              name="label"
              defaultValue={address?.label ?? ""}
              placeholder={t("addressLabelHint")}
            />
          </Field>
          <Field
            label={t("street")}
            htmlFor={`street-${address?.id ?? "neu"}`}
            className="sm:col-span-3"
          >
            <Input
              id={`street-${address?.id ?? "neu"}`}
              name="street"
              defaultValue={address?.street ?? ""}
              required
            />
          </Field>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-4">
          <Field label={t("zip")} htmlFor={`zip-${address?.id ?? "neu"}`}>
            <Input
              id={`zip-${address?.id ?? "neu"}`}
              name="zip"
              inputMode="numeric"
              defaultValue={address?.zip ?? ""}
              required
            />
          </Field>
          <Field
            label={t("city")}
            htmlFor={`city-${address?.id ?? "neu"}`}
            className="sm:col-span-2"
          >
            <Input
              id={`city-${address?.id ?? "neu"}`}
              name="city"
              defaultValue={address?.city ?? ""}
              required
            />
          </Field>
          <Field
            label={t("floor")}
            htmlFor={`floor-${address?.id ?? "neu"}`}
            hint={t("floorHint")}
          >
            <Input
              id={`floor-${address?.id ?? "neu"}`}
              name="floor"
              defaultValue={address?.floor ?? ""}
            />
          </Field>
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" name="elevator" defaultChecked={address?.elevator} />
          {t("elevator")}
        </label>

        <Field
          label={t("parking")}
          htmlFor={`parking-${address?.id ?? "neu"}`}
          hint={t("parkingHint")}
        >
          <Input
            id={`parking-${address?.id ?? "neu"}`}
            name="parkingNote"
            defaultValue={address?.parkingNote ?? ""}
          />
        </Field>

        <div className="flex gap-2">
          <Submit label={address ? t("save") : t("addAddress")} />
        </div>
      </form>

      {address && (
        <form action={delAction} className="mt-3">
          <input type="hidden" name="addressId" value={address.id} />
          <Submit label={t("deleteAddress")} variant="quiet" />
        </form>
      )}
    </div>
  );
}

/** Архивирование и удаление персональных данных. */
export function DangerZone({
  customerId,
  archived,
  anonymized,
  canAnonymize,
}: {
  customerId: string;
  archived: boolean;
  anonymized: boolean;
  canAnonymize: boolean;
}) {
  const t = useTranslations("customers");
  const [archState, archAction] = useActionState<FormState, FormData>(
    archiveCustomerAction,
    {},
  );
  const [anonState, anonAction] = useActionState<FormState, FormData>(
    anonymizeCustomerAction,
    {},
  );

  if (anonymized) {
    return (
      <Alert tone="info">{t("alreadyAnonymized")}</Alert>
    );
  }

  return (
    <div className="border-linie bg-blatt rounded-[3px] border p-4">
      <h2 className="mb-1 font-semibold">{t("dataTitle")}</h2>
      <p className="text-text-2 mb-4 text-xs">{t("dataHint")}</p>

      <Result state={archState} />
      <Result state={anonState} />

      <form action={archAction} className="mb-5">
        <input type="hidden" name="customerId" value={customerId} />
        {archived && <input type="hidden" name="restore" value="true" />}
        <Submit
          label={archived ? t("restore") : t("archive")}
          variant="ghost"
        />
        <p className="text-text-2 mt-1 text-xs">
          {archived ? t("restoreHint") : t("archiveHint")}
        </p>
      </form>

      {canAnonymize && (
        <form action={anonAction} className="border-rot/30 border-t pt-4">
          <input type="hidden" name="customerId" value={customerId} />
          <p className="text-rot mb-2 text-sm font-semibold">{t("anonymize")}</p>
          <p className="text-text-2 mb-3 text-xs">{t("anonymizeHint")}</p>
          <div className="flex items-end gap-2">
            <Field
              label={t("confirmLabel")}
              htmlFor="confirm"
              className="mb-0"
            >
              <Input id="confirm" name="confirm" placeholder="LÖSCHEN" />
            </Field>
            <Submit label={t("anonymizeButton")} variant="danger" />
          </div>
        </form>
      )}
    </div>
  );
}
