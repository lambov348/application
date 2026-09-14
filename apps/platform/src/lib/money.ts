/**
 * Деньги.
 *
 * Любая сумма — целое число центов. Ни одного вычисления в дробных числах:
 * 0.1 + 0.2 в двоичной дроби даёт 0.30000000000000004, и на сотне позиций
 * Angebot и счёт разойдутся на цент. Такой счёт бухгалтер вернёт.
 *
 * Правило округления зафиксировано здесь один раз и применяется везде:
 * коммерческое округление (половина уходит от нуля), позиция за позицией,
 * затем суммирование. Иначе сумма «снизу» не сойдётся с суммой «сверху».
 */

/** Ставка НДС в базисных пунктах: 19,00 % → 1900. */
export const VAT_19 = 1900;

/**
 * Коммерческое округление: 0,5 округляется от нуля в обе стороны.
 *
 * Math.round этого не делает: Math.round(-0.5) даёт -0, то есть половина
 * уходит вверх. Для скидочных позиций с отрицательной суммой это ошибка.
 */
export function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Количество в позиции хранится с тремя знаками — переводим в тысячные. */
export function qtyToMilli(qty: number | string): number {
  const value = typeof qty === "string" ? Number(qty.replace(",", ".")) : qty;
  if (!Number.isFinite(value)) {
    throw new Error(`Некорректное количество: ${qty}`);
  }
  return roundHalfAwayFromZero(value * 1000);
}

/**
 * Сумма позиции: количество × цена за единицу.
 * Считается в целых числах, округляется один раз в конце.
 */
export function lineTotalCents(
  qty: number | string,
  unitPriceCents: number,
): number {
  assertInteger(unitPriceCents, "unitPriceCents");
  return roundHalfAwayFromZero((qtyToMilli(qty) * unitPriceCents) / 1000);
}

/** Сумма НДС от нетто. */
export function vatAmountCents(netCents: number, vatRateBp: number): number {
  assertInteger(netCents, "netCents");
  assertInteger(vatRateBp, "vatRateBp");
  if (vatRateBp < 0 || vatRateBp > 10000) {
    throw new Error(`Ставка НДС вне диапазона 0–100 %: ${vatRateBp}`);
  }
  return roundHalfAwayFromZero((netCents * vatRateBp) / 10000);
}

/** Брутто = нетто + НДС. */
export function grossCents(netCents: number, vatRateBp: number): number {
  return netCents + vatAmountCents(netCents, vatRateBp);
}

/**
 * Обратный ход: клиенту назвали цену «под ключ», её надо разложить.
 * Нетто получается вычитанием, чтобы нетто + НДС в точности дали брутто, —
 * иначе на документе сумма не сойдётся с итогом.
 */
export function netFromGrossCents(
  grossValueCents: number,
  vatRateBp: number,
): number {
  assertInteger(grossValueCents, "grossCents");
  const net = roundHalfAwayFromZero(
    (grossValueCents * 10000) / (10000 + vatRateBp),
  );
  // Проверяем, что разложение сходится, и правим на цент, если нет.
  if (grossCents(net, vatRateBp) !== grossValueCents) {
    for (const candidate of [net - 1, net + 1]) {
      if (grossCents(candidate, vatRateBp) === grossValueCents) return candidate;
    }
  }
  return net;
}

/** Итог по списку позиций. Сумма уже округлённых значений, не наоборот. */
export function sumCents(values: number[]): number {
  return values.reduce((sum, v) => {
    assertInteger(v, "Позиция суммы");
    return sum + v;
  }, 0);
}

// ─── Ввод и вывод ───────────────────────────────────────────────────────────

/**
 * Разбор суммы, введённой человеком.
 *
 * Принимает немецкое написание «1.234,56» и обычное «1234.56», знак евро и
 * пробелы. Возвращает null, если это не сумма, — тогда форма покажет ошибку,
 * а не запишет ноль.
 */
export function parseAmountToCents(input: string): number | null {
  const raw = input.trim().replace(/[€\s ]/g, "");
  if (raw === "") return null;

  let normalized = raw;
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // Тот разделитель, что правее, — десятичный: 1.234,56 либо 1,234.56.
    normalized =
      lastComma > lastDot
        ? raw.replace(/\./g, "").replace(",", ".")
        : raw.replace(/,/g, "");
  } else if (lastComma > -1) {
    // Одна запятая: десятичная, если после неё не ровно три цифры.
    const after = raw.length - lastComma - 1;
    normalized = after === 3 ? raw.replace(",", "") : raw.replace(",", ".");
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  return roundHalfAwayFromZero(value * 100);
}

/** Сумма для показа. Валюта фирмы — евро. */
export function formatCents(cents: number, locale = "de-DE"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/** Ставка НДС для показа: 1900 → «19 %». */
export function formatVatRate(vatRateBp: number, locale = "de-DE"): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(vatRateBp / 10000);
}

function assertInteger(value: number, field: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(
      `${field} должно быть целым числом центов, получено ${value}. ` +
        `Дробные суммы в системе не хранятся.`,
    );
  }
}
