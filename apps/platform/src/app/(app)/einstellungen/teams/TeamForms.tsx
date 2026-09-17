"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { saveTeamAction, toggleTeamAction, type FormState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export type TeamValues = {
  id: string;
  name: string;
  color: string;
  sort: number;
  active: boolean;
  memberIds: string[];
};

export type UserOption = { id: string; name: string; role: string };

function Submit({ label, variant }: { label: string; variant?: "ghost" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {label}
    </Button>
  );
}

function Result({ state }: { state: FormState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

export function TeamForm({
  team,
  users,
}: {
  team?: TeamValues;
  users: UserOption[];
}) {
  const t = useTranslations("teams");
  const [state, action] = useActionState<FormState, FormData>(saveTeamAction, {});
  const [toggleState, toggleAction] = useActionState<FormState, FormData>(
    toggleTeamAction,
    {},
  );

  const id = team?.id ?? "neu";

  return (
    <div className={team ? "border-linie border-t p-4" : "border-linie bg-blatt rounded-[3px] border p-4"}>
      {!team && <h2 className="mb-3 font-semibold">{t("createTitle")}</h2>}
      <Result state={state} />
      <Result state={toggleState} />

      <form action={action}>
        {team && <input type="hidden" name="teamId" value={team.id} />}

        <div className="grid gap-x-4 sm:grid-cols-3">
          <Field label={t("name")} htmlFor={`name-${id}`} hint={t("nameHint")}>
            <Input id={`name-${id}`} name="name" defaultValue={team?.name ?? ""} required />
          </Field>

          <Field label={t("color")} htmlFor={`color-${id}`} hint={t("colorHint")}>
            <input
              id={`color-${id}`}
              name="color"
              type="color"
              defaultValue={team?.color ?? "#1A4F7A"}
              className="border-linie h-[38px] w-full rounded-[3px] border px-1"
            />
          </Field>

          <Field label={t("sort")} htmlFor={`sort-${id}`} hint={t("sortHint")}>
            <Input
              id={`sort-${id}`}
              name="sort"
              inputMode="numeric"
              defaultValue={team?.sort ?? 0}
            />
          </Field>
        </div>

        <fieldset className="mb-4">
          <legend className="mb-1 block text-[13px] font-semibold">
            {t("members")}
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="members"
                  value={u.id}
                  defaultChecked={team?.memberIds.includes(u.id)}
                />
                {u.name}
                <span className="text-text-2 text-xs">{t(`roles.${u.role}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={team?.active ?? true} />
          {t("active")}
        </label>

        <Submit label={team ? t("save") : t("create")} />
      </form>

      {team && (
        <form action={toggleAction} className="border-linie mt-3 border-t pt-3">
          <input type="hidden" name="teamId" value={team.id} />
          <Submit label={team.active ? t("deactivate") : t("activate")} variant="ghost" />
          <p className="text-text-2 mt-1 text-xs">{t("deactivateHint")}</p>
        </form>
      )}
    </div>
  );
}
