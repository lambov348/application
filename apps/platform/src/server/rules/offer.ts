/**
 * Правила Angebot (главы 5.4 и 9 ТЗ).
 *
 * Два жёстких запрета, и оба — отказ, а не предупреждение:
 *
 *   правило 9.1 — нельзя отправить Angebot без цены, подтверждённой
 *                 владельцем;
 *   правило 9.2 — нельзя сохранить Angebot без блока гарантии и без
 *                 просьбы о парковке.
 *
 * Правило 9.2 проверяется дважды: сначала что блоки заполнены в настройках
 * фирмы, затем что они действительно попали в документ. Второе не
 * формальность: тексты копируются в Angebot снимком, и пустая копия при
 * заполненных настройках означала бы ошибку в коде.
 */
import { lineTotalCents, sumCents, vatAmountCents } from "@/lib/money";

export class OfferDenied extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OfferDenied";
  }
}

export type OfferLineInput = {
  description: string;
  qty: number | string;
  unitPriceCents: number;
};

export type OfferTotals = {
  lines: { lineNetCents: number }[];
  totalNetCents: number;
  vatAmountCents: number;
  totalGrossCents: number;
};

/**
 * Итоги предложения.
 *
 * Сумма считается позиция за позицией с округлением на каждой, затем
 * складывается. Обратный порядок — сложить неокруглённое и округлить в
 * конце — даёт другой результат, и тогда итог документа не сойдётся с
 * суммой его же строк.
 */
export function calculateTotals(
  lines: OfferLineInput[],
  vatRateBp: number,
): OfferTotals {
  const withTotals = lines.map((line) => ({
    lineNetCents: lineTotalCents(line.qty, line.unitPriceCents),
  }));

  const totalNetCents = sumCents(withTotals.map((l) => l.lineNetCents));
  const vat = vatAmountCents(totalNetCents, vatRateBp);

  return {
    lines: withTotals,
    totalNetCents,
    vatAmountCents: vat,
    totalGrossCents: totalNetCents + vat,
  };
}

/** Правило 9.2: без правовых блоков предложение не сохраняется. */
export function checkLegalBlocks(blocks: {
  warrantyText: string;
  parkingText: string;
  scopeText: string;
}): OfferDenied | null {
  if (!blocks.warrantyText.trim()) {
    return new OfferDenied(
      "warranty_missing",
      "Ohne Gewährleistungstext kann kein Angebot gespeichert werden. " +
        "Bitte zuerst in den Firmeneinstellungen hinterlegen.",
    );
  }
  if (!blocks.parkingText.trim()) {
    return new OfferDenied(
      "parking_missing",
      "Ohne Hinweis zum Parken kann kein Angebot gespeichert werden. " +
        "Bitte zuerst in den Firmeneinstellungen hinterlegen.",
    );
  }
  if (!blocks.scopeText.trim()) {
    return new OfferDenied(
      "scope_missing",
      "Ohne Umfangs-Vorbehalt kann kein Angebot gespeichert werden. " +
        "Bitte zuerst in den Firmeneinstellungen hinterlegen.",
    );
  }
  return null;
}

/** Предложение без позиций смысла не имеет. */
export function checkLines(lines: OfferLineInput[]): OfferDenied | null {
  if (lines.length === 0) {
    return new OfferDenied("no_lines", "Das Angebot enthält keine Positionen");
  }
  for (const line of lines) {
    if (!line.description.trim()) {
      return new OfferDenied(
        "line_without_description",
        "Jede Position braucht eine Beschreibung",
      );
    }
  }
  return null;
}

/**
 * Правило 9.1: отправить можно только предложение с ценой, подтверждённой
 * владельцем.
 *
 * Проверяются оба условия сразу. Признак `priceApproved` снимается при любом
 * изменении цены, поэтому «цена есть, но флаг снят» — это правка, которую
 * владелец ещё не видел.
 */
export function checkCanSend(deal: {
  priceNetCents: number | null;
  priceApproved: boolean;
}): OfferDenied | null {
  if (deal.priceNetCents === null) {
    return new OfferDenied(
      "price_missing",
      "Ohne Preis kann kein Angebot versendet werden",
    );
  }
  if (!deal.priceApproved) {
    return new OfferDenied(
      "price_not_approved",
      "Der Preis ist nicht vom Inhaber freigegeben. " +
        "Ohne Freigabe darf kein Angebot rausgehen.",
    );
  }
  return null;
}

/** Уже отправленное предложение не переписывается — выпускается новая версия. */
export function checkCanEdit(offer: {
  status: string;
  sentAt: Date | null;
}): OfferDenied | null {
  if (offer.sentAt || offer.status !== "ENTWURF") {
    return new OfferDenied(
      "already_sent",
      "Ein versendetes Angebot wird nicht geändert. " +
        "Bitte eine neue Version anlegen.",
    );
  }
  return null;
}
