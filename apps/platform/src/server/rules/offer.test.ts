import { describe, expect, it } from "vitest";
import {
  calculateTotals,
  checkLegalBlocks,
  checkLines,
  checkCanSend,
  checkCanEdit,
} from "./offer";
import { VAT_19 } from "@/lib/money";

const fullBlocks = {
  warrantyText: "12 Monate Gewährleistung",
  parkingText: "Bitte Parkplatz freihalten",
  scopeText: "Preis gilt für den beschriebenen Umfang",
};

describe("итоги предложения", () => {
  it("складывает позиции и считает НДС", () => {
    const totals = calculateTotals(
      [
        { description: "Küchenmontage", qty: 1, unitPriceCents: 89000 },
        { description: "Arbeitsplatte", qty: 2, unitPriceCents: 4500 },
      ],
      VAT_19,
    );
    expect(totals.totalNetCents).toBe(89000 + 9000);
    expect(totals.vatAmountCents).toBe(18620);
    expect(totals.totalGrossCents).toBe(98000 + 18620);
  });

  it("считает почасовую позицию", () => {
    const totals = calculateTotals(
      [{ description: "Stundensatz", qty: "2,5", unitPriceCents: 6500 }],
      VAT_19,
    );
    expect(totals.totalNetCents).toBe(16250);
  });

  it("итог совпадает с суммой округлённых строк", () => {
    // Классическая ловушка: сложить неокруглённое и округлить в конце
    // даёт другой результат, и документ не сходится сам с собой.
    const totals = calculateTotals(
      [
        { description: "a", qty: "0,333", unitPriceCents: 10000 },
        { description: "b", qty: "0,333", unitPriceCents: 10000 },
        { description: "c", qty: "0,333", unitPriceCents: 10000 },
      ],
      VAT_19,
    );
    const sumOfLines = totals.lines.reduce((s, l) => s + l.lineNetCents, 0);
    expect(totals.totalNetCents).toBe(sumOfLines);
    expect(totals.totalNetCents).toBe(3330 * 3);
  });

  it("в режиме Kleinunternehmer НДС нулевой", () => {
    const totals = calculateTotals(
      [{ description: "Montage", qty: 1, unitPriceCents: 50000 }],
      0,
    );
    expect(totals.vatAmountCents).toBe(0);
    expect(totals.totalGrossCents).toBe(50000);
  });

  it("допускает скидочную позицию", () => {
    const totals = calculateTotals(
      [
        { description: "Montage", qty: 1, unitPriceCents: 50000 },
        { description: "Rabatt", qty: 1, unitPriceCents: -5000 },
      ],
      VAT_19,
    );
    expect(totals.totalNetCents).toBe(45000);
  });
});

describe("правило 9.2: правовые блоки обязательны", () => {
  it("пропускает при всех трёх блоках", () => {
    expect(checkLegalBlocks(fullBlocks)).toBeNull();
  });

  it("не пускает без гарантии", () => {
    expect(
      checkLegalBlocks({ ...fullBlocks, warrantyText: "" })?.code,
    ).toBe("warranty_missing");
  });

  it("не пускает без просьбы о парковке", () => {
    expect(
      checkLegalBlocks({ ...fullBlocks, parkingText: "   " })?.code,
    ).toBe("parking_missing");
  });

  it("не пускает без оговорки об объёме", () => {
    expect(checkLegalBlocks({ ...fullBlocks, scopeText: "" })?.code).toBe(
      "scope_missing",
    );
  });
});

describe("правило 9.1: отправка только с подтверждённой ценой", () => {
  it("не пускает без цены", () => {
    expect(
      checkCanSend({ priceNetCents: null, priceApproved: false })?.code,
    ).toBe("price_missing");
  });

  it("не пускает, когда цена есть, но не подтверждена владельцем", () => {
    // Так выглядит цена, изменённая после подтверждения: флаг сбрасывается.
    expect(
      checkCanSend({ priceNetCents: 50000, priceApproved: false })?.code,
    ).toBe("price_not_approved");
  });

  it("пропускает подтверждённую цену", () => {
    expect(
      checkCanSend({ priceNetCents: 50000, priceApproved: true }),
    ).toBeNull();
  });

  it("не считает подтверждённым нулевой флаг при нулевой цене", () => {
    expect(
      checkCanSend({ priceNetCents: 0, priceApproved: false })?.code,
    ).toBe("price_not_approved");
  });
});

describe("позиции", () => {
  it("предложение без позиций не сохраняется", () => {
    expect(checkLines([])?.code).toBe("no_lines");
  });

  it("позиция без описания не сохраняется", () => {
    expect(
      checkLines([{ description: "  ", qty: 1, unitPriceCents: 100 }])?.code,
    ).toBe("line_without_description");
  });
});

describe("отправленное предложение неизменяемо", () => {
  it("черновик править можно", () => {
    expect(checkCanEdit({ status: "ENTWURF", sentAt: null })).toBeNull();
  });

  it("отправленное править нельзя", () => {
    expect(
      checkCanEdit({ status: "GESENDET", sentAt: new Date() })?.code,
    ).toBe("already_sent");
  });

  it("принятое править нельзя", () => {
    expect(
      checkCanEdit({ status: "ANGENOMMEN", sentAt: new Date() })?.code,
    ).toBe("already_sent");
  });
});
