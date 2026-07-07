"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createOrder, OrderFormState } from "./actions";
import SubmitButton from "@/components/SubmitButton";

const initialState: OrderFormState = {};

type Labels = {
  nameLabel: string;
  contactLabel: string;
  serviceLabel: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  addressLabel: string;
  dateLabel: string;
  photosLabel: string;
  photosHint: string;
  submit: string;
  submitting: string;
};

// Форма заявки клиента. Подписи приходят с сервера (перевод), валидация — на сервере.
export default function OrderForm({
  labels,
  services,
  preselected,
  backHome,
}: {
  labels: Labels;
  services: { slug: string; title: string }[];
  preselected?: string;
  backHome: string;
}) {
  const [state, formAction] = useActionState(createOrder, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {state.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="clientName">
            {labels.nameLabel}
          </label>
          <input id="clientName" name="clientName" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="clientContact">
            {labels.contactLabel}
          </label>
          <input
            id="clientContact"
            name="clientContact"
            className="input"
            placeholder="+49 …"
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="serviceType">
          {labels.serviceLabel}
        </label>
        <select
          id="serviceType"
          name="serviceType"
          className="input"
          defaultValue={preselected ?? services[0]?.slug}
          required
        >
          {services.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="description">
          {labels.descriptionLabel}
        </label>
        <textarea
          id="description"
          name="description"
          className="input min-h-[96px]"
          placeholder={labels.descriptionPlaceholder}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="address">
            {labels.addressLabel}
          </label>
          <input id="address" name="address" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="preferredDate">
            {labels.dateLabel}
          </label>
          <input
            id="preferredDate"
            name="preferredDate"
            type="datetime-local"
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="photos">
          {labels.photosLabel}
        </label>
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/*"
          multiple
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand"
        />
        <p className="mt-1 text-xs text-gray-400">{labels.photosHint}</p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← {backHome}
        </Link>
        <SubmitButton pendingText={labels.submitting}>{labels.submit}</SubmitButton>
      </div>
    </form>
  );
}
