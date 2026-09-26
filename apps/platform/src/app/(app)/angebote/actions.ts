"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Lang, PriceUnit } from "@prisma/client";
import { db } from "@/lib/db";
import { parseAmountToCents } from "@/lib/money";
import { PRICE_UNITS } from "@/lib/deals";
import { requireRole, clientIp } from "@/server/auth/guards";
import { getSettings } from "@/server/queries/settings";
import { buildOfferText } from "@/server/offer-text";
import {
  calculateTotals,
  checkCanEdit,
  checkCanSend,
  checkLegalBlocks,
  checkLines,
} from "@/server/rules/offer";

export type OfferState = { error?: string; success?: string; offerId?: string };

/** Подписи единиц для текста документа. Немецкий — язык всех документов. */
const UNIT_LABELS_DE: Record<string, string> = {
  STUNDE: "Std.",
  STUECK: "Stk.",
  PAUSCHALE: "Pauschale",
  QM: "m²",
  LFM: "lfm",
};

const lineSchema = z.object({
  description: z.string().trim().min(1).max(300),
  qty: z.string().trim().min(1),
  unit: z.enum(PRICE_UNITS as [PriceUnit, ...PriceUnit[]]),
  price: z.string().trim().min(1),
});

const offerSchema = z.object({
  dealId: z.string().min(1),
  offerId: z.string().optional(),
  language: z.enum(["DE", "EN", "RU", "RO"] as [Lang, ...Lang[]]).default("DE"),
});

/** Позиции приходят параллельными массивами полей формы. */
function readLines(formData: FormData) {
  const descriptions = formData.getAll("lineDescription").map(String);
  const quantities = formData.getAll("lineQty").map(String);
  const units = formData.getAll("lineUnit").map(String);
  const prices = formData.getAll("linePrice").map(String);

  const lines: { description: string; qty: string; unit: string; price: string }[] =
    [];

  for (let i = 0; i < descriptions.length; i++) {
    const description = (descriptions[i] ?? "").trim();
    const price = (prices[i] ?? "").trim();
    // Пустая строка формы — это не позиция, а незаполненный бланк.
    if (!description && !price) continue;
    lines.push({
      description,
      qty: (quantities[i] ?? "1").trim() || "1",
      unit: units[i] ?? "PAUSCHALE",
      price,
    });
  }
  return lines;
}

/**
 * Создание и правка черновика Angebot.
 *
 * Правило 9.2 ТЗ: без блока гарантии, просьбы о парковке и оговорки об
 * объёме предложение не сохраняется. Блоки копируются в документ снимком —
 * правка настроек не меняет то, что уже увидел клиент.
 */
export async function saveOfferAction(
  _prev: OfferState,
  formData: FormData,
): Promise<OfferState> {
  const actor = await requireRole("INHABER", "DISPONENT");

  const parsed = offerSchema.safeParse({
    dealId: formData.get("dealId"),
    offerId: formData.get("offerId") || undefined,
    language: formData.get("language") || "DE",
  });
  if (!parsed.success) return { error: "Eingabe ungültig" };
  const { dealId, offerId, language } = parsed.data;

  const settings = await getSettings();

  // Правило 9.2 — первая проверка: блоки заполнены в настройках фирмы.
  const legalDenied = checkLegalBlocks(settings);
  if (legalDenied) return { error: legalDenied.message };

  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      title: true,
      vatRateBp: true,
      customer: {
        select: { salutation: true, lastName: true, company: true },
      },
    },
  });
  if (!deal) return { error: "Anfrage nicht gefunden" };

  if (offerId) {
    const existing = await db.offer.findUnique({
      where: { id: offerId },
      select: { status: true, sentAt: true },
    });
    if (!existing) return { error: "Angebot nicht gefunden" };
    const editDenied = checkCanEdit(existing);
    if (editDenied) return { error: editDenied.message };
  }

  // Разбор позиций.
  const rawLines = readLines(formData);
  const lines: {
    description: string;
    qty: string;
    unit: PriceUnit;
    unitPriceCents: number;
  }[] = [];

  for (const raw of rawLines) {
    const parsedLine = lineSchema.safeParse(raw);
    if (!parsedLine.success) {
      return { error: `Position „${raw.description}“ ist unvollständig` };
    }
    const cents = parseAmountToCents(raw.price);
    if (cents === null) {
      return { error: `„${raw.price}“ ist kein gültiger Betrag` };
    }
    const qty = Number(raw.qty.replace(",", "."));
    if (!Number.isFinite(qty)) {
      return { error: `„${raw.qty}“ ist keine gültige Menge` };
    }
    lines.push({
      description: raw.description,
      qty: raw.qty,
      unit: parsedLine.data.unit,
      unitPriceCents: cents,
    });
  }

  const linesDenied = checkLines(lines);
  if (linesDenied) return { error: linesDenied.message };

  const vatRateBp =
    settings.taxMode === "KLEINUNTERNEHMER" ? 0 : deal.vatRateBp;
  const totals = calculateTotals(lines, vatRateBp);

  // Следующая версия: v1, v2, v3 — история изменений (глава 5.4).
  const version =
    offerId === undefined
      ? ((
          await db.offer.aggregate({
            where: { dealId },
            _max: { version: true },
          })
        )._max.version ?? 0) + 1
      : undefined;

  const bodyText = buildOfferText({
    companyName: settings.companyName || "MöbelStock24",
    customerSalutation: deal.customer.salutation,
    customerLastName: deal.customer.lastName ?? deal.customer.company,
    customerCompany: deal.customer.company,
    dealTitle: deal.title,
    version: version ?? 1,
    lines: lines.map((l, i) => ({
      description: l.description,
      qty: l.qty,
      unit: l.unit,
      unitPriceCents: l.unitPriceCents,
      lineNetCents: totals.lines[i]!.lineNetCents,
    })),
    totalNetCents: totals.totalNetCents,
    vatRateBp,
    vatAmountCents: totals.vatAmountCents,
    totalGrossCents: totals.totalGrossCents,
    warrantyText: settings.warrantyText,
    parkingText: settings.parkingText,
    scopeText: settings.scopeText,
    unitLabels: UNIT_LABELS_DE,
    locale: "de-DE",
  });

  const data = {
    dealId,
    language,
    totalNetCents: totals.totalNetCents,
    vatRateBp,
    vatAmountCents: totals.vatAmountCents,
    totalGrossCents: totals.totalGrossCents,
    // Правило 9.2 — вторая проверка: блоки попадают в сам документ снимком.
    warrantyText: settings.warrantyText,
    parkingText: settings.parkingText,
    scopeText: settings.scopeText,
    bodyText,
  };

  const saved = await db.$transaction(async (tx) => {
    const offer = offerId
      ? await tx.offer.update({ where: { id: offerId }, data })
      : await tx.offer.create({ data: { ...data, version: version! } });

    await tx.offerItem.deleteMany({ where: { offerId: offer.id } });
    await tx.offerItem.createMany({
      data: lines.map((line, i) => ({
        offerId: offer.id,
        position: i + 1,
        description: line.description,
        qty: line.qty.replace(",", "."),
        unit: line.unit,
        unitPriceCents: line.unitPriceCents,
        lineNetCents: totals.lines[i]!.lineNetCents,
      })),
    });

    await tx.activityLog.create({
      data: {
        entity: "Offer",
        entityId: offer.id,
        userId: actor.id,
        action: offerId ? "offer.updated" : "offer.created",
        diff: {
          version: [null, offer.version],
          summeNettoCent: [null, totals.totalNetCents],
        },
      },
    });

    return offer;
  });

  revalidatePath(`/anfragen/${dealId}`);
  revalidatePath("/angebote");
  return { success: "Angebot gespeichert", offerId: saved.id };
}

/**
 * Отправка Angebot клиенту.
 *
 * Правило 9.1 ТЗ: без цены, подтверждённой владельцем, предложение не
 * уходит. Проверка стоит здесь, а не в интерфейсе: кнопку можно нажать
 * и запросом.
 */
export async function sendOfferAction(
  _prev: OfferState,
  formData: FormData,
): Promise<OfferState> {
  const actor = await requireRole("INHABER", "DISPONENT");
  const offerId = String(formData.get("offerId") ?? "");

  const offer = await db.offer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      status: true,
      sentAt: true,
      dealId: true,
      version: true,
      deal: { select: { priceNetCents: true, priceApproved: true, status: true } },
    },
  });
  if (!offer) return { error: "Angebot nicht gefunden" };
  if (offer.sentAt) return { error: "Dieses Angebot wurde bereits versendet" };

  // Правило 9.1.
  const denied = checkCanSend(offer.deal);
  if (denied) return { error: denied.message };

  // Токен публичной ссылки «Angebot annehmen»: случайный и неугадываемый.
  const acceptToken = randomBytes(24).toString("base64url");

  await db.$transaction(async (tx) => {
    // Прежние версии помечаем заменёнными: действующей остаётся одна.
    await tx.offer.updateMany({
      where: {
        dealId: offer.dealId,
        id: { not: offer.id },
        status: { in: ["ENTWURF", "GESENDET"] },
      },
      data: { status: "ERSETZT" },
    });

    await tx.offer.update({
      where: { id: offerId },
      data: { status: "GESENDET", sentAt: new Date(), acceptToken },
    });

    if (offer.deal.status !== "ANGEBOT_RAUS") {
      await tx.deal.update({
        where: { id: offer.dealId },
        data: { status: "ANGEBOT_RAUS" },
      });
      await tx.activityLog.create({
        data: {
          entity: "Deal",
          entityId: offer.dealId,
          userId: actor.id,
          action: "deal.status_changed",
          diff: { status: [offer.deal.status, "ANGEBOT_RAUS"] },
        },
      });
    }

    await tx.activityLog.create({
      data: {
        entity: "Offer",
        entityId: offerId,
        userId: actor.id,
        action: "offer.sent",
        diff: { version: [null, offer.version] },
      },
    });
  });

  revalidatePath(`/anfragen/${offer.dealId}`);
  revalidatePath("/angebote");
  return { success: "Angebot versendet" };
}

/**
 * Принятие предложения клиентом по публичной ссылке.
 *
 * Глава 5.4 ТЗ: фиксируется дата и IP. Действие вызывается без входа
 * в систему, поэтому единственная защита — неугадываемый токен.
 */
export async function acceptOfferAction(
  _prev: OfferState,
  formData: FormData,
): Promise<OfferState> {
  const token = String(formData.get("token") ?? "");
  const decline = formData.get("decline") === "true";

  if (token.length < 20) return { error: "Ungültiger Link" };

  const offer = await db.offer.findUnique({
    where: { acceptToken: token },
    select: {
      id: true,
      status: true,
      dealId: true,
      acceptedAt: true,
      declinedAt: true,
      deal: { select: { status: true } },
    },
  });
  if (!offer) return { error: "Ungültiger Link" };
  if (offer.acceptedAt || offer.declinedAt) {
    return { error: "Dieses Angebot wurde bereits beantwortet" };
  }

  const ip = await clientIp().catch(() => null);
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.offer.update({
      where: { id: offer.id },
      data: decline
        ? { status: "ABGELEHNT", declinedAt: now }
        : { status: "ANGENOMMEN", acceptedAt: now, acceptedIp: ip },
    });

    if (!decline && offer.deal.status !== "BESTAETIGT") {
      await tx.deal.update({
        where: { id: offer.dealId },
        data: { status: "BESTAETIGT" },
      });
    }

    await tx.activityLog.create({
      data: {
        entity: "Offer",
        entityId: offer.id,
        // Действие клиента, а не сотрудника: автора в системе нет.
        userId: null,
        action: decline ? "offer.declined" : "offer.accepted",
        ip,
      },
    });
  });

  revalidatePath(`/anfragen/${offer.dealId}`);
  return {
    success: decline ? "Antwort gespeichert" : "Angebot angenommen",
  };
}
