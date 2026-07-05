"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createOrder, OrderFormState } from "./actions";
import { SERVICE_TYPES } from "@/lib/constants";
import SubmitButton from "@/components/SubmitButton";

const initialState: OrderFormState = {};

// Форма заявки клиента. Валидация дублируется на сервере (см. actions.ts).
export default function OrderForm({ preselected }: { preselected?: string }) {
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
            Ваше имя *
          </label>
          <input id="clientName" name="clientName" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="clientContact">
            Телефон или контакт *
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
          Тип услуги *
        </label>
        <select
          id="serviceType"
          name="serviceType"
          className="input"
          defaultValue={preselected ?? SERVICE_TYPES[0]}
          required
        >
          {SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Описание задачи *
        </label>
        <textarea
          id="description"
          name="description"
          className="input min-h-[96px]"
          placeholder="Что нужно сделать, сколько предметов, есть ли лифт и т.д."
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="address">
            Адрес *
          </label>
          <input id="address" name="address" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="preferredDate">
            Желаемые дата и время
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
          Фото (по желанию)
        </label>
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/*"
          multiple
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand"
        />
        <p className="mt-1 text-xs text-gray-400">
          Можно прикрепить несколько фото (до 8 МБ каждое).
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← На главную
        </Link>
        <SubmitButton>Отправить заявку</SubmitButton>
      </div>
    </form>
  );
}
