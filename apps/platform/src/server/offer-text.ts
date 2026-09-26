/**
 * Текст Angebot для отправки в WhatsApp (глава 5.4 ТЗ: «вывод в двух
 * форматах — текст для WhatsApp и PDF»).
 *
 * Текст собирается на сервере и сохраняется в предложении снимком. Причина
 * та же, что и у сумм: клиент получил конкретные слова, и они не должны
 * меняться задним числом, если поправили настройки фирмы.
 */
import { formatCents, formatVatRate } from "@/lib/money";
import { KLEINUNTERNEHMER_NOTE } from "@/lib/legal-texts";

export type OfferTextInput = {
  companyName: string;
  customerSalutation: string | null;
  customerLastName: string | null;
  customerCompany: string | null;
  dealTitle: string;
  version: number;
  lines: {
    description: string;
    qty: string;
    unit: string;
    unitPriceCents: number;
    lineNetCents: number;
  }[];
  totalNetCents: number;
  vatRateBp: number;
  vatAmountCents: number;
  totalGrossCents: number;
  warrantyText: string;
  parkingText: string;
  scopeText: string;
  /** Подписи единиц измерения на языке документа. */
  unitLabels: Record<string, string>;
  locale: string;
};

/**
 * Обращение. В немецком письме «Sehr geehrter Herr Schmidt» и «Guten Tag»
 * — разные степени формальности; при неизвестном поле выбираем нейтральное.
 */
function salutation(input: OfferTextInput): string {
  const name = input.customerLastName?.trim();
  if (!name) return "Guten Tag,";
  if (input.customerSalutation === "Herr") return `Sehr geehrter Herr ${name},`;
  if (input.customerSalutation === "Frau") return `Sehr geehrte Frau ${name},`;
  return `Guten Tag ${name},`;
}

export function buildOfferText(input: OfferTextInput): string {
  const money = (cents: number) => formatCents(cents, input.locale);
  const isKleinunternehmer = input.vatRateBp === 0;

  const lines = input.lines.map((line) => {
    const unit = input.unitLabels[line.unit] ?? line.unit;
    // Количество показываем только там, где оно осмысленно: у Pauschale
    // «1 Pauschale» — шум.
    const amount =
      line.unit === "PAUSCHALE"
        ? ""
        : `${line.qty} ${unit} × ${money(line.unitPriceCents)} = `;
    return `• ${line.description}: ${amount}${money(line.lineNetCents)}`;
  });

  const totals = isKleinunternehmer
    ? [`Gesamt: ${money(input.totalGrossCents)}`, KLEINUNTERNEHMER_NOTE]
    : [
        `Netto: ${money(input.totalNetCents)}`,
        `zzgl. ${formatVatRate(input.vatRateBp, input.locale)} USt: ${money(input.vatAmountCents)}`,
        `Gesamt: ${money(input.totalGrossCents)}`,
      ];

  return [
    salutation(input),
    "",
    `vielen Dank für Ihre Anfrage. Hier unser Angebot${input.version > 1 ? ` (Version ${input.version})` : ""}:`,
    "",
    input.dealTitle,
    "",
    ...lines,
    "",
    ...totals,
    "",
    input.scopeText,
    "",
    input.warrantyText,
    "",
    input.parkingText,
    "",
    "Mit freundlichen Grüßen",
    input.companyName,
  ].join("\n");
}
