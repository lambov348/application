import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import SubmitButton from "@/components/SubmitButton";
import {
  STAGES,
  stageDef,
  SERVICE_TYPES,
  TEAMS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  AMOUNT_TYPES,
  PARKING,
  PARKING_RULE,
  serviceEmoji,
  labelOf,
  taskEmoji,
} from "@/lib/crm";
import {
  formatMoney,
  formatDateTime,
  toDateInput,
  toDatetimeLocal,
} from "@/lib/format";
import { updateDeal, addComment, addTask, toggleTask } from "../../actions";

export const dynamic = "force-dynamic";

function waLink(num?: string | null): string | null {
  if (!num) return null;
  const digits = num.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export default async function DealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dealId = Number(id);
  if (!Number.isInteger(dealId)) notFound();

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      contact: true,
      owner: { select: { name: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      crmTasks: { orderBy: [{ done: "asc" }, { dueAt: "asc" }] },
    },
  });
  if (!deal) notFound();

  const st = stageDef(deal.stage);
  const wa = waLink(deal.contact?.whatsapp ?? deal.contact?.phone);

  const channelLabel: Record<string, string> = {
    note: "Заметка",
    whatsapp: "WhatsApp",
    call: "Звонок",
    system: "Система",
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/crm" className="hover:text-brand">← Воронка</Link>
        <span>/</span>
        <span>Сделка №{deal.id}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
        <span
          className="rounded-full px-3 py-1 text-sm font-semibold text-white"
          style={{ backgroundColor: st.color }}
        >
          {st.label}
        </span>
        {deal.amount != null && (
          <span className="text-xl font-bold text-gray-900">{formatMoney(deal.amount)}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        {/* ЛЕВО: поля сделки */}
        <form action={updateDeal} className="card p-5">
          <input type="hidden" name="id" value={deal.id} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Название сделки" full>
              <input name="title" defaultValue={deal.title} className="input" />
            </Field>

            <Field label="Этап воронки">
              <select name="stage" defaultValue={deal.stage} className="input">
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Тип услуги">
              <select name="serviceType" defaultValue={deal.serviceType ?? ""} className="input">
                <option value="">—</option>
                {SERVICE_TYPES.map((s) => (
                  <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Сумма Angebot, €">
              <input name="amount" type="number" step="1" defaultValue={deal.amount ?? ""} className="input" />
            </Field>

            <Field label="Netto / Brutto">
              <select name="amountType" defaultValue={deal.amountType ?? ""} className="input">
                <option value="">—</option>
                {AMOUNT_TYPES.map((a) => (
                  <option key={a.key} value={a.key}>{a.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Желаемая дата">
              <input name="desiredDate" type="date" defaultValue={toDateInput(deal.desiredDate)} className="input" />
            </Field>

            <Field label="Согласованная дата и время">
              <input name="scheduledAt" type="datetime-local" defaultValue={toDatetimeLocal(deal.scheduledAt)} className="input" />
            </Field>

            <Field label="Команда">
              <select name="team" defaultValue={deal.team ?? ""} className="input">
                <option value="">—</option>
                {TEAMS.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Способ оплаты">
              <select name="paymentMethod" defaultValue={deal.paymentMethod ?? ""} className="input">
                <option value="">—</option>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Статус оплаты">
              <select name="paymentStatus" defaultValue={deal.paymentStatus} className="input">
                {PAYMENT_STATUS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Адрес работы">
              <input name="workAddress" defaultValue={deal.workAddress ?? ""} className="input" placeholder={deal.contact?.address ?? ""} />
            </Field>

            <Field label="Этаж">
              <input name="floor" defaultValue={deal.floor ?? ""} className="input" placeholder="EG, 3. OG…" />
            </Field>

            <Field label="Парковка у входа">
              <select name="parking" defaultValue={deal.parking ?? ""} className="input">
                <option value="">—</option>
                {PARKING.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Описание задачи (метраж, фото, что входит в цену)" full>
              <textarea name="description" defaultValue={deal.description ?? ""} rows={3} className="input" />
            </Field>

            <Field label="Условия объекта" full>
              <div className="flex flex-wrap gap-4 rounded-lg border border-gray-200 p-3 text-sm">
                <Check name="hasLift" label="Есть лифт" checked={deal.hasLift} />
                <Check name="needDismantle" label="Нужен демонтаж" checked={deal.needDismantle} />
                <Check name="needWaste" label="Вывоз мусора" checked={deal.needWaste} />
                <Check name="needConnect" label="Подключение воды/техники" checked={deal.needConnect} />
                <Check name="warranty1y" label="Гарантия 1 год" checked={deal.warranty1y} />
              </div>
            </Field>
          </div>

          <div className="mt-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            🅿️ <b>Парковка:</b> {PARKING_RULE}
          </div>

          <div className="mt-4">
            <SubmitButton pendingText="Сохранение…">Сохранить</SubmitButton>
          </div>
        </form>

        {/* ПРАВО: клиент, задачи, история */}
        <div className="flex flex-col gap-5">
          {/* Клиент */}
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Клиент</h2>
              {deal.contact && (
                <Link href={`/crm/contacts/${deal.contact.id}`} className="text-xs text-brand hover:underline">
                  открыть →
                </Link>
              )}
            </div>
            {deal.contact ? (
              <div className="space-y-1 text-sm">
                <div className="font-medium text-gray-900">{deal.contact.name}</div>
                {deal.contact.phone && (
                  <div><a href={`tel:${deal.contact.phone}`} className="text-brand">📞 {deal.contact.phone}</a></div>
                )}
                {wa && (
                  <div><a href={wa} target="_blank" className="text-green-600">🟢 WhatsApp</a></div>
                )}
                {deal.contact.email && (
                  <div><a href={`mailto:${deal.contact.email}`} className="text-brand">✉️ {deal.contact.email}</a></div>
                )}
                {deal.contact.address && <div className="text-gray-600">📍 {deal.contact.address}</div>}
                <div className="flex gap-2 pt-1 text-xs text-gray-500">
                  {deal.contact.language && <span>Язык: {deal.contact.language}</span>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Клиент не привязан</p>
            )}
            <div className="mt-2 text-xs text-gray-500">
              Ответственный: {deal.owner?.name ?? "—"}
            </div>
          </div>

          {/* Задачи */}
          <div className="card p-4">
            <h2 className="mb-2 font-semibold text-gray-900">Задачи</h2>
            <div className="space-y-1.5">
              {deal.crmTasks.length === 0 && (
                <p className="text-sm text-gray-400">Задач нет</p>
              )}
              {deal.crmTasks.map((t) => (
                <form key={t.id} action={toggleTask} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className={
                      "flex-none h-4 w-4 rounded border " +
                      (t.done ? "border-brand bg-brand text-white" : "border-gray-300 bg-white")
                    }
                    aria-label="Готово"
                  >
                    {t.done ? "✓" : ""}
                  </button>
                  <span className={"flex-1 text-sm " + (t.done ? "text-gray-400 line-through" : "text-gray-800")}>
                    {taskEmoji(t.kind)} {t.title}
                    {t.dueAt && (
                      <span className="ml-1 text-xs text-gray-400">· {formatDateTime(t.dueAt)}</span>
                    )}
                  </span>
                </form>
              ))}
            </div>
            <form action={addTask} className="mt-3 flex gap-2">
              <input type="hidden" name="dealId" value={deal.id} />
              <input name="title" placeholder="Новая задача…" className="input !py-1.5 text-sm" required />
              <input name="dueAt" type="date" className="input !w-auto !py-1.5 text-sm" />
              <SubmitButton className="btn-secondary !py-1.5" pendingText="…">+</SubmitButton>
            </form>
          </div>

          {/* История общения */}
          <div className="card p-4">
            <h2 className="mb-2 font-semibold text-gray-900">История общения</h2>
            <div className="mb-3 max-h-80 space-y-2 overflow-y-auto">
              {deal.comments.length === 0 && (
                <p className="text-sm text-gray-400">Пока пусто</p>
              )}
              {deal.comments.map((c) => (
                <div
                  key={c.id}
                  className={
                    "rounded-lg px-3 py-2 text-sm " +
                    (c.channel === "system"
                      ? "bg-gray-50 text-gray-500"
                      : c.channel === "whatsapp"
                      ? "bg-green-50 text-gray-800"
                      : "bg-blue-50 text-gray-800")
                  }
                >
                  <div className="mb-0.5 flex items-center gap-2 text-[11px] text-gray-400">
                    <span>{channelLabel[c.channel] ?? c.channel}</span>
                    <span>·</span>
                    <span>{formatDateTime(c.createdAt)}</span>
                    {c.author?.name && <span>· {c.author.name}</span>}
                  </div>
                  <div className="whitespace-pre-wrap">{c.body}</div>
                </div>
              ))}
            </div>
            <form action={addComment} className="space-y-2">
              <input type="hidden" name="dealId" value={deal.id} />
              <textarea name="body" rows={2} placeholder="Комментарий или вставьте сообщение из WhatsApp…" className="input text-sm" required />
              <div className="flex items-center gap-2">
                <select name="channel" defaultValue="note" className="input !w-auto !py-1.5 text-sm">
                  <option value="note">Заметка</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="call">Звонок</option>
                </select>
                <SubmitButton className="btn-primary !py-1.5" pendingText="…">Добавить</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="inline-flex items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 rounded border-gray-300 text-brand" />
      <span>{label}</span>
    </label>
  );
}
