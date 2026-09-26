import { describe, expect, it } from "vitest";
import {
  signPayload,
  verifySignature,
  TIMESTAMP_TOLERANCE_SECONDS,
} from "./webhook-signature";

const SECRET = "0123456789abcdef0123456789abcdef";
const BODY = JSON.stringify({ phone: "0176 79892037", message: "Küche montieren" });
const NOW = 1_800_000_000;

describe("подпись вебхука заявок", () => {
  it("принимает правильно подписанный запрос", () => {
    const sig = signPayload(BODY, NOW, SECRET);
    expect(verifySignature(BODY, sig, String(NOW), SECRET, NOW).ok).toBe(true);
    // Написание с префиксом — как у GitHub и Stripe.
    expect(
      verifySignature(BODY, `sha256=${sig}`, String(NOW), SECRET, NOW).ok,
    ).toBe(true);
  });

  it("не принимает запрос без подписи или метки времени", () => {
    const sig = signPayload(BODY, NOW, SECRET);
    expect(verifySignature(BODY, null, String(NOW), SECRET, NOW)).toEqual({
      ok: false,
      reason: "signature_missing",
    });
    expect(verifySignature(BODY, sig, null, SECRET, NOW)).toEqual({
      ok: false,
      reason: "timestamp_missing",
    });
  });

  it("не принимает подпись чужим секретом", () => {
    const sig = signPayload(BODY, NOW, "falsches-geheimnis");
    expect(verifySignature(BODY, sig, String(NOW), SECRET, NOW)).toEqual({
      ok: false,
      reason: "signature_mismatch",
    });
  });

  it("замечает подмену тела при верной подписи", () => {
    // Классическая попытка: подпись настоящая, а данные подменены.
    const sig = signPayload(BODY, NOW, SECRET);
    const tampered = BODY.replace("79892037", "11111111");
    expect(verifySignature(tampered, sig, String(NOW), SECRET, NOW).ok).toBe(false);
  });

  it("не принимает повторную отправку старого запроса", () => {
    const old = NOW - TIMESTAMP_TOLERANCE_SECONDS - 1;
    const sig = signPayload(BODY, old, SECRET);
    expect(verifySignature(BODY, sig, String(old), SECRET, NOW)).toEqual({
      ok: false,
      reason: "timestamp_out_of_range",
    });
  });

  it("прощает небольшое расхождение часов в обе стороны", () => {
    for (const shift of [-200, 200]) {
      const ts = NOW + shift;
      const sig = signPayload(BODY, ts, SECRET);
      expect(verifySignature(BODY, sig, String(ts), SECRET, NOW).ok, `${shift}`).toBe(
        true,
      );
    }
  });

  it("не работает без настроенного секрета", () => {
    // Иначе незаполненная переменная окружения открыла бы приём заявок всем.
    expect(verifySignature(BODY, "x", String(NOW), "", NOW)).toEqual({
      ok: false,
      reason: "secret_not_configured",
    });
  });

  it("не спотыкается о мусор вместо метки времени", () => {
    const sig = signPayload(BODY, NOW, SECRET);
    expect(verifySignature(BODY, sig, "gestern", SECRET, NOW)).toEqual({
      ok: false,
      reason: "timestamp_invalid",
    });
  });
});
