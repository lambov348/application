"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { setupTotpAction, type SetupState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {label}
    </Button>
  );
}

export function SetupForm() {
  const t = useTranslations("twofactor");
  const [state, formAction] = useActionState<SetupState, FormData>(
    setupTotpAction,
    { step: "credentials" },
  );

  // Последний шаг: коды восстановления. Формы больше нет — только показ.
  if (state.step === "done") {
    return (
      <div>
        <Alert tone="success">{t("enabled")}</Alert>
        <p className="mb-2 text-sm font-semibold">{t("recoveryTitle")}</p>
        <p className="text-text-2 mb-3 text-xs">{t("recoveryWarning")}</p>
        <ul className="border-linie bg-beton mb-4 grid grid-cols-2 gap-1 rounded-[3px] border p-3 font-mono text-sm">
          {state.recoveryCodes?.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <a
          href="/login"
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          {t("toLogin")}
        </a>
      </div>
    );
  }

  const confirming = state.step === "confirm";

  return (
    <form action={formAction} noValidate>
      {state.error && (
        <Alert tone="error">{t(`errors.${state.error}`)}</Alert>
      )}

      {confirming && state.qrDataUrl && (
        <div className="mb-4">
          <p className="mb-2 text-sm">{t("scanHint")}</p>
          <div className="border-linie bg-blatt mb-2 flex justify-center rounded-[3px] border p-3">
            {/* Обычный img, а не next/image: адрес data: оптимизировать
                нечем, а компонент Next с таким источником не отрисовывается. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.qrDataUrl}
              alt={t("qrAlt")}
              width={220}
              height={220}
            />
          </div>
          <p className="text-text-2 text-xs">{t("manualHint")}</p>
          <p className="font-mono text-sm break-all">{state.secret}</p>
        </div>
      )}

      <Field label={t("email")} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email ?? ""}
          readOnly={confirming}
          required
        />
      </Field>

      <Field label={t("password")} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {confirming && (
        <Field label={t("code")} htmlFor="code" hint={t("codeHint")}>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            autoFocus
            required
          />
        </Field>
      )}

      <SubmitButton label={confirming ? t("confirm") : t("start")} />
    </form>
  );
}
