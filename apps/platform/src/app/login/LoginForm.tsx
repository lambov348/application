"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
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

export function LoginForm() {
  const t = useTranslations("login");
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  // Пароль верен, не хватает второго фактора — меняем вид формы.
  const secondStep = state.needsTotp === true;

  return (
    <form action={formAction} noValidate>
      {state.code === "totp_setup_required" ? (
        <Alert tone="warning">
          {t("errors.totp_setup_required")}{" "}
          <a href="/login/2fa-einrichten" className="text-blau underline">
            {t("setupLink")}
          </a>
        </Alert>
      ) : state.code && state.code !== "totp_required" ? (
        <Alert tone="error">{t(`errors.${state.code}`)}</Alert>
      ) : null}

      {secondStep && state.code === "totp_required" && (
        <Alert tone="info">{t("totpPrompt")}</Alert>
      )}

      <Field label={t("email")} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email ?? ""}
          readOnly={secondStep}
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

      {secondStep && (
        <>
          <Field
            label={t("totp")}
            htmlFor="totp"
            hint={t("totpHint")}
            error={state.code === "totp_invalid" ? t("errors.totp_invalid") : undefined}
          >
            <Input
              id="totp"
              name="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              // Поле кода — единственное, что нужно нажать, когда форма
              // перешла на второй шаг.
              autoFocus
            />
          </Field>

          <Field label={t("recoveryCode")} htmlFor="recoveryCode" hint={t("recoveryHint")}>
            <Input id="recoveryCode" name="recoveryCode" autoComplete="off" />
          </Field>
        </>
      )}

      <SubmitButton label={secondStep ? t("submitSecond") : t("submit")} />
    </form>
  );
}
