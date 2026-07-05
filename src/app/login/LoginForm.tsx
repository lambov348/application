"use client";

import { useActionState } from "react";
import { login, LoginState } from "./actions";
import SubmitButton from "@/components/SubmitButton";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {state.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
      </div>
      <SubmitButton className="btn-primary w-full" pendingText="Вход…">
        Войти
      </SubmitButton>
    </form>
  );
}
