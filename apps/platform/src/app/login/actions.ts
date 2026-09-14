"use server";

import { CredentialsSignin } from "next-auth";
import { z } from "zod";
import { signIn, SIGNIN_ERRORS } from "@/auth";

export type LoginState = {
  /** Код ошибки из SIGNIN_ERRORS. Текст подбирает форма по словарю. */
  code?: string;
  /** Пароль верен, форма должна показать поле второго фактора. */
  needsTotp?: boolean;
  /** Сохраняем введённое, чтобы не заставлять набирать заново. */
  email?: string;
};

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  totp: z.string().optional(),
  recoveryCode: z.string().optional(),
});

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    totp: formData.get("totp") ?? undefined,
    recoveryCode: formData.get("recoveryCode") ?? undefined,
  });

  if (!parsed.success) {
    return { code: SIGNIN_ERRORS.INVALID_CREDENTIALS };
  }
  const { email, password, totp, recoveryCode } = parsed.data;

  try {
    // Перенаправление делает сам Auth.js: только на этом пути он выставляет
    // сессионную куку. С redirect:false вход проходит на сервере, но браузер
    // остаётся без сессии.
    //
    // Ведём на корень, а не сразу на рабочую страницу: корневая страница
    // разберёт роль и отправит владельца на /heute, монтажника на /m.
    // Иначе роль пришлось бы узнавать до входа.
    await signIn("credentials", {
      email,
      password,
      totp: totp ?? "",
      recoveryCode: recoveryCode ?? "",
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      const code = error.code ?? SIGNIN_ERRORS.INVALID_CREDENTIALS;
      return {
        code,
        email,
        needsTotp:
          code === SIGNIN_ERRORS.TOTP_REQUIRED ||
          code === SIGNIN_ERRORS.TOTP_INVALID,
      };
    }
    // Успешный вход тоже приходит сюда — как служебное исключение
    // перенаправления Next.js. Его обязательно пробрасываем дальше.
    throw error;
  }

  // Сюда исполнение не доходит: signIn либо перенаправляет, либо бросает.
  return {};
}
