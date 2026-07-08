import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import SubmitButton from "@/components/SubmitButton";
import { SOURCES, LANGUAGES, stageDef, serviceEmoji, labelOf, SERVICE_TYPES } from "@/lib/crm";
import { formatMoney } from "@/lib/format";
import { updateContact } from "../../actions";

export const dynamic = "force-dynamic";

function waLink(num?: string | null): string | null {
  if (!num) return null;
  const digits = num.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { deals: { orderBy: { updatedAt: "desc" } } },
  });
  if (!contact) notFound();
  const wa = waLink(contact.whatsapp ?? contact.phone);

  return (
    <div>
      <div className="mb-3 text-sm text-gray-500">
        <Link href="/crm/contacts" className="hover:text-brand">← Клиенты</Link>
      </div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">{contact.name}</h1>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
        <form action={updateContact} className="card h-fit space-y-3 p-4">
          <input type="hidden" name="id" value={contact.id} />
          <h2 className="font-semibold text-gray-900">Карточка клиента</h2>
          <div>
            <label className="label">Имя</label>
            <input name="name" defaultValue={contact.name} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Телефон</label>
              <input name="phone" defaultValue={contact.phone ?? ""} className="input" />
            </div>
            <div>
              <label className="label">WhatsApp</label>
              <input name="whatsapp" defaultValue={contact.whatsapp ?? ""} className="input" />
            </div>
          </div>
          {(contact.phone || wa) && (
            <div className="flex gap-3 text-sm">
              {contact.phone && <a href={`tel:${contact.phone}`} className="text-brand">📞 Позвонить</a>}
              {wa && <a href={wa} target="_blank" className="text-green-600">🟢 WhatsApp</a>}
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" defaultValue={contact.email ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Адрес объекта</label>
            <input name="address" defaultValue={contact.address ?? ""} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Язык</label>
              <select name="language" defaultValue={contact.language ?? ""} className="input">
                <option value="">—</option>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Источник</label>
              <select name="source" defaultValue={contact.source ?? ""} className="input">
                <option value="">—</option>
                {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Комментарий</label>
            <textarea name="comment" rows={3} defaultValue={contact.comment ?? ""} className="input" />
          </div>
          <SubmitButton pendingText="Сохранение…">Сохранить</SubmitButton>
        </form>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Сделки клиента</h2>
            <Link href={`/crm/deals/new?contactId=${contact.id}`} className="btn-primary !py-1.5">
              + Сделка
            </Link>
          </div>
          <div className="space-y-2">
            {contact.deals.map((d) => {
              const st = stageDef(d.stage);
              return (
                <Link
                  key={d.id}
                  href={`/crm/deals/${d.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-brand/50"
                >
                  <span className="font-medium text-gray-900">
                    {serviceEmoji(d.serviceType)} {d.title}
                    <span className="ml-2 text-xs text-gray-400">{labelOf(SERVICE_TYPES, d.serviceType)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    {d.amount != null && <span className="font-semibold">{formatMoney(d.amount)}</span>}
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: st.color }}>
                      {st.short}
                    </span>
                  </span>
                </Link>
              );
            })}
            {contact.deals.length === 0 && (
              <p className="text-sm text-gray-400">Сделок пока нет</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
