"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { requireRole } from "@/server/auth/guards";
import { logActivity, diffOf } from "@/server/activity";

export type FormState = { error?: string; success?: string };

const LANGS = ["DE", "EN", "RU", "RO"] as const;
const TYPES = ["PRIVAT", "FIRMA"] as const;

const customerSchema = z
  .object({
    type: z.enum(TYPES),
    salutation: z.string().trim().max(20).optional(),
    firstName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
    company: z.string().trim().max(200).optional(),
    email: z.union([z.string().trim().email(), z.literal("")]).optional(),
    phone: z.string().trim().max(50).optional(),
    language: z.enum(LANGS),
    notes: z.string().trim().max(5000).optional(),
    tags: z.string().trim().max(500).optional(),
  })
  .refine(
    // Клиент без единого опознавательного признака бесполезен: его не найти
    // и не позвонить. Хотя бы одно поле должно быть заполнено.
    (d) => Boolean(d.lastName || d.company || d.phone || d.email),
    {
      message:
        "Mindestens Nachname, Firma, Telefon oder E-Mail muss angegeben sein",
    },
  );

/** Теги вводятся строкой через запятую — приводим к массиву без пустых. */
function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((t) => t.trim()).filter(Boolean))];
}

function readCustomerForm(formData: FormData) {
  return customerSchema.safeParse({
    type: formData.get("type"),
    salutation: formData.get("salutation") ?? undefined,
    firstName: formData.get("firstName") ?? undefined,
    lastName: formData.get("lastName") ?? undefined,
    company: formData.get("company") ?? undefined,
    email: formData.get("email") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    language: formData.get("language") ?? "DE",
    notes: formData.get("notes") ?? undefined,
    tags: formData.get("tags") ?? undefined,
  });
}

export async function createCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER", "DISPONENT");

  const parsed = readCustomerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }
  const d = parsed.data;

  const customer = await db.customer.create({
    data: {
      type: d.type,
      salutation: d.salutation || null,
      firstName: d.firstName || null,
      lastName: d.lastName || null,
      company: d.company || null,
      email: d.email || null,
      phone: d.phone || null,
      phoneNormalized: normalizePhone(d.phone),
      language: d.language,
      notes: d.notes || null,
      tags: parseTags(d.tags),
    },
  });

  await logActivity({
    entity: "Customer",
    entityId: customer.id,
    action: "customer.created",
    userId: actor.id,
    diff: {
      name: [null, d.company || `${d.lastName ?? ""} ${d.firstName ?? ""}`.trim()],
    },
  });

  revalidatePath("/kunden");
  redirect(`/kunden/${customer.id}`);
}

export async function updateCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER", "DISPONENT");
  const id = String(formData.get("customerId") ?? "");

  const parsed = readCustomerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }
  const d = parsed.data;

  const before = await db.customer.findUnique({ where: { id } });
  if (!before) return { error: "Kunde nicht gefunden" };
  if (before.anonymizedAt) {
    return { error: "Anonymisierte Kunden können nicht bearbeitet werden" };
  }

  const after = {
    type: d.type,
    salutation: d.salutation || null,
    firstName: d.firstName || null,
    lastName: d.lastName || null,
    company: d.company || null,
    email: d.email || null,
    phone: d.phone || null,
    phoneNormalized: normalizePhone(d.phone),
    language: d.language,
    notes: d.notes || null,
    tags: parseTags(d.tags),
  };

  const changes = diffOf(before as unknown as Record<string, unknown>, after);
  if (Object.keys(changes).length === 0) {
    return { success: "Keine Änderungen" };
  }

  await db.$transaction(async (tx) => {
    await tx.customer.update({ where: { id }, data: after });
    await tx.activityLog.create({
      data: {
        entity: "Customer",
        entityId: id,
        userId: actor.id,
        action: "customer.updated",
        diff: changes,
      },
    });
  });

  revalidatePath(`/kunden/${id}`);
  revalidatePath("/kunden");
  return { success: "Gespeichert" };
}

// ─── Адреса ─────────────────────────────────────────────────────────────────

const addressSchema = z.object({
  customerId: z.string().min(1),
  addressId: z.string().optional(),
  label: z.string().trim().max(60).optional(),
  street: z.string().trim().min(2, "Straße fehlt").max(200),
  zip: z.string().trim().min(4, "PLZ fehlt").max(10),
  city: z.string().trim().min(2, "Ort fehlt").max(100),
  floor: z.string().trim().max(30).optional(),
  elevator: z.coerce.boolean(),
  parkingNote: z.string().trim().max(500).optional(),
});

export async function saveAddressAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER", "DISPONENT");

  const parsed = addressSchema.safeParse({
    customerId: formData.get("customerId"),
    addressId: formData.get("addressId") || undefined,
    label: formData.get("label") ?? undefined,
    street: formData.get("street"),
    zip: formData.get("zip"),
    city: formData.get("city"),
    floor: formData.get("floor") ?? undefined,
    elevator: formData.get("elevator") === "on",
    parkingNote: formData.get("parkingNote") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }
  const d = parsed.data;

  const data = {
    label: d.label || null,
    street: d.street,
    zip: d.zip,
    city: d.city,
    floor: d.floor || null,
    elevator: d.elevator,
    parkingNote: d.parkingNote || null,
  };

  if (d.addressId) {
    const before = await db.address.findUnique({ where: { id: d.addressId } });
    if (!before || before.customerId !== d.customerId) {
      return { error: "Adresse nicht gefunden" };
    }
    const changes = diffOf(before as unknown as Record<string, unknown>, data);

    await db.$transaction(async (tx) => {
      await tx.address.update({ where: { id: d.addressId }, data });
      await tx.activityLog.create({
        data: {
          entity: "Customer",
          entityId: d.customerId,
          userId: actor.id,
          action: "address.updated",
          diff: changes,
        },
      });
    });
  } else {
    await db.$transaction(async (tx) => {
      const created = await tx.address.create({
        data: { ...data, customerId: d.customerId },
      });
      await tx.activityLog.create({
        data: {
          entity: "Customer",
          entityId: d.customerId,
          userId: actor.id,
          action: "address.created",
          diff: { adresse: [null, `${d.street}, ${d.zip} ${d.city}`] },
        },
      });
      return created;
    });
  }

  revalidatePath(`/kunden/${d.customerId}`);
  return { success: "Adresse gespeichert" };
}

export async function deleteAddressAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER", "DISPONENT");
  const addressId = String(formData.get("addressId") ?? "");

  const address = await db.address.findUnique({
    where: { id: addressId },
    include: { _count: { select: { deals: true, appointments: true } } },
  });
  if (!address) return { error: "Adresse nicht gefunden" };

  // Адрес, на который назначен выезд или заведена заявка, удалять нельзя:
  // иначе из карточки заказа пропадёт место работы.
  if (address._count.deals > 0 || address._count.appointments > 0) {
    return {
      error:
        "Diese Adresse wird von Aufträgen oder Terminen verwendet und kann nicht gelöscht werden",
    };
  }

  await db.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: addressId } });
    await tx.activityLog.create({
      data: {
        entity: "Customer",
        entityId: address.customerId,
        userId: actor.id,
        action: "address.deleted",
        diff: {
          adresse: [`${address.street}, ${address.zip} ${address.city}`, null],
        },
      },
    });
  });

  revalidatePath(`/kunden/${address.customerId}`);
  return { success: "Adresse gelöscht" };
}

// ─── Löschkonzept (глава 3 ТЗ) ──────────────────────────────────────────────

/**
 * Архивирование: клиент пропадает из списков, но остаётся в базе и в заказах.
 * Обратимо.
 */
export async function archiveCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER", "DISPONENT");
  const id = String(formData.get("customerId") ?? "");
  const restore = formData.get("restore") === "true";

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) return { error: "Kunde nicht gefunden" };

  await db.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id },
      data: { deletedAt: restore ? null : new Date() },
    });
    await tx.activityLog.create({
      data: {
        entity: "Customer",
        entityId: id,
        userId: actor.id,
        action: restore ? "customer.restored" : "customer.archived",
      },
    });
  });

  revalidatePath(`/kunden/${id}`);
  revalidatePath("/kunden");
  return { success: restore ? "Kunde wiederhergestellt" : "Kunde archiviert" };
}

/**
 * Удаление персональных данных по требованию клиента (DSGVO, глава 3 ТЗ).
 *
 * Сама запись остаётся: заказы, счета и всё, что связано с налогами, хранится
 * по закону годами. Стираются имя, контакты и заметки — то, по чему человека
 * можно опознать. Действие необратимо и доступно только владельцу.
 */
export async function anonymizeCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("INHABER");
  const id = String(formData.get("customerId") ?? "");

  // Подтверждение вводом слова: случайный клик по кнопке не должен стирать
  // данные необратимо.
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "LÖSCHEN") {
    return { error: 'Zum Bestätigen bitte "LÖSCHEN" eingeben' };
  }

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) return { error: "Kunde nicht gefunden" };
  if (customer.anonymizedAt) return { error: "Bereits anonymisiert" };

  await db.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id },
      data: {
        salutation: null,
        firstName: null,
        lastName: null,
        company: null,
        email: null,
        phone: null,
        phoneNormalized: null,
        notes: null,
        tags: [],
        anonymizedAt: new Date(),
        deletedAt: new Date(),
      },
    });

    // Адреса — тоже персональные данные. Улица и дом стираются, город и
    // индекс остаются: по ним считается статистика по районам, а опознать
    // человека по «10115 Berlin» нельзя.
    await tx.address.updateMany({
      where: { customerId: id },
      data: { street: "—", floor: null, parkingNote: null, label: null },
    });

    // В журнал пишем факт удаления, но не то, что было удалено: иначе
    // персональные данные остались бы в неизменяемом журнале навсегда.
    await tx.activityLog.create({
      data: {
        entity: "Customer",
        entityId: id,
        userId: actor.id,
        action: "customer.anonymized",
      },
    });
  });

  revalidatePath(`/kunden/${id}`);
  revalidatePath("/kunden");
  return { success: "Personenbezogene Daten wurden gelöscht" };
}
