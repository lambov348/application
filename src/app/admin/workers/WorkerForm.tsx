"use client";

import { useActionState, useEffect, useRef } from "react";
import { createWorker, WorkerFormState } from "./actions";
import SubmitButton from "@/components/SubmitButton";

const initialState: WorkerFormState = {};

type Labels = {
  addTitle: string;
  nameLabel: string;
  emailLabel: string;
  passwordLabel: string;
  passwordHint: string;
  addBtn: string;
};

// Форма добавления исполнителя. Сбрасывается после успешного создания.
export default function WorkerForm({ labels }: { labels: Labels }) {
  const [state, formAction] = useActionState(createWorker, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="card space-y-3 p-6">
      <h2 className="font-semibold text-gray-900">{labels.addTitle}</h2>
      {state.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </div>
      )}
      <div>
        <label className="label" htmlFor="name">
          {labels.nameLabel}
        </label>
        <input id="name" name="name" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="email">
          {labels.emailLabel}
        </label>
        <input id="email" name="email" type="email" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="password">
          {labels.passwordLabel}
        </label>
        <input
          id="password"
          name="password"
          type="text"
          className="input"
          placeholder={labels.passwordHint}
          required
        />
      </div>
      <SubmitButton className="btn-primary w-full">{labels.addBtn}</SubmitButton>
    </form>
  );
}
