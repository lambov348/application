import { describe, expect, it } from "vitest";
import {
  VAT_19,
  roundHalfAwayFromZero,
  lineTotalCents,
  vatAmountCents,
  grossCents,
  netFromGrossCents,
  sumCents,
  parseAmountToCents,
  formatCents,
  formatVatRate,
} from "./money";

describe("округление", () => {
  it("половину уводит от нуля в обе стороны", () => {
    expect(roundHalfAwayFromZero(0.5)).toBe(1);
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
    expect(roundHalfAwayFromZero(1.5)).toBe(2);
    expect(roundHalfAwayFromZero(-1.5)).toBe(-2);
    expect(roundHalfAwayFromZero(2.4)).toBe(2);
    expect(roundHalfAwayFromZero(-2.4)).toBe(-2);
  });
});

describe("сумма позиции", () => {
  it("считает целые количества", () => {
    // 3 шкафа по 89,00 €
    expect(lineTotalCents(3, 8900)).toBe(26700);
  });

  it("считает дробные часы", () => {
    // 2,5 часа по 65,00 €
    expect(lineTotalCents(2.5, 6500)).toBe(16250);
    expect(lineTotalCents("2,5", 6500)).toBe(16250);
  });

  it("не накапливает ошибку двоичной дроби", () => {
    // 0,1 × 3 в дробных числах даёт 0.30000000000000004
    expect(lineTotalCents(0.1, 300)).toBe(30);
    expect(lineTotalCents(0.3, 1000)).toBe(300);
    expect(lineTotalCents(1.1, 1010)).toBe(1111);
  });

  it("допускает скидочную позицию с отрицательной ценой", () => {
    expect(lineTotalCents(1, -5000)).toBe(-5000);
  });

  it("отвергает дробную цену за единицу", () => {
    expect(() => lineTotalCents(1, 89.5)).toThrow(/целым числом центов/);
  });
});

describe("НДС", () => {
  it("считает 19 % от круглой суммы", () => {
    expect(vatAmountCents(10000, VAT_19)).toBe(1900);
    expect(grossCents(10000, VAT_19)).toBe(11900);
  });

  it("округляет половину цента вверх", () => {
    // 50,05 € × 19 % = 9,5095 € → 9,51 €
    expect(vatAmountCents(5005, VAT_19)).toBe(951);
  });

  it("работает с режимом Kleinunternehmer: ставка ноль", () => {
    expect(vatAmountCents(12345, 0)).toBe(0);
    expect(grossCents(12345, 0)).toBe(12345);
  });

  it("отвергает ставку вне 0–100 %", () => {
    expect(() => vatAmountCents(1000, -1)).toThrow(/вне диапазона/);
    expect(() => vatAmountCents(1000, 10001)).toThrow(/вне диапазона/);
  });
});

describe("разложение цены под ключ", () => {
  it("нетто плюс НДС в точности даёт исходное брутто", () => {
    // Клиенту назвали 500 € под ключ — на документе суммы обязаны сойтись.
    for (const gross of [50000, 11900, 100, 99, 1, 123457, 777]) {
      const net = netFromGrossCents(gross, VAT_19);
      expect(grossCents(net, VAT_19), `брутто ${gross}`).toBe(gross);
    }
  });

  it("при нулевой ставке нетто равно брутто", () => {
    expect(netFromGrossCents(12345, 0)).toBe(12345);
  });
});

describe("итог по позициям", () => {
  it("складывает уже округлённые суммы", () => {
    const lines = [
      lineTotalCents(2.5, 6500), // 162,50
      lineTotalCents(1, 8900), //  89,00
      lineTotalCents(3, 1250), //  37,50
    ];
    expect(sumCents(lines)).toBe(16250 + 8900 + 3750);
  });

  it("отвергает дробное слагаемое", () => {
    expect(() => sumCents([100, 50.5])).toThrow(/целым числом центов/);
  });
});

describe("разбор введённой суммы", () => {
  it("понимает немецкое написание", () => {
    expect(parseAmountToCents("1.234,56")).toBe(123456);
    expect(parseAmountToCents("89,00")).toBe(8900);
    expect(parseAmountToCents("89,5")).toBe(8950);
  });

  it("понимает обычное написание", () => {
    expect(parseAmountToCents("1234.56")).toBe(123456);
    expect(parseAmountToCents("89")).toBe(8900);
  });

  it("понимает разделитель тысяч запятой", () => {
    expect(parseAmountToCents("1,234.56")).toBe(123456);
    expect(parseAmountToCents("1,234")).toBe(123400);
  });

  it("не спотыкается о знак евро и пробелы", () => {
    expect(parseAmountToCents(" 1.234,56 € ")).toBe(123456);
    expect(parseAmountToCents("€89,00")).toBe(8900);
  });

  it("понимает отрицательную сумму для скидки", () => {
    expect(parseAmountToCents("-50,00")).toBe(-5000);
  });

  it("возвращает null вместо нуля, если это не сумма", () => {
    for (const bad of ["", "   ", "ab", "1,2,3", "12.34.56", "—"]) {
      expect(parseAmountToCents(bad), bad).toBeNull();
    }
  });
});

describe("показ сумм", () => {
  // Intl расставляет неразрывные и узкие неразрывные пробелы, причём набор
  // зависит от версии данных локалей в Node. Приводим их к обычному пробелу:
  // иначе тест ломается при обновлении среды, а не при ошибке в коде.
  const plain = (value: string) =>
    value.replace(/[\u00a0\u202f]/g, " ");

  it("немецкий формат", () => {
    expect(plain(formatCents(123456))).toBe("1.234,56 \u20ac");
  });

  it("русский формат", () => {
    expect(plain(formatCents(123456, "ru-RU"))).toBe("1 234,56 \u20ac");
  });

  it("ставка НДС", () => {
    expect(formatVatRate(VAT_19)).toContain("19");
    expect(formatVatRate(700)).toContain("7");
  });
});
