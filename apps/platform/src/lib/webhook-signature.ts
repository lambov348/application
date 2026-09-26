/**
 * Подпись вебхука приёма заявок.
 *
 * Вынесено отдельным модулем без зависимостей: это единственный вход в
 * систему без пароля, и проверка обязана быть покрыта тестами без базы.
 * Формат подписи — HMAC-SHA256 от «метка времени + точка + тело».
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Допуск по времени. Пять минут: защищает от повторной отправки
 * перехваченного запроса, но прощает расхождение часов между серверами.
 */
export const TIMESTAMP_TOLERANCE_SECONDS = 300;

export const SIGNATURE_HEADER = "x-ms24-signature";
export const TIMESTAMP_HEADER = "x-ms24-timestamp";

/** Подпись, которую должна поставить форма сайта. */
export function signPayload(
  rawBody: string,
  timestamp: string | number,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

export function verifySignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): { ok: true } | { ok: false; reason: string } {
  if (!secret) return { ok: false, reason: "secret_not_configured" };
  if (!signature) return { ok: false, reason: "signature_missing" };
  if (!timestamp) return { ok: false, reason: "timestamp_missing" };

  const sent = Number(timestamp);
  if (!Number.isFinite(sent)) return { ok: false, reason: "timestamp_invalid" };
  if (Math.abs(nowSeconds - sent) > TIMESTAMP_TOLERANCE_SECONDS) {
    return { ok: false, reason: "timestamp_out_of_range" };
  }

  const expected = signPayload(rawBody, timestamp, secret);

  // Подпись может прийти как «sha256=…» — принимаем оба написания.
  const given = signature.startsWith("sha256=") ? signature.slice(7) : signature;

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given.trim().toLowerCase(), "utf8");
  // Сравнение постоянного времени: посимвольное сравнение подсказывает
  // подбирающему, сколько знаков он угадал.
  if (a.length !== b.length) return { ok: false, reason: "signature_mismatch" };
  if (!timingSafeEqual(a, b)) return { ok: false, reason: "signature_mismatch" };

  return { ok: true };
}
