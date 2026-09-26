/**
 * Приём заявки с сайта (глава 8 ТЗ, Этап 1: «форма с сайта через webhook»).
 *
 * Отдельный модуль, потому что здесь две разные задачи: проверить, что запрос
 * действительно от нашего сайта, и аккуратно превратить произвольные поля
 * формы в клиента, адрес и заявку.
 *
 * Клиент ищется по телефону и почте: с сайта пишет тот же человек, что уже
 * звонил, и второй карточки быть не должно.
 */
import type { LeadSource, Prisma, ServiceType } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { SERVICES } from "@/lib/deals";
import { VAT_19 } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
export {
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  verifySignature,
} from "@/lib/webhook-signature";
import { logActivity } from "@/server/activity";

/** Окно, в котором повторная отправка той же формы считается дублем. */
const DEDUP_MINUTES = 10;

/**
 * Поля формы. Всё, кроме описания и способа связи, необязательно: форма на
 * сайте короткая, а недостающее диспетчер спросит — для этого в заявке есть
 * чек-лист «Daten fehlen».
 */
export const leadSchema = z.object({
  salutation: z.enum(["Herr", "Frau"]).optional(),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  company: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
  language: z.enum(["DE", "EN", "RU", "RO"]).optional(),

  title: z.string().trim().min(3).max(200).optional(),
  message: z.string().trim().max(5000).optional(),
  services: z.array(z.enum(SERVICES as [ServiceType, ...ServiceType[]])).optional(),

  street: z.string().trim().max(200).optional(),
  zip: z.string().trim().max(10).optional(),
  city: z.string().trim().max(100).optional(),
  floor: z.string().trim().max(50).optional(),
  elevator: z.boolean().optional(),

  utmSource: z.string().trim().max(100).optional(),
  utmMedium: z.string().trim().max(100).optional(),
  utmCampaign: z.string().trim().max(100).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export type IntakeResult =
  | { ok: true; dealId: string; dealNumber: number; duplicate: boolean }
  | { ok: false; code: string; message: string };

export async function intakeLead(
  input: LeadInput,
  source: LeadSource = "WEBSITE",
): Promise<IntakeResult> {
  // Без способа связаться заявка бесполезна: перезвонить некому.
  const phoneNormalized = input.phone ? normalizePhone(input.phone) : null;
  if (!phoneNormalized && !input.email) {
    return {
      ok: false,
      code: "no_contact",
      message: "Telefon oder E-Mail wird benötigt",
    };
  }

  const title = (input.title ?? input.message ?? "").trim();
  if (title.length < 3) {
    return { ok: false, code: "no_title", message: "Beschreibung fehlt" };
  }

  // Заголовок заявки — короткий: длинный текст остаётся в заметках.
  const shortTitle = title.length > 120 ? `${title.slice(0, 117)}…` : title;

  const existingCustomer = await db.customer.findFirst({
    where: {
      deletedAt: null,
      OR: [
        ...(phoneNormalized ? [{ phoneNormalized }] : []),
        ...(input.email ? [{ email: input.email }] : []),
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  // Дубль: сайт повторил отправку, человек нажал кнопку дважды, форма ушла
  // из очереди браузера второй раз. Новая заявка в таких случаях не нужна.
  if (existingCustomer) {
    const recent = await db.deal.findFirst({
      where: {
        customerId: existingCustomer.id,
        title: shortTitle,
        createdAt: { gt: new Date(Date.now() - DEDUP_MINUTES * 60_000) },
      },
      select: { id: true, number: true },
    });
    if (recent) {
      return {
        ok: true,
        dealId: recent.id,
        dealNumber: recent.number,
        duplicate: true,
      };
    }
  }

  const settings = await db.settings.findUnique({ where: { id: 1 } });

  const notesParts = [
    input.message && input.message !== shortTitle ? input.message : null,
    input.floor ? `Etage: ${input.floor}` : null,
    input.elevator === true ? "Aufzug: vorhanden" : null,
    input.elevator === false ? "Aufzug: keiner" : null,
  ].filter(Boolean);

  const result = await db.$transaction(async (tx) => {
    let customerId = existingCustomer?.id ?? null;

    if (!customerId) {
      const customer = await tx.customer.create({
        data: {
          type: input.company ? "FIRMA" : "PRIVAT",
          salutation: input.salutation ?? null,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          company: input.company ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          phoneNormalized,
          language: input.language ?? "DE",
        },
        select: { id: true },
      });
      customerId = customer.id;

      await logActivity({
        entity: "Customer",
        entityId: customerId,
        action: "customer.created",
        // Действие системы, а не сотрудника: журнал не должен приписывать
        // его человеку, который в этот момент ничего не делал.
        userId: null,
        diff: { quelle: [null, "Webhook"] },
        tx,
      });
    }

    // Адрес заводим только полный: улица без города планировщику не поможет.
    let addressId: string | null = null;
    if (input.street && input.zip && input.city) {
      const existingAddress = await tx.address.findFirst({
        where: {
          customerId,
          street: input.street,
          zip: input.zip,
          city: input.city,
        },
        select: { id: true },
      });
      addressId =
        existingAddress?.id ??
        (
          await tx.address.create({
            data: {
              customerId,
              street: input.street,
              zip: input.zip,
              city: input.city,
              floor: input.floor ?? null,
              elevator: input.elevator ?? false,
            },
            select: { id: true },
          })
        ).id;
    }

    const deal = await tx.deal.create({
      data: {
        customerId,
        addressId,
        title: shortTitle,
        source,
        services: (input.services ?? []) as ServiceType[],
        notes: notesParts.length > 0 ? notesParts.join("\n") : null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        vatRateBp: settings?.defaultVatRateBp ?? VAT_19,
        // Чек-лист сразу отмечает, чего в заявке с сайта не хватает.
        checklist: {
          adresse: Boolean(addressId),
          etage: Boolean(input.floor),
          lift: input.elevator === true,
        } satisfies Prisma.InputJsonValue,
      },
      select: { id: true, number: true },
    });

    await logActivity({
      entity: "Deal",
      entityId: deal.id,
      action: "deal.created",
      userId: null,
      diff: {
        title: [null, shortTitle],
        source: [null, source],
        quelle: [null, "Webhook"],
      },
      tx,
    });

    return deal;
  });

  return {
    ok: true,
    dealId: result.id,
    dealNumber: result.number,
    duplicate: false,
  };
}
