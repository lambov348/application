import { describe, expect, it, beforeAll } from "vitest";
import {
  checkAccess,
  checkCanStartTime,
  checkCanUploadPhoto,
  checkPhotosForStatus,
  checkStatusChangeSync,
} from "./job";
import type { CurrentUser } from "@/server/auth/guards";

beforeAll(() => {
  process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/d";
  process.env.AUTH_SECRET ??= "a".repeat(40);
  process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
});

const user = (role: CurrentUser["role"], id = "u1"): CurrentUser => ({
  id,
  name: "Test",
  email: "t@example.de",
  role,
  active: true,
  locale: "DE",
});

describe("доступ к выезду", () => {
  it("монтажник работает только со своими выездами", () => {
    const job = { assigneeIds: ["u2", "u3"] };
    expect(checkAccess(job, user("MONTEUR", "u1"))?.code).toBe("not_assigned");
    expect(checkAccess(job, user("MONTEUR", "u2"))).toBeNull();
  });

  it("владелец и диспетчер видят любые", () => {
    const job = { assigneeIds: [] };
    expect(checkAccess(job, user("INHABER"))).toBeNull();
    expect(checkAccess(job, user("DISPONENT"))).toBeNull();
  });
});

describe("смена статуса", () => {
  it("пропускает движение вперёд", () => {
    expect(checkStatusChangeSync({ status: "GEPLANT" }, "UNTERWEGS")).toBeNull();
  });

  it("не даёт откатить статус назад", () => {
    expect(
      checkStatusChangeSync({ status: "IN_ARBEIT" }, "UNTERWEGS")?.code,
    ).toBe("backwards");
  });

  it("не трогает отменённый выезд", () => {
    expect(checkStatusChangeSync({ status: "ABGESAGT" }, "FERTIG")?.code).toBe(
      "cancelled",
    );
  });

  it("отменить выезд из кабинета нельзя", () => {
    expect(checkStatusChangeSync({ status: "GEPLANT" }, "ABGESAGT")?.code).toBe(
      "cancel_not_here",
    );
  });

  it("повторное нажатие той же кнопки не ошибка сети, а тот же статус", () => {
    expect(checkStatusChangeSync({ status: "FERTIG" }, "FERTIG")?.code).toBe(
      "same_status",
    );
  });
});

describe("обязательные фотографии (глава 5.6.4)", () => {
  const min = { before: 2, after: 2 };

  it("не пускает в работу без снимков «до»", () => {
    expect(
      checkPhotosForStatus("IN_ARBEIT", { vorher: 1, nachher: 0 }, min)?.code,
    ).toBe("photos_before_missing");
    expect(
      checkPhotosForStatus("IN_ARBEIT", { vorher: 2, nachher: 0 }, min),
    ).toBeNull();
  });

  it("не даёт закончить без снимков «после»", () => {
    expect(
      checkPhotosForStatus("FERTIG", { vorher: 2, nachher: 1 }, min)?.code,
    ).toBe("photos_after_missing");
    expect(
      checkPhotosForStatus("FERTIG", { vorher: 2, nachher: 2 }, min),
    ).toBeNull();
  });

  it("на промежуточных статусах фотографий не требует", () => {
    expect(
      checkPhotosForStatus("UNTERWEGS", { vorher: 0, nachher: 0 }, min),
    ).toBeNull();
    expect(
      checkPhotosForStatus("ANGEKOMMEN", { vorher: 0, nachher: 0 }, min),
    ).toBeNull();
  });

  it("слушается настроек владельца", () => {
    expect(
      checkPhotosForStatus("FERTIG", { vorher: 0, nachher: 1 }, { before: 0, after: 1 }),
    ).toBeNull();
  });
});

describe("фотографии и подписанный протокол", () => {
  it("после подписи клиента снимки не добавляются", () => {
    expect(
      checkCanUploadPhoto({
        status: "FERTIG",
        handoverSignedAt: new Date(),
      })?.code,
    ).toBe("handover_signed");
  });

  it("до подписи можно", () => {
    expect(
      checkCanUploadPhoto({ status: "IN_ARBEIT", handoverSignedAt: null }),
    ).toBeNull();
  });
});

describe("учёт времени", () => {
  it("не начинается до выезда", () => {
    expect(checkCanStartTime({ status: "GEPLANT" }, false)?.code).toBe(
      "not_started",
    );
  });

  it("не запускается дважды", () => {
    expect(checkCanStartTime({ status: "IN_ARBEIT" }, true)?.code).toBe(
      "already_running",
    );
  });

  it("запускается в пути — дорога тоже работа", () => {
    expect(checkCanStartTime({ status: "UNTERWEGS" }, false)).toBeNull();
  });
});
