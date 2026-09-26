/**
 * Сборка PDF предложения (глава 5.4 ТЗ).
 *
 * PDF делается из самого предложения: суммы, правовые блоки и версия там уже
 * зафиксированы снимком. Реквизиты фирмы берутся из настроек — они у фирмы
 * одни, и в документе должны быть текущими.
 *
 * Файл создаётся один раз и кладётся в хранилище: отправленное предложение
 * не меняется, а пересобирать один и тот же документ при каждом открытии
 * незачем.
 */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { formatCents, formatVatRate } from "@/lib/money";
import { formatDateDocument } from "@/lib/datetime";
import { KLEINUNTERNEHMER_NOTE } from "@/lib/legal-texts";
import { displayNameOf } from "@/server/queries/customers";
import { getSettings } from "@/server/queries/settings";
import { salutation } from "@/server/offer-text";
import { renderOfferPdf, type OfferPdfLine } from "@/server/pdf/offer";

/** Единицы измерения по-немецки: документ всегда немецкий. */
const UNIT_LABELS: Record<string, string> = {
  STUNDE: "Std.",
  STUECK: "Stk.",
  PAUSCHALE: "Pausch.",
  QM: "m²",
  LFM: "lfm",
};

/** Срок действия предложения — 14 дней от даты отправки. */
const VALID_DAYS = 14;

/**
 * Возвращает ключ PDF предложения, создавая файл при первом обращении.
 * Права здесь не проверяются — это делает вызывающий.
 */
export async function ensureOfferPdf(offerId: string): Promise<string | null> {
  const offer = await db.offer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      version: true,
      pdfKey: true,
      sentAt: true,
      createdAt: true,
      totalNetCents: true,
      vatRateBp: true,
      vatAmountCents: true,
      totalGrossCents: true,
      warrantyText: true,
      parkingText: true,
      scopeText: true,
      deal: {
        select: {
          number: true,
          title: true,
          customer: {
            select: {
              type: true,
              salutation: true,
              firstName: true,
              lastName: true,
              company: true,
            },
          },
          address: { select: { street: true, zip: true, city: true } },
        },
      },
      items: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          description: true,
          qty: true,
          unit: true,
          unitPriceCents: true,
          lineNetCents: true,
        },
      },
    },
  });
  if (!offer) return null;

  // Готовый файл переиспользуем: отправленный документ не меняется.
  if (offer.pdfKey) {
    const existing = await storage().get(offer.pdfKey);
    if (existing) return offer.pdfKey;
    // Файла нет (переехали хранилища, ручное удаление) — собираем заново.
  }

  const settings = await getSettings();
  const isKleinunternehmer = offer.vatRateBp === 0;
  const documentDate = offer.sentAt ?? offer.createdAt;

  const lines: OfferPdfLine[] = offer.items.map((item) => ({
    position: item.position,
    description: item.description,
    // Количество печатаем без лишних нулей: «2,5», а не «2,500».
    qty: item.qty.toString().replace(/\.?0+$/, "").replace(".", ","),
    unitLabel: UNIT_LABELS[item.unit] ?? item.unit,
    unitPrice: formatCents(item.unitPriceCents),
    lineNet: formatCents(item.lineNetCents),
  }));

  const validUntil = new Date(
    documentDate.getTime() + VALID_DAYS * 24 * 60 * 60_000,
  );

  const pdf = await renderOfferPdf({
    company: settings,
    offerNumber: String(offer.deal.number),
    version: offer.version,
    date: formatDateDocument(documentDate),
    customerName: displayNameOf(offer.deal.customer),
    customerAddress: offer.deal.address
      ? [
          offer.deal.address.street,
          `${offer.deal.address.zip} ${offer.deal.address.city}`,
        ]
      : [],
    dealTitle: offer.deal.title,
    greeting: [
      salutation({
        customerSalutation: offer.deal.customer.salutation,
        customerLastName: offer.deal.customer.lastName,
      }),
      "",
      "vielen Dank für Ihre Anfrage. Gern unterbreiten wir Ihnen folgendes Angebot:",
    ].join("\n"),
    lines,
    totalNet: formatCents(offer.totalNetCents),
    vatLabel: isKleinunternehmer
      ? null
      : `zzgl. ${formatVatRate(offer.vatRateBp)} USt`,
    vatAmount: isKleinunternehmer ? null : formatCents(offer.vatAmountCents),
    totalGross: formatCents(offer.totalGrossCents),
    kleinunternehmerNote: isKleinunternehmer ? KLEINUNTERNEHMER_NOTE : null,
    scopeText: offer.scopeText,
    warrantyText: offer.warrantyText,
    parkingText: offer.parkingText,
    validUntil: formatDateDocument(validUntil),
  });

  const key =
    `offers/${offer.id}/angebot-v${offer.version}-${randomBytes(6).toString("hex")}.pdf`;
  await storage().put(key, pdf, "application/pdf");
  await db.offer.update({ where: { id: offer.id }, data: { pdfKey: key } });

  return key;
}
