"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { saveOfferAction, sendOfferAction, type OfferState } from "@/app/(app)/angebote/actions";
import { PRICE_UNITS } from "@/lib/deals";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type CatalogOption = {
  id: string;
  name: string;
  unit: string;
  priceCents: number;
};

export type OfferLine = {
  description: string;
  qty: string;
  unit: string;
  price: string;
};

function Submit({ label, variant }: { label: string; variant?: "ghost" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {label}
    </Button>
  );
}

const cellClass =
  "border-linie bg-blatt w-full rounded-[3px] border px-2 py-1.5 text-[13px]";

/**
 * Конструктор Angebot.
 *
 * Позиции добавляются из каталога услуг или вводятся руками. Итоги считает
 * сервер: показывать клиенту сумму, посчитанную в браузере, и хранить
 * другую — верный способ получить расхождение в документе.
 */
export function OfferForm({
  dealId,
  catalog,
  offerId,
  initialLines,
  canEdit,
}: {
  dealId: string;
  catalog: CatalogOption[];
  offerId?: string;
  initialLines?: OfferLine[];
  canEdit: boolean;
}) {
  const t = useTranslations("offers");
  const [state, action] = useActionState<OfferState, FormData>(saveOfferAction, {});

  const [lines, setLines] = useState<OfferLine[]>(
    initialLines?.length
      ? initialLines
      : [{ description: "", qty: "1", unit: "PAUSCHALE", price: "" }],
  );

  const addLine = (preset?: CatalogOption) =>
    setLines((prev) => [
      ...prev,
      preset
        ? {
            description: preset.name,
            qty: "1",
            unit: preset.unit,
            price: (preset.priceCents / 100).toFixed(2).replace(".", ","),
          }
        : { description: "", qty: "1", unit: "PAUSCHALE", price: "" },
    ]);

  const removeLine = (index: number) =>
    setLines((prev) => prev.filter((_, i) => i !== index));

  if (!canEdit) {
    return <Alert tone="info">{t("cannotEdit")}</Alert>;
  }

  return (
    <form action={action}>
      <input type="hidden" name="dealId" value={dealId} />
      {offerId && <input type="hidden" name="offerId" value={offerId} />}

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <table className="mb-2 w-full text-[13px]">
        <thead>
          <tr className="text-text-2 text-left">
            <th className="pb-1 font-semibold">{t("description")}</th>
            <th className="w-20 pb-1 font-semibold">{t("qty")}</th>
            <th className="w-28 pb-1 font-semibold">{t("unit")}</th>
            <th className="w-28 pb-1 font-semibold">{t("unitPrice")}</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i}>
              <td className="pb-1 pr-2">
                <input
                  name="lineDescription"
                  defaultValue={line.description}
                  className={cellClass}
                  aria-label={t("description")}
                />
              </td>
              <td className="pb-1 pr-2">
                <input
                  name="lineQty"
                  defaultValue={line.qty}
                  inputMode="decimal"
                  className={cellClass}
                  aria-label={t("qty")}
                />
              </td>
              <td className="pb-1 pr-2">
                <select
                  name="lineUnit"
                  defaultValue={line.unit}
                  className={cellClass}
                  aria-label={t("unit")}
                >
                  {PRICE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {t(`units.${u}`)}
                    </option>
                  ))}
                </select>
              </td>
              <td className="pb-1 pr-2">
                <input
                  name="linePrice"
                  defaultValue={line.price}
                  inputMode="decimal"
                  className={cellClass}
                  aria-label={t("unitPrice")}
                />
              </td>
              <td className="pb-1">
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="text-text-2 hover:text-rot px-1"
                    aria-label={t("removeLine")}
                  >
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => addLine()}
          className="border-linie hover:bg-linie-2 rounded-[3px] border px-2 py-1 text-[13px]"
        >
          + {t("addLine")}
        </button>

        {catalog.length > 0 && (
          <select
            aria-label={t("fromCatalog")}
            defaultValue=""
            onChange={(e) => {
              const preset = catalog.find((c) => c.id === e.target.value);
              if (preset) addLine(preset);
              e.target.value = "";
            }}
            className="border-linie bg-blatt rounded-[3px] border px-2 py-1 text-[13px]"
          >
            <option value="">{t("fromCatalog")}</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="text-text-2 mb-3 text-xs">{t("totalsHint")}</p>

      <Submit label={t("saveDraft")} />
    </form>
  );
}

/** Отправка предложения клиенту. Правило 9.1 проверяется на сервере. */
export function SendOfferForm({ offerId }: { offerId: string }) {
  const t = useTranslations("offers");
  const [state, action] = useActionState<OfferState, FormData>(sendOfferAction, {});

  return (
    <form action={action}>
      <input type="hidden" name="offerId" value={offerId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Submit label={t("send")} />
      <p className="text-text-2 mt-1 text-xs">{t("sendHint")}</p>
    </form>
  );
}

/** Копирование текста для WhatsApp. */
export function CopyTextButton({ text }: { text: string }) {
  const t = useTranslations("offers");
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Буфер обмена недоступен без защищённого соединения — текст
          // всё равно виден на странице и его можно выделить руками.
          setCopied(false);
        }
      }}
      className="border-linie hover:bg-linie-2 rounded-[3px] border px-2.5 py-1 text-[13px]"
    >
      {copied ? t("copied") : t("copyText")}
    </button>
  );
}
