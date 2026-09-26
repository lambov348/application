"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseAmountToCents } from "@/lib/money";
import { requireRole } from "@/server/auth/guards";
import { diffOf } from "@/server/activity";
import { getSettings } from "@/server/queries/settings";

export type FormState = { error?: string; success?: string };

const settingsSchema = z.object({
  companyName: z.string().trim().max(200),
  companyStreet: z.string().trim().max(200),
  companyZip: z.string().trim().max(10),
  companyCity: z.string().trim().max(100),
  companyEmail: z.union([z.string().trim().email(), z.literal("")]),
  companyPhone: z.string().trim().max(50),
  taxNumber: z.string().trim().max(50).optional(),
  vatId: z.string().trim().max(50).optional(),
  taxMode: z.enum(["REGELBESTEUERUNG", "KLEINUNTERNEHMER"]),
  vatPercent: z.string().trim(),
  hourlyRate: z.string().trim().optional(),
  warrantyText: z.string().trim().max(3000),
  parkingText: z.string().trim().max(3000),
  scopeText: z.string().trim().max(3000),
  travelBufferMinutes: z.coerce.number().int().min(0).max(480),
  minPhotosBefore: z.coerce.number().int().min(0).max(20),
  minPhotosAfter: z.coerce.number().int().min(0).max(20),
});

export async function saveSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Настройки фирмы — только владелец: здесь налоговый режим и тексты,
  // которые говорят от лица фирмы.
  const actor = await requireRole("INHABER");

  const parsed = settingsSchema.safeParse(
    Object.fromEntries(
      [
        "companyName", "companyStreet", "companyZip", "companyCity",
        "companyEmail", "companyPhone", "taxNumber", "vatId", "taxMode",
        "vatPercent", "hourlyRate", "warrantyText", "parkingText", "scopeText",
        "travelBufferMinutes", "minPhotosBefore", "minPhotosAfter",
      ].map((key) => [key, formData.get(key) ?? ""]),
    ),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }
  const d = parsed.data;

  // Ставка вводится процентами, хранится в базисных пунктах: 19 → 1900.
  const percent = Number(d.vatPercent.replace(",", "."));
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return { error: "Der Steuersatz muss zwischen 0 und 100 liegen" };
  }
  const defaultVatRateBp = Math.round(percent * 100);

  let hourlyRateCents: number | null = null;
  if (d.hourlyRate) {
    hourlyRateCents = parseAmountToCents(d.hourlyRate);
    if (hourlyRateCents === null || hourlyRateCents < 0) {
      return { error: `„${d.hourlyRate}“ ist kein gültiger Stundensatz` };
    }
  }

  const before = await getSettings();

  const after = {
    companyName: d.companyName,
    companyStreet: d.companyStreet,
    companyZip: d.companyZip,
    companyCity: d.companyCity,
    companyEmail: d.companyEmail,
    companyPhone: d.companyPhone,
    taxNumber: d.taxNumber || null,
    vatId: d.vatId || null,
    taxMode: d.taxMode,
    // В режиме Kleinunternehmer НДС не начисляется вовсе (§19 UStG).
    defaultVatRateBp: d.taxMode === "KLEINUNTERNEHMER" ? 0 : defaultVatRateBp,
    hourlyRateCents,
    warrantyText: d.warrantyText,
    parkingText: d.parkingText,
    scopeText: d.scopeText,
    travelBufferMinutes: d.travelBufferMinutes,
    minPhotosBefore: d.minPhotosBefore,
    minPhotosAfter: d.minPhotosAfter,
  };

  const changes = diffOf(before as unknown as Record<string, unknown>, after);
  if (Object.keys(changes).length === 0) return { success: "Keine Änderungen" };

  await db.$transaction(async (tx) => {
    await tx.settings.update({ where: { id: 1 }, data: after });
    await tx.activityLog.create({
      data: {
        entity: "Settings",
        entityId: "1",
        userId: actor.id,
        action: "settings.updated",
        diff: changes,
      },
    });
  });

  revalidatePath("/einstellungen/firma");
  return { success: "Einstellungen gespeichert" };
}
