import { describe, expect, it } from "vitest";
import {
  intervalsOverlap,
  findConflicts,
  checkCanPlan,
  checkInterval,
  type ExistingAppointment,
} from "./appointment";

const at = (iso: string) => new Date(iso);

/** Выезд бригады 1: понедельник 08:00–11:00 UTC, адрес A. */
const morning: ExistingAppointment = {
  id: "ap-morning",
  startAt: at("2026-10-05T08:00:00Z"),
  endAt: at("2026-10-05T11:00:00Z"),
  addressId: "adr-A",
  teamId: "team-1",
  dealNumber: 41,
  city: "Berlin",
};

describe("пересечение промежутков", () => {
  it("находит наложение", () => {
    expect(
      intervalsOverlap(
        at("2026-10-05T10:00:00Z"), at("2026-10-05T12:00:00Z"),
        at("2026-10-05T08:00:00Z"), at("2026-10-05T11:00:00Z"),
      ),
    ).toBe(true);
  });

  it("касание концами наложением не считает", () => {
    // Один заканчивается ровно тогда, когда начинается другой.
    expect(
      intervalsOverlap(
        at("2026-10-05T11:00:00Z"), at("2026-10-05T13:00:00Z"),
        at("2026-10-05T08:00:00Z"), at("2026-10-05T11:00:00Z"),
      ),
    ).toBe(false);
  });
});

describe("конфликты бригады", () => {
  it("предупреждает о занятой бригаде", () => {
    const conflicts = findConflicts(
      {
        startAt: at("2026-10-05T10:00:00Z"),
        endAt: at("2026-10-05T12:00:00Z"),
        addressId: "adr-B",
        teamId: "team-1",
      },
      [morning],
      30,
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.code).toBe("overlap");
    expect(conflicts[0]?.dealNumber).toBe(41);
  });

  it("другую бригаду не трогает", () => {
    const conflicts = findConflicts(
      {
        startAt: at("2026-10-05T10:00:00Z"),
        endAt: at("2026-10-05T12:00:00Z"),
        addressId: "adr-B",
        teamId: "team-2",
      },
      [morning],
      30,
    );
    expect(conflicts).toHaveLength(0);
  });

  it("предупреждает о нехватке времени на переезд", () => {
    // Следующий выезд через 10 минут по другому адресу, зазор нужен 30.
    const conflicts = findConflicts(
      {
        startAt: at("2026-10-05T11:10:00Z"),
        endAt: at("2026-10-05T13:00:00Z"),
        addressId: "adr-B",
        teamId: "team-1",
      },
      [morning],
      30,
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.code).toBe("travel_time");
    expect(conflicts[0]?.missingMinutes).toBe(20);
  });

  it("по тому же адресу переезд не нужен", () => {
    // Два заказа в одном доме идут подряд без зазора.
    const conflicts = findConflicts(
      {
        startAt: at("2026-10-05T11:00:00Z"),
        endAt: at("2026-10-05T13:00:00Z"),
        addressId: "adr-A",
        teamId: "team-1",
      },
      [morning],
      30,
    );
    expect(conflicts).toHaveLength(0);
  });

  it("достаточного зазора хватает", () => {
    const conflicts = findConflicts(
      {
        startAt: at("2026-10-05T11:30:00Z"),
        endAt: at("2026-10-05T13:00:00Z"),
        addressId: "adr-B",
        teamId: "team-1",
      },
      [morning],
      30,
    );
    expect(conflicts).toHaveLength(0);
  });

  it("считает зазор и когда новый выезд стоит раньше существующего", () => {
    const conflicts = findConflicts(
      {
        startAt: at("2026-10-05T06:00:00Z"),
        endAt: at("2026-10-05T07:50:00Z"),
        addressId: "adr-B",
        teamId: "team-1",
      },
      [morning],
      30,
    );
    expect(conflicts[0]?.code).toBe("travel_time");
    expect(conflicts[0]?.missingMinutes).toBe(20);
  });

  it("правка того же выезда сама с собой не конфликтует", () => {
    const conflicts = findConflicts(
      {
        id: "ap-morning",
        startAt: at("2026-10-05T09:00:00Z"),
        endAt: at("2026-10-05T12:00:00Z"),
        addressId: "adr-A",
        teamId: "team-1",
      },
      [morning],
      30,
    );
    expect(conflicts).toHaveLength(0);
  });

  it("без бригады конфликтов не ищет", () => {
    expect(
      findConflicts(
        {
          startAt: at("2026-10-05T10:00:00Z"),
          endAt: at("2026-10-05T12:00:00Z"),
          addressId: "adr-B",
          teamId: null,
        },
        [morning],
        30,
      ),
    ).toHaveLength(0);
  });
});

describe("правило 9.3 при создании выезда", () => {
  it("не даёт планировать без адреса", () => {
    expect(
      checkCanPlan({ addressId: null, customer: { lastName: "X", company: null } })?.code,
    ).toBe("address_required");
  });

  it("не даёт планировать без имени клиента", () => {
    expect(
      checkCanPlan({ addressId: "a1", customer: { lastName: null, company: null } })?.code,
    ).toBe("customer_name_required");
  });

  it("пропускает при адресе и фирме", () => {
    expect(
      checkCanPlan({ addressId: "a1", customer: { lastName: null, company: "GmbH" } }),
    ).toBeNull();
  });
});

describe("проверка промежутка", () => {
  it("конец раньше начала", () => {
    expect(
      checkInterval(at("2026-10-05T12:00:00Z"), at("2026-10-05T10:00:00Z"))?.code,
    ).toBe("end_before_start");
  });

  it("нулевая длительность", () => {
    expect(
      checkInterval(at("2026-10-05T10:00:00Z"), at("2026-10-05T10:00:00Z"))?.code,
    ).toBe("end_before_start");
  });

  it("выезд длиннее суток — вероятная опечатка в дате", () => {
    expect(
      checkInterval(at("2026-10-05T08:00:00Z"), at("2026-10-07T08:00:00Z"))?.code,
    ).toBe("too_long");
  });

  it("нормальный рабочий день проходит", () => {
    expect(
      checkInterval(at("2026-10-05T08:00:00Z"), at("2026-10-05T16:00:00Z")),
    ).toBeNull();
  });
});
