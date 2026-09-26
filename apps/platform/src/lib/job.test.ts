import { describe, expect, it } from "vitest";
import {
  formatMinutes,
  isForwardTransition,
  mapsUrl,
  minutesBetween,
  nextJobStatus,
} from "./job";

describe("цепочка статусов выезда", () => {
  it("ведёт от запланированного к готовому", () => {
    expect(nextJobStatus("GEPLANT")).toBe("UNTERWEGS");
    expect(nextJobStatus("UNTERWEGS")).toBe("ANGEKOMMEN");
    expect(nextJobStatus("ANGEKOMMEN")).toBe("IN_ARBEIT");
    expect(nextJobStatus("IN_ARBEIT")).toBe("FERTIG");
  });

  it("после готового дальше некуда", () => {
    expect(nextJobStatus("FERTIG")).toBeNull();
  });

  it("отменённый выезд не двигается", () => {
    expect(nextJobStatus("ABGESAGT")).toBeNull();
    expect(isForwardTransition("ABGESAGT", "UNTERWEGS")).toBe(false);
    expect(isForwardTransition("GEPLANT", "ABGESAGT")).toBe(false);
  });

  it("назад по цепочке нельзя", () => {
    expect(isForwardTransition("IN_ARBEIT", "UNTERWEGS")).toBe(false);
    expect(isForwardTransition("FERTIG", "IN_ARBEIT")).toBe(false);
    expect(isForwardTransition("GEPLANT", "GEPLANT")).toBe(false);
  });

  it("через ступень — можно: в подвале связь ловится не всегда", () => {
    // Монтажник мог не успеть отметить «приехал» и жмёт сразу «в работе».
    expect(isForwardTransition("UNTERWEGS", "FERTIG")).toBe(true);
    expect(isForwardTransition("GEPLANT", "IN_ARBEIT")).toBe(true);
  });
});

describe("время работ", () => {
  it("считает минуты между отметками", () => {
    const start = new Date("2026-03-10T07:00:00Z");
    const end = new Date("2026-03-10T10:25:00Z");
    expect(minutesBetween(start, end)).toBe(205);
  });

  it("не даёт отрицательных минут при кривых часах телефона", () => {
    const start = new Date("2026-03-10T10:00:00Z");
    const end = new Date("2026-03-10T09:00:00Z");
    expect(minutesBetween(start, end)).toBe(0);
  });

  it("пишет длительность по-человечески", () => {
    expect(formatMinutes(205)).toBe("3 Std. 25 Min.");
    expect(formatMinutes(120)).toBe("2 Std.");
    expect(formatMinutes(45)).toBe("45 Min.");
    expect(formatMinutes(205, "ru")).toBe("3 ч 25 мин");
  });
});

describe("ссылка на навигацию", () => {
  it("собирает адрес в запрос Google Maps", () => {
    const url = mapsUrl("Kantstraße 12", "10623", "Berlin");
    expect(url).toContain("destination=Kantstra%C3%9Fe%2012%2C%2010623%20Berlin");
  });
});
