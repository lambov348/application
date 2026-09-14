import { describe, expect, it } from "vitest";
import {
  checkTransitionSync,
  statusSideEffects,
  BOARD_STATUSES,
  LOST_STATUS,
  type DealForTransition,
} from "./deal-status";

const withAddress: DealForTransition = {
  id: "d1",
  status: "BESTAETIGT",
  addressId: "a1",
  customer: { lastName: "Schmidt", company: null },
};

describe("правило 9.7: Verloren требует причину", () => {
  it("не пускает без причины", () => {
    const denied = checkTransitionSync(withAddress, LOST_STATUS, {});
    expect(denied?.code).toBe("lost_reason_required");
  });

  it("пропускает с причиной", () => {
    expect(
      checkTransitionSync(withAddress, LOST_STATUS, { lostReason: "ZU_TEUER" }),
    ).toBeNull();
  });
});

describe("правило 9.3: Termin требует адрес и имя", () => {
  it("не пускает без адреса", () => {
    const denied = checkTransitionSync(
      { ...withAddress, addressId: null },
      "TERMIN_GEPLANT",
      {},
    );
    expect(denied?.code).toBe("address_required");
  });

  it("не пускает без фамилии и без фирмы", () => {
    const denied = checkTransitionSync(
      { ...withAddress, customer: { lastName: null, company: null } },
      "TERMIN_GEPLANT",
      {},
    );
    expect(denied?.code).toBe("customer_name_required");
  });

  it("фирмы достаточно вместо фамилии", () => {
    expect(
      checkTransitionSync(
        { ...withAddress, customer: { lastName: null, company: "Möbel GmbH" } },
        "TERMIN_GEPLANT",
        {},
      ),
    ).toBeNull();
  });

  it("пропускает, когда есть и адрес, и фамилия", () => {
    expect(checkTransitionSync(withAddress, "TERMIN_GEPLANT", {})).toBeNull();
  });
});

describe("свободное перемещение по доске", () => {
  it("разрешает движение вперёд и назад между обычными колонками", () => {
    // Диспетчер должен иметь возможность вернуть карточку, если поторопился.
    const movable = BOARD_STATUSES.filter(
      (s) => s !== "TERMIN_GEPLANT" && s !== "AUSGEFUEHRT",
    );
    for (const from of movable) {
      for (const to of movable) {
        expect(
          checkTransitionSync({ ...withAddress, status: from }, to, {}),
          `${from} → ${to}`,
        ).toBeNull();
      }
    }
  });

  it("перевод в тот же статус ничего не требует", () => {
    expect(
      checkTransitionSync({ ...withAddress, status: LOST_STATUS }, LOST_STATUS, {}),
    ).toBeNull();
  });
});

describe("сопутствующие изменения", () => {
  it("сохраняет причину и заметку при проигрыше", () => {
    expect(
      statusSideEffects(LOST_STATUS, {
        lostReason: "GUENSTIGER_ANBIETER",
        lostNote: " Konkurrent war 200 € günstiger ",
      }),
    ).toEqual({
      status: LOST_STATUS,
      lostReason: "GUENSTIGER_ANBIETER",
      lostNote: "Konkurrent war 200 € günstiger",
    });
  });

  it("стирает причину при возврате заявки в работу", () => {
    // Иначе в карточке осталось бы «слишком дорого» у активной заявки.
    expect(
      statusSideEffects("NACHFASSEN", { lostReason: "ZU_TEUER", lostNote: "x" }),
    ).toEqual({ status: "NACHFASSEN", lostReason: null, lostNote: null });
  });

  it("пустую заметку превращает в отсутствие заметки", () => {
    expect(
      statusSideEffects(LOST_STATUS, { lostReason: "ZU_TEUER", lostNote: "   " }),
    ).toEqual({ status: LOST_STATUS, lostReason: "ZU_TEUER", lostNote: null });
  });
});
