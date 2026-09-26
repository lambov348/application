"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PriceUnit, ServiceType } from "@prisma/client";
import { db } from "@/lib/db";
import { parseAmountToCents } from "@/lib/money";
import { PRICE_UNITS, SERVICES } from "@/lib/deals";
import { requireRole } from "@/server/auth/guards";
import { logActivity } from "@/server/activity";

export type FormState = { error?: string; success?: string };

const itemSchema = z.object({
  itemId: z.string().optional(),
  name: z.string().trim().min(2, "Bezeichnung fehlt").max(200),
  unit: z.enum(PRICE_UNITS as [PriceUnit, ...PriceUnit[]]),
  price: z.string().trim().min(1, "Preis fehlt"),
  service: z.string().trim().optional(),
  sort: z.coerce.number().int().min(0).max(999).default(0),
  active: z.coerce.boolean(),
});

/**
 * Позиция каталога услуг (Leistungskatalog).
 *
 * Каталог наполняет владелец: цен в коде и в сидах нет намеренно — это
 * настоящий прайс фирмы, а не пример.
 */
export async function saveCatalogItemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER");

  const parsed = itemSchema.safeParse({
    itemId: formData.get("itemId") || undefined,
    name: formData.get("name"),
    unit: formData.get("unit"),
    price: formData.get("price"),
    service: formData.get("service") || undefined,
    sort: formData.get("sort") || 0,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }
  const d = parsed.data;

  const priceCents = parseAmountToCents(d.price);
  if (priceCents === null || priceCents < 0) {
    return { error: `„${d.price}“ ist kein gültiger Preis` };
  }

  const service =
    d.service && (SERVICES as string[]).includes(d.service)
      ? (d.service as ServiceType)
      : null;

  const data = {
    name: d.name,
    unit: d.unit,
    priceCents,
    service,
    sort: d.sort,
    active: d.active,
  };

  const item = d.itemId
    ? await db.serviceCatalogItem.update({ where: { id: d.itemId }, data })
    : await db.serviceCatalogItem.create({ data });

  await logActivity({
    entity: "ServiceCatalogItem",
    entityId: item.id,
    action: d.itemId ? "catalog.updated" : "catalog.created",
    userId: actor.id,
    diff: { name: [null, d.name], preisCent: [null, priceCents] },
  });

  revalidatePath("/einstellungen/leistungen");
  return { success: d.itemId ? "Position gespeichert" : "Position angelegt" };
}
