"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type {
  DealStatus,
  LeadSource,
  LostReason,
  ServiceType,
} from "@prisma/client";
import { db } from "@/lib/db";
import { SERVICES, SOURCES, CHECKLIST_KEYS } from "@/lib/deals";
import { parseAmountToCents, VAT_19 } from "@/lib/money";
import { requireRole, assertCanSetPrice, canSeePrices } from "@/server/auth/guards";
import { logActivity, diffOf } from "@/server/activity";
import {
  checkTransition,
  statusSideEffects,
  ALL_STATUSES,
  LOST_REASONS,
} from "@/server/rules/deal-status";

export type FormState = { error?: string; success?: string };

// ─── Создание заявки ────────────────────────────────────────────────────────

const createSchema = z.object({
  customerId: z.string().min(1, "Kunde fehlt"),
  addressId: z.string().optional(),
  title: z.string().trim().min(3, "Kurzbeschreibung fehlt").max(200),
  // Источник обязателен по главе 5.2: без него не посчитать, какой канал
  // приносит деньги, а это одна из четырёх целей платформы.
  source: z.enum(SOURCES as [LeadSource, ...LeadSource[]], {
    message: "Quelle der Anfrage muss angegeben werden",
  }),
  services: z.array(z.enum(SERVICES as [ServiceType, ...ServiceType[]])).default([]),
  notes: z.string().trim().max(5000).optional(),
});

export async function createDealAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER", "DISPONENT");

  const parsed = createSchema.safeParse({
    customerId: formData.get("customerId"),
    addressId: formData.get("addressId") || undefined,
    title: formData.get("title"),
    source: formData.get("source"),
    services: formData.getAll("services"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }
  const d = parsed.data;

  const customer = await db.customer.findUnique({
    where: { id: d.customerId },
    select: { id: true, deletedAt: true },
  });
  if (!customer || customer.deletedAt) {
    return { error: "Kunde nicht gefunden" };
  }

  const settings = await db.settings.findUnique({ where: { id: 1 } });

  const deal = await db.deal.create({
    data: {
      customerId: d.customerId,
      addressId: d.addressId || null,
      title: d.title,
      source: d.source,
      services: d.services as ServiceType[],
      notes: d.notes || null,
      vatRateBp: settings?.defaultVatRateBp ?? VAT_19,
    },
  });

  await logActivity({
    entity: "Deal",
    entityId: deal.id,
    action: "deal.created",
    userId: actor.id,
    diff: { title: [null, d.title], source: [null, d.source] },
  });

  revalidatePath("/anfragen");
  redirect(`/anfragen/${deal.id}`);
}

// ─── Перевод между колонками ────────────────────────────────────────────────

const moveSchema = z.object({
  dealId: z.string().min(1),
  status: z.enum(ALL_STATUSES as [DealStatus, ...DealStatus[]]),
  lostReason: z.enum(LOST_REASONS as [LostReason, ...LostReason[]]).optional(),
  lostNote: z.string().trim().max(1000).optional(),
});

export async function moveDealAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER", "DISPONENT");

  const parsed = moveSchema.safeParse({
    dealId: formData.get("dealId"),
    status: formData.get("status"),
    lostReason: formData.get("lostReason") || undefined,
    lostNote: formData.get("lostNote") || undefined,
  });
  if (!parsed.success) return { error: "Eingabe ungültig" };
  const { dealId, status, lostReason, lostNote } = parsed.data;

  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      status: true,
      addressId: true,
      customer: { select: { lastName: true, company: true } },
    },
  });
  if (!deal) return { error: "Anfrage nicht gefunden" };
  if (deal.status === status) return { success: "Keine Änderung" };

  // Здесь применяются правила 9.3, 9.4 и 9.7 главы ТЗ.
  const denied = await checkTransition(deal, status, { lostReason });
  if (denied) return { error: denied.message };

  const effects = statusSideEffects(status, { lostReason, lostNote });

  await db.$transaction(async (tx) => {
    await tx.deal.update({ where: { id: dealId }, data: effects });
    await tx.activityLog.create({
      data: {
        entity: "Deal",
        entityId: dealId,
        userId: actor.id,
        action: "deal.status_changed",
        diff: {
          status: [deal.status, status],
          ...(effects.lostReason ? { grund: [null, effects.lostReason] } : {}),
        },
      },
    });
  });

  revalidatePath("/anfragen");
  revalidatePath(`/anfragen/${dealId}`);
  return { success: "Status geändert" };
}

// ─── Цена ───────────────────────────────────────────────────────────────────

/**
 * Установка и изменение цены.
 *
 * Жёсткое требование главы 4 ТЗ: это может делать только владелец. Проверка
 * стоит в одном месте — assertCanSetPrice — и падает исключением, а не
 * молчаливым отказом.
 *
 * Одновременно с ценой ставится признак «цена подтверждена владельцем»
 * (глава 5.2). Он нужен правилу 9.1: без него Angebot не уйдёт клиенту.
 */
export async function setPriceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER", "DISPONENT");
  // Диспетчер сюда не пройдёт: бросится ForbiddenError.
  assertCanSetPrice(actor);

  const dealId = String(formData.get("dealId") ?? "");
  const raw = String(formData.get("priceNet") ?? "").trim();

  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: { id: true, priceNetCents: true, priceApproved: true, vatRateBp: true },
  });
  if (!deal) return { error: "Anfrage nicht gefunden" };

  // Пустое поле — снятие цены, а не ноль евро.
  let priceNetCents: number | null = null;
  if (raw !== "") {
    priceNetCents = parseAmountToCents(raw);
    if (priceNetCents === null) {
      return { error: `„${raw}“ ist kein gültiger Betrag` };
    }
    if (priceNetCents < 0) {
      return { error: "Der Preis darf nicht negativ sein" };
    }
  }

  const approved = priceNetCents !== null;

  await db.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: {
        priceNetCents,
        priceApproved: approved,
        priceApprovedAt: approved ? new Date() : null,
        priceApprovedById: approved ? actor.id : null,
      },
    });
    await tx.activityLog.create({
      data: {
        entity: "Deal",
        entityId: dealId,
        userId: actor.id,
        action: "deal.price_set",
        diff: { priceNetCents: [deal.priceNetCents, priceNetCents] },
      },
    });
  });

  revalidatePath(`/anfragen/${dealId}`);
  revalidatePath("/anfragen");
  return { success: approved ? "Preis gesetzt und freigegeben" : "Preis entfernt" };
}

// ─── Остальные поля заявки ──────────────────────────────────────────────────

const updateSchema = z.object({
  dealId: z.string().min(1),
  title: z.string().trim().min(3).max(200),
  addressId: z.string().optional(),
  source: z.enum(SOURCES as [LeadSource, ...LeadSource[]]),
  services: z.array(z.enum(SERVICES as [ServiceType, ...ServiceType[]])).default([]),
  estHours: z.string().trim().optional(),
  estMonteure: z.string().trim().optional(),
  notes: z.string().trim().max(5000).optional(),
});

export async function updateDealAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER", "DISPONENT");

  const parsed = updateSchema.safeParse({
    dealId: formData.get("dealId"),
    title: formData.get("title"),
    addressId: formData.get("addressId") || undefined,
    source: formData.get("source"),
    services: formData.getAll("services"),
    estHours: formData.get("estHours") ?? undefined,
    estMonteure: formData.get("estMonteure") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }
  const d = parsed.data;

  const before = await db.deal.findUnique({ where: { id: d.dealId } });
  if (!before) return { error: "Anfrage nicht gefunden" };

  const hours = d.estHours ? Number(d.estHours.replace(",", ".")) : null;
  if (hours !== null && (!Number.isFinite(hours) || hours < 0)) {
    return { error: "Geschätzte Dauer ist keine gültige Zahl" };
  }
  const monteure = d.estMonteure ? Number(d.estMonteure) : null;
  if (monteure !== null && (!Number.isInteger(monteure) || monteure < 0)) {
    return { error: "Anzahl Monteure ist keine gültige Zahl" };
  }

  const after = {
    title: d.title,
    addressId: d.addressId || null,
    source: d.source,
    services: d.services as ServiceType[],
    estHours: hours,
    estMonteure: monteure,
    notes: d.notes || null,
  };

  const changes = diffOf(before as unknown as Record<string, unknown>, after);
  if (Object.keys(changes).length === 0) return { success: "Keine Änderungen" };

  await db.$transaction(async (tx) => {
    await tx.deal.update({ where: { id: d.dealId }, data: after });
    await tx.activityLog.create({
      data: {
        entity: "Deal",
        entityId: d.dealId,
        userId: actor.id,
        action: "deal.updated",
        diff: changes,
      },
    });
  });

  revalidatePath(`/anfragen/${d.dealId}`);
  revalidatePath("/anfragen");
  return { success: "Gespeichert" };
}

/**
 * Отметка первого ответа клиенту.
 *
 * Цель номер один главы 1 ТЗ — время первого ответа меньше 15 минут. Без
 * этой отметки метрику не посчитать, поэтому она ставится одним нажатием
 * и только один раз: переписывать её задним числом нельзя.
 */
export async function markFirstResponseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER", "DISPONENT");
  const dealId = String(formData.get("dealId") ?? "");

  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: { firstResponseAt: true, createdAt: true },
  });
  if (!deal) return { error: "Anfrage nicht gefunden" };
  if (deal.firstResponseAt) return { success: "Bereits vermerkt" };

  const now = new Date();
  const minutes = Math.round(
    (now.getTime() - deal.createdAt.getTime()) / 60_000,
  );

  await db.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: { firstResponseAt: now },
    });
    await tx.activityLog.create({
      data: {
        entity: "Deal",
        entityId: dealId,
        userId: actor.id,
        action: "deal.first_response",
        diff: { minutenBisAntwort: [null, minutes] },
      },
    });
  });

  revalidatePath(`/anfragen/${dealId}`);
  revalidatePath("/anfragen");
  return { success: `Erstantwort vermerkt (${minutes} Min.)` };
}

export async function updateChecklistAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER", "DISPONENT");
  const dealId = String(formData.get("dealId") ?? "");

  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: { checklist: true },
  });
  if (!deal) return { error: "Anfrage nicht gefunden" };

  const checklist = Object.fromEntries(
    CHECKLIST_KEYS.map((key) => [key, formData.get(key) === "on"]),
  );

  await db.$transaction(async (tx) => {
    await tx.deal.update({ where: { id: dealId }, data: { checklist } });
    await tx.activityLog.create({
      data: {
        entity: "Deal",
        entityId: dealId,
        userId: actor.id,
        action: "deal.checklist_changed",
        diff: diffOf(
          (deal.checklist ?? {}) as Record<string, unknown>,
          checklist,
        ),
      },
    });
  });

  revalidatePath(`/anfragen/${dealId}`);
  return { success: "Checkliste gespeichert" };
}

/** Проверка прав для страниц: цену видит не каждый. */
export async function currentCanSeePrices(): Promise<boolean> {
  const actor = await requireRole("INHABER", "DISPONENT");
  return canSeePrices(actor);
}
