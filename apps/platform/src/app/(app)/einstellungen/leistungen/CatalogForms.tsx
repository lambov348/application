"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { saveCatalogItemAction, type FormState } from "./actions";
import { PRICE_UNITS, SERVICES } from "@/lib/deals";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export type CatalogItemValues = {
  id: string;
  name: string;
  unit: string;
  price: string;
  service: string | null;
  sort: number;
  active: boolean;
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {label}
    </Button>
  );
}

const selectClass =
  "border-linie bg-blatt w-full rounded-[3px] border px-3 py-2 text-sm";

export function CatalogItemForm({ item }: { item?: CatalogItemValues }) {
  const t = useTranslations("catalog");
  const tDeals = useTranslations("deals");
  const [state, action] = useActionState<FormState, FormData>(
    saveCatalogItemAction,
    {},
  );
  const id = item?.id ?? "neu";

  return (
    <div className={item ? "border-linie border-t p-4" : "border-linie bg-blatt rounded-[3px] border p-4"}>
      {!item && <h2 className="mb-3 font-semibold">{t("createTitle")}</h2>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <form action={action}>
        {item && <input type="hidden" name="itemId" value={item.id} />}

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label={t("name")} htmlFor={`name-${id}`}>
            <Input id={`name-${id}`} name="name" defaultValue={item?.name ?? ""} required />
          </Field>
          <Field label={t("service")} htmlFor={`service-${id}`} hint={t("serviceHint")}>
            <select id={`service-${id}`} name="service" defaultValue={item?.service ?? ""} className={selectClass}>
              <option value="">{t("noService")}</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {tDeals(`services_list.${s}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-3">
          <Field label={t("unit")} htmlFor={`unit-${id}`}>
            <select id={`unit-${id}`} name="unit" defaultValue={item?.unit ?? "PAUSCHALE"} className={selectClass}>
              {PRICE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`units.${u}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("price")} htmlFor={`price-${id}`} hint={t("priceHint")}>
            <Input id={`price-${id}`} name="price" inputMode="decimal" defaultValue={item?.price ?? ""} required />
          </Field>
          <Field label={t("sort")} htmlFor={`sort-${id}`}>
            <Input id={`sort-${id}`} name="sort" inputMode="numeric" defaultValue={item?.sort ?? 0} />
          </Field>
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={item?.active ?? true} />
          {t("active")}
        </label>

        <Submit label={item ? t("save") : t("create")} />
      </form>
    </div>
  );
}
