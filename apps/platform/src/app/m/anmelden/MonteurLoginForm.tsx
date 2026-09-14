"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { loginAction, type LoginState } from "@/app/login/actions";

/**
 * Вход бригады. Форма намеренно простая: крупные поля под палец в перчатке,
 * одна кнопка, без лишних элементов.
 *
 * Форма работает и с выключенным JavaScript: Next отдаёт серверному действию
 * обычный адрес отправки, так что в подвале с обрывающейся связью вход
 * не зависит от того, догрузились ли скрипты.
 */
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blau w-full rounded-[3px] py-4 text-base font-semibold text-white disabled:opacity-60"
    >
      {label}
    </button>
  );
}

export function MonteurLoginForm() {
  const t = useTranslations("login");
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  const secondStep = state.needsTotp === true;

  return (
    <form action={formAction} noValidate>
      {state.code && state.code !== "totp_required" && (
        <p
          role="alert"
          className="border-rot/40 bg-rot/10 text-rot mb-4 rounded-[3px] border px-3 py-2.5 text-sm"
        >
          {t(`errors.${state.code}`)}
        </p>
      )}

      <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#C6CCCE]">
        {t("email")}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        defaultValue={state.email ?? ""}
        readOnly={secondStep}
        required
        className="mb-4 w-full rounded-[3px] border border-[#3A4247] bg-[#2A3034] px-3 py-3.5 text-base text-white"
      />

      <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-[#C6CCCE]">
        {t("password")}
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="mb-5 w-full rounded-[3px] border border-[#3A4247] bg-[#2A3034] px-3 py-3.5 text-base text-white"
      />

      {secondStep && (
        <>
          <label htmlFor="totp" className="mb-1.5 block text-sm font-semibold text-[#C6CCCE]">
            {t("totp")}
          </label>
          <input
            id="totp"
            name="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            autoFocus
            className="mb-5 w-full rounded-[3px] border border-[#3A4247] bg-[#2A3034] px-3 py-3.5 text-center text-xl tracking-[0.3em] text-white"
          />
        </>
      )}

      <SubmitButton label={secondStep ? t("submitSecond") : t("submit")} />
    </form>
  );
}
