import { describe, expect, it } from "vitest";
import { normalizePhone, phoneSearchDigits, formatPhone } from "./phone";

describe("нормализация телефона", () => {
  it("сводит разные написания одного номера к одному значению", () => {
    const expected = "4917679892037";
    for (const written of [
      "+49 176 79892037",
      "+49 (176) 79892037",
      "0049 176 79892037",
      "0176 79892037",
      "0176/79892037",
      "0176-798-920-37",
      "  0176 79892037  ",
    ]) {
      expect(normalizePhone(written), written).toBe(expected);
    }
  });

  it("узнаёт городской берлинский номер", () => {
    expect(normalizePhone("030 12345678")).toBe("493012345678");
    expect(normalizePhone("+49 30 12345678")).toBe("493012345678");
  });

  it("не принимает за номер слишком короткую строку", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("Hausnr. 12")).toBeNull();
  });

  it("сохраняет чужой код страны", () => {
    expect(normalizePhone("+380 67 1234567")).toBe("380671234567");
    expect(normalizePhone("0043 660 1234567")).toBe("436601234567");
  });
});

describe("поиск по обрывку номера", () => {
  it("отбрасывает национальный префикс, чтобы найти международную запись", () => {
    expect(phoneSearchDigits("0176")).toBe("176");
    expect(phoneSearchDigits("0049176")).toBe("49176");
  });

  it("игнорирует разделители", () => {
    expect(phoneSearchDigits("798 920")).toBe("798920");
  });

  it("не считает поиском по номеру пару символов", () => {
    expect(phoneSearchDigits("Sch")).toBeNull();
    expect(phoneSearchDigits("12")).toBeNull();
  });
});

describe("показ номера", () => {
  it("разбивает мобильный на код и номер", () => {
    expect(formatPhone("017679892037")).toBe("+49 176 79892037");
  });

  it("разбивает городской", () => {
    expect(formatPhone("03012345678")).toBe("+49 30 12345678");
  });

  it("не теряет то, что ввёл человек, если номер не распознан", () => {
    expect(formatPhone("Termin klären")).toBe("Termin klären");
    expect(formatPhone("")).toBe("");
  });
});
