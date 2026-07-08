import Link from "next/link";
import { prisma } from "@/lib/db";
import SubmitButton from "@/components/SubmitButton";
import {
  PIPELINES,
  DEFAULT_PIPELINE,
  isPipeline,
  SERVICE_TYPES,
  SOURCES,
  LANGUAGES,
} from "@/lib/crm";
import { createDeal } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string; contactId?: string }>;
}) {
  const sp = await searchParams;
  const pipeline =
    sp.pipeline && isPipeline(sp.pipeline) ? sp.pipeline : DEFAULT_PIPELINE;

  const contacts = await prisma.contact.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true },
    take: 500,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 text-sm text-gray-500">
        <Link href="/crm" className="hover:text-brand">← Воронка</Link>
      </div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Новая сделка</h1>

      <form action={createDeal} className="card space-y-4 p-5">
        <div>
          <label className="label">Направление (воронка)</label>
          <select name="pipeline" defaultValue={pipeline} className="input">
            {PIPELINES.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Название сделки</label>
          <input name="title" className="input" placeholder="Напр. Кухня — Müller, Wedding" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Тип услуги</label>
            <select name="serviceType" className="input" defaultValue="">
              <option value="">—</option>
              {SERVICE_TYPES.map((s) => (
                <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Сумма Angebot, €</label>
            <input name="amount" type="number" step="1" className="input" />
          </div>
          <div>
            <label className="label">Желаемая дата</label>
            <input name="desiredDate" type="date" className="input" />
          </div>
          <div>
            <label className="label">Адрес работы</label>
            <input name="workAddress" className="input" />
          </div>
        </div>

        <div>
          <label className="label">Описание задачи</label>
          <textarea name="description" rows={2} className="input" placeholder="Что нужно сделать, метраж кухни, есть ли фото…" />
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-3">
            <label className="label">Существующий клиент</label>
            <select name="contactId" className="input" defaultValue={sp.contactId ?? ""}>
              <option value="">— новый клиент (заполните ниже) —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.phone ? ` · ${c.phone}` : ""}
                </option>
              ))}
            </select>
          </div>
          <p className="mb-2 text-xs text-gray-500">Или быстро создайте нового клиента:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input name="clientName" className="input" placeholder="Имя клиента" />
            <input name="clientPhone" className="input" placeholder="Телефон" />
            <input name="clientWhatsapp" className="input" placeholder="WhatsApp" />
            <select name="language" className="input" defaultValue="">
              <option value="">Язык клиента</option>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select name="source" className="input sm:col-span-2" defaultValue="">
              <option value="">Источник заявки</option>
              {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <SubmitButton pendingText="Создание…">Создать сделку</SubmitButton>
          <Link href="/crm" className="btn-secondary">Отмена</Link>
        </div>
      </form>
    </div>
  );
}
