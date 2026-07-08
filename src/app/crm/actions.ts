"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, getSession } from "@/lib/auth";
import {
  DEFAULT_PIPELINE,
  isPipeline,
  isStage,
  stageDef,
  STAGE_AUTOMATIONS,
} from "@/lib/crm";

// ── helpers ──────────────────────────────────────────────
function str(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function bool(fd: FormData, k: string): boolean {
  return fd.get(k) != null && fd.get(k) !== "false";
}
function money(fd: FormData, k: string): number | null {
  const s = str(fd, k);
  if (!s) return null;
  const n = Number(s.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function dateVal(fd: FormData, k: string): Date | null {
  const s = str(fd, k);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Создаёт задачу-автоматизацию при переходе на этап (если ещё не создана).
async function runStageAutomation(dealId: number, stage: string) {
  const rule = STAGE_AUTOMATIONS[stage];
  if (!rule) return;
  const exists = await prisma.crmTask.findFirst({
    where: { dealId, title: rule.title, done: false },
  });
  if (exists) return;
  const due = new Date();
  due.setDate(due.getDate() + rule.offsetDays);
  due.setHours(18, 0, 0, 0);
  await prisma.crmTask.create({
    data: { dealId, title: rule.title, kind: rule.kind, dueAt: due },
  });
}

// ── Клиенты ──────────────────────────────────────────────
export async function createContact(fd: FormData): Promise<string> {
  await requireUser();
  const name = str(fd, "name");
  if (!name) return "";
  const c = await prisma.contact.create({
    data: {
      name,
      phone: str(fd, "phone"),
      whatsapp: str(fd, "whatsapp"),
      email: str(fd, "email"),
      address: str(fd, "address"),
      language: str(fd, "language"),
      source: str(fd, "source"),
      comment: str(fd, "comment"),
    },
  });
  revalidatePath("/crm/contacts");
  return c.id;
}

export async function saveContactForm(fd: FormData) {
  const id = await createContact(fd);
  if (id) redirect(`/crm/contacts/${id}`);
  redirect("/crm/contacts");
}

export async function updateContact(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  if (!id) return;
  await prisma.contact.update({
    where: { id },
    data: {
      name: str(fd, "name") ?? "Без имени",
      phone: str(fd, "phone"),
      whatsapp: str(fd, "whatsapp"),
      email: str(fd, "email"),
      address: str(fd, "address"),
      language: str(fd, "language"),
      source: str(fd, "source"),
      comment: str(fd, "comment"),
    },
  });
  revalidatePath(`/crm/contacts/${id}`);
  revalidatePath("/crm/contacts");
}

// ── Сделки ───────────────────────────────────────────────
export async function createDeal(fd: FormData) {
  const user = await requireUser();

  // Клиент: либо выбран существующий, либо создаётся быстрый новый.
  let contactId = str(fd, "contactId");
  const quickName = str(fd, "clientName");
  if (!contactId && quickName) {
    const c = await prisma.contact.create({
      data: {
        name: quickName,
        phone: str(fd, "clientPhone"),
        whatsapp: str(fd, "clientWhatsapp"),
        source: str(fd, "source"),
        language: str(fd, "language"),
        address: str(fd, "workAddress"),
      },
    });
    contactId = c.id;
  }

  const pipeline = str(fd, "pipeline");
  const title =
    str(fd, "title") ||
    quickName ||
    (contactId ? "Новая сделка" : "Новая сделка");

  const deal = await prisma.deal.create({
    data: {
      title: title!,
      pipeline: pipeline && isPipeline(pipeline) ? pipeline : DEFAULT_PIPELINE,
      stage: "new",
      contactId: contactId ?? undefined,
      serviceType: str(fd, "serviceType"),
      description: str(fd, "description"),
      amount: money(fd, "amount"),
      desiredDate: dateVal(fd, "desiredDate"),
      workAddress: str(fd, "workAddress"),
      ownerId: user.id,
      comments: {
        create: { channel: "system", body: "Сделка создана", authorId: user.id },
      },
    },
  });

  await runStageAutomation(deal.id, "new");
  revalidatePath("/crm");
  redirect(`/crm/deals/${deal.id}`);
}

export async function updateDeal(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return;

  const current = await prisma.deal.findUnique({ where: { id } });
  if (!current) return;

  const newStage = str(fd, "stage");
  const stageChanged = newStage && isStage(newStage) && newStage !== current.stage;

  await prisma.deal.update({
    where: { id },
    data: {
      title: str(fd, "title") ?? current.title,
      stage: newStage && isStage(newStage) ? newStage : current.stage,
      serviceType: str(fd, "serviceType"),
      description: str(fd, "description"),
      workAddress: str(fd, "workAddress"),
      desiredDate: dateVal(fd, "desiredDate"),
      scheduledAt: dateVal(fd, "scheduledAt"),
      amount: money(fd, "amount"),
      amountType: str(fd, "amountType"),
      paymentMethod: str(fd, "paymentMethod"),
      team: str(fd, "team"),
      parking: str(fd, "parking"),
      floor: str(fd, "floor"),
      hasLift: bool(fd, "hasLift"),
      needDismantle: bool(fd, "needDismantle"),
      needWaste: bool(fd, "needWaste"),
      needConnect: bool(fd, "needConnect"),
      paymentStatus: str(fd, "paymentStatus") ?? current.paymentStatus,
      warranty1y: bool(fd, "warranty1y"),
    },
  });

  if (stageChanged) {
    await prisma.dealComment.create({
      data: {
        dealId: id,
        channel: "system",
        authorId: user.id,
        body: `Этап: ${stageDef(current.stage).label} → ${stageDef(newStage!).label}`,
      },
    });
    await runStageAutomation(id, newStage!);
  }

  revalidatePath(`/crm/deals/${id}`);
  revalidatePath("/crm");
}

// Перетаскивание карточки в другую колонку (вызывается из клиентского канбана).
export async function moveDeal(dealId: number, stage: string) {
  const user = await requireUser();
  if (!isStage(stage)) return;
  const current = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!current || current.stage === stage) return;

  await prisma.deal.update({ where: { id: dealId }, data: { stage } });
  await prisma.dealComment.create({
    data: {
      dealId,
      channel: "system",
      authorId: user.id,
      body: `Этап: ${stageDef(current.stage).label} → ${stageDef(stage).label}`,
    },
  });
  await runStageAutomation(dealId, stage);
  revalidatePath("/crm");
  revalidatePath(`/crm/deals/${dealId}`);
}

export async function assignContact(fd: FormData) {
  await requireUser();
  const id = Number(fd.get("id"));
  const contactId = str(fd, "contactId");
  if (!Number.isInteger(id)) return;
  await prisma.deal.update({
    where: { id },
    data: { contactId: contactId ?? null },
  });
  revalidatePath(`/crm/deals/${id}`);
}

// ── Комментарии / история ────────────────────────────────
export async function addComment(fd: FormData) {
  const user = await getSession();
  const dealId = Number(fd.get("dealId"));
  const body = str(fd, "body");
  const channel = str(fd, "channel") ?? "note";
  if (!Number.isInteger(dealId) || !body) return;
  await prisma.dealComment.create({
    data: { dealId, body, channel, authorId: user?.id ?? null },
  });
  revalidatePath(`/crm/deals/${dealId}`);
}

// ── Задачи ───────────────────────────────────────────────
export async function addTask(fd: FormData) {
  await requireUser();
  const dealId = fd.get("dealId") ? Number(fd.get("dealId")) : null;
  const title = str(fd, "title");
  if (!title) return;
  await prisma.crmTask.create({
    data: {
      dealId: dealId && Number.isInteger(dealId) ? dealId : null,
      title,
      kind: str(fd, "kind") ?? "todo",
      dueAt: dateVal(fd, "dueAt"),
    },
  });
  if (dealId) revalidatePath(`/crm/deals/${dealId}`);
  revalidatePath("/crm/today");
}

export async function toggleTask(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  if (!id) return;
  const t = await prisma.crmTask.findUnique({ where: { id } });
  if (!t) return;
  await prisma.crmTask.update({ where: { id }, data: { done: !t.done } });
  if (t.dealId) revalidatePath(`/crm/deals/${t.dealId}`);
  revalidatePath("/crm/today");
}
