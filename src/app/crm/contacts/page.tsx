import Link from "next/link";
import { prisma } from "@/lib/db";
import SubmitButton from "@/components/SubmitButton";
import { SOURCES, LANGUAGES, labelOf } from "@/lib/crm";
import { saveContactForm } from "../actions";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { deals: true } } },
    take: 500,
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-gray-900">Клиенты</h1>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-2.5">Имя</th>
                <th className="px-4 py-2.5">Телефон</th>
                <th className="px-4 py-2.5">Источник</th>
                <th className="px-4 py-2.5">Сделок</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/crm/contacts/${c.id}`} className="font-medium text-gray-900 hover:text-brand">
                      {c.name}
                    </Link>
                    {c.language && <span className="ml-2 text-xs text-gray-400">{c.language}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{c.phone ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{labelOf(SOURCES, c.source)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{c._count.deals}</td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Пока нет клиентов</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={saveContactForm} className="card h-fit space-y-3 p-4">
          <h2 className="font-semibold text-gray-900">Новый клиент</h2>
          <input name="name" className="input" placeholder="Имя клиента *" required />
          <input name="phone" className="input" placeholder="Телефон" />
          <input name="whatsapp" className="input" placeholder="WhatsApp" />
          <input name="email" type="email" className="input" placeholder="Email" />
          <input name="address" className="input" placeholder="Адрес объекта" />
          <div className="grid grid-cols-2 gap-2">
            <select name="language" className="input" defaultValue="">
              <option value="">Язык</option>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select name="source" className="input" defaultValue="">
              <option value="">Источник</option>
              {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <textarea name="comment" rows={2} className="input" placeholder="Комментарий" />
          <SubmitButton pendingText="Сохранение…">Добавить клиента</SubmitButton>
        </form>
      </div>
    </div>
  );
}
