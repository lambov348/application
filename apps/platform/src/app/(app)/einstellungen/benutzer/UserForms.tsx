"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import {
  createUserAction,
  updateUserAction,
  resetPasswordAction,
  resetTotpAction,
  type UserFormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const ROLES: Role[] = ["INHABER", "DISPONENT", "MONTEUR", "BUCHHALTUNG"];

function Submit({ label, variant }: { label: string; variant?: "danger" | "ghost" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {label}
    </Button>
  );
}

function Result({ state }: { state: UserFormState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

export function CreateUserForm() {
  const t = useTranslations("users");
  const [state, action] = useActionState<UserFormState, FormData>(
    createUserAction,
    {},
  );

  return (
    <form action={action} className="border-linie bg-blatt rounded-[3px] border p-4">
      <h2 className="mb-3 font-semibold">{t("createTitle")}</h2>
      <Result state={state} />

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t("name")} htmlFor="new-name">
          <Input id="new-name" name="name" required />
        </Field>
        <Field label={t("email")} htmlFor="new-email">
          <Input id="new-email" name="email" type="email" required />
        </Field>
        <Field label={t("phone")} htmlFor="new-phone">
          <Input id="new-phone" name="phone" type="tel" />
        </Field>
        <Field label={t("role")} htmlFor="new-role">
          <select
            id="new-role"
            name="role"
            defaultValue="MONTEUR"
            className="border-linie bg-blatt w-full rounded-[3px] border px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={t("password")} htmlFor="new-password" hint={t("passwordHint")}>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Submit label={t("create")} />
    </form>
  );
}

export function EditUserForm({
  user,
  isSelf,
}: {
  user: {
    id: string;
    name: string;
    phone: string | null;
    role: Role;
    active: boolean;
    twoFactorEnabled: boolean;
  };
  isSelf: boolean;
}) {
  const t = useTranslations("users");
  const [state, action] = useActionState<UserFormState, FormData>(
    updateUserAction,
    {},
  );
  const [pwState, pwAction] = useActionState<UserFormState, FormData>(
    resetPasswordAction,
    {},
  );
  const [totpState, totpAction] = useActionState<UserFormState, FormData>(
    resetTotpAction,
    {},
  );

  return (
    <div className="border-linie bg-beton/40 border-t p-4">
      <Result state={state} />
      <Result state={pwState} />
      <Result state={totpState} />

      <form action={action} className="mb-4">
        <input type="hidden" name="userId" value={user.id} />
        <div className="grid gap-x-4 sm:grid-cols-3">
          <Field label={t("name")} htmlFor={`name-${user.id}`}>
            <Input id={`name-${user.id}`} name="name" defaultValue={user.name} required />
          </Field>
          <Field label={t("phone")} htmlFor={`phone-${user.id}`}>
            <Input id={`phone-${user.id}`} name="phone" defaultValue={user.phone ?? ""} />
          </Field>
          <Field label={t("role")} htmlFor={`role-${user.id}`}>
            <select
              id={`role-${user.id}`}
              name="role"
              defaultValue={user.role}
              className="border-linie bg-blatt w-full rounded-[3px] border px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={user.active} />
          {t("activeLabel")}
        </label>

        <Submit label={t("save")} />
      </form>

      <div className="border-linie flex flex-wrap items-end gap-3 border-t pt-4">
        <form action={pwAction} className="flex items-end gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <Field label={t("newPassword")} htmlFor={`pw-${user.id}`} className="mb-0">
            <Input
              id={`pw-${user.id}`}
              name="password"
              type="password"
              autoComplete="new-password"
            />
          </Field>
          <Submit label={t("setPassword")} variant="ghost" />
        </form>

        {user.twoFactorEnabled && !isSelf && (
          <form action={totpAction}>
            <input type="hidden" name="userId" value={user.id} />
            <Submit label={t("resetTotp")} variant="danger" />
          </form>
        )}
      </div>
    </div>
  );
}
