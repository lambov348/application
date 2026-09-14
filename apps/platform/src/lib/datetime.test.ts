import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  toLocalInputValue,
  fromLocalInputValue,
} from "./datetime";

describe("показ времени в Берлине", () => {
  it("зимой прибавляет один час к UTC", () => {
    // 1 января 08:00 UTC = 09:00 в Берлине (CET, +01:00)
    const winter = new Date("2026-01-01T08:00:00Z");
    expect(formatDateTime(winter)).toContain("09:00");
  });

  it("летом прибавляет два часа", () => {
    // 1 июля 08:00 UTC = 10:00 в Берлине (CEST, +02:00)
    const summer = new Date("2026-07-01T08:00:00Z");
    expect(formatDateTime(summer)).toContain("10:00");
  });
});

describe("поле ввода даты и времени", () => {
  it("показывает берлинское время, а не UTC", () => {
    expect(toLocalInputValue(new Date("2026-07-01T08:00:00Z"))).toBe(
      "2026-07-01T10:00",
    );
    expect(toLocalInputValue(new Date("2026-01-01T08:00:00Z"))).toBe(
      "2026-01-01T09:00",
    );
  });

  it("возвращает введённое берлинское время в UTC", () => {
    expect(fromLocalInputValue("2026-07-01T10:00")?.toISOString()).toBe(
      "2026-07-01T08:00:00.000Z",
    );
    expect(fromLocalInputValue("2026-01-01T09:00")?.toISOString()).toBe(
      "2026-01-01T08:00:00.000Z",
    );
  });

  it("выдерживает переход на летнее время", () => {
    // Часы переводят 29 марта 2026 в 02:00 → 03:00.
    // Выезд накануне вечером — ещё зимнее время.
    const before = fromLocalInputValue("2026-03-28T09:00");
    expect(before?.toISOString()).toBe("2026-03-28T08:00:00.000Z");

    // Выезд на следующий день после перевода — уже летнее.
    const after = fromLocalInputValue("2026-03-30T09:00");
    expect(after?.toISOString()).toBe("2026-03-30T07:00:00.000Z");
  });

  it("выдерживает переход на зимнее время", () => {
    // Часы переводят 25 октября 2026 в 03:00 → 02:00.
    expect(fromLocalInputValue("2026-10-24T09:00")?.toISOString()).toBe(
      "2026-10-24T07:00:00.000Z",
    );
    expect(fromLocalInputValue("2026-10-26T09:00")?.toISOString()).toBe(
      "2026-10-26T08:00:00.000Z",
    );
  });

  it("возвращается к тому же значению после двух преобразований", () => {
    for (const local of [
      "2026-01-15T07:30",
      "2026-06-15T14:45",
      "2026-03-29T05:00",
      "2026-10-25T05:00",
    ]) {
      const utc = fromLocalInputValue(local);
      expect(utc, local).not.toBeNull();
      expect(toLocalInputValue(utc!), local).toBe(local);
    }
  });

  it("отвергает мусор вместо даты", () => {
    for (const bad of ["", "завтра", "2026-13-01T09:00x", "01.10.2026 09:00"]) {
      expect(fromLocalInputValue(bad), bad).toBeNull();
    }
  });
});
