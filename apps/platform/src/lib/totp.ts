/**
 * Второй фактор входа (TOTP, RFC 6238) — обязателен для роли Inhaber
 * по главе 4 ТЗ.
 *
 * Совместим с Google Authenticator, Aegis, 1Password, Microsoft Authenticator.
 * Приложение-аутентификатор работает без интернета и без внешнего сервиса:
 * SMS или сторонний провайдер не задействованы, ничего наружу не уходит.
 */
import {
  generateSecret,
  generateSync,
  generateURI,
  verifySync,
} from "otplib";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Допуск в секундах в каждую сторону. Шаг TOTP — 30 секунд, и по умолчанию
 * otplib не даёт допуска вовсе: код, введённый на 31-й секунде, отвергался бы.
 * Один шаг в каждую сторону — обычный компромисс между удобством и строгостью.
 */
const EPOCH_TOLERANCE_SECONDS = 30;

/** Новый секрет в base32 — его пользователь сканирует или вводит руками. */
export function createTotpSecret(): string {
  return generateSecret();
}

/**
 * Ссылка otpauth:// для QR-кода.
 * `label` — то, что человек увидит в списке своего аутентификатора.
 */
export function createTotpUri(secret: string, accountEmail: string): string {
  return generateURI({
    secret,
    strategy: "totp",
    issuer: "MoebelStock24",
    label: accountEmail,
  });
}

/**
 * Код для заданного момента. Без аргумента — текущий.
 * Нужен тестам и скрипту создания владельца; в вебе не используется.
 */
export function totpCodeAt(secret: string, atMs: number = Date.now()): string {
  // otplib ждёт epoch в секундах, а Date.now() отдаёт миллисекунды.
  return generateSync({
    secret,
    strategy: "totp",
    epoch: Math.floor(atMs / 1000),
  });
}

export function currentTotpCode(secret: string): string {
  return totpCodeAt(secret);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  // Люди читают код из приложения группами по три цифры и переносят пробелы.
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  try {
    const result = verifySync({
      token: normalized,
      secret,
      strategy: "totp",
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
    });
    return result.valid;
  } catch {
    return false;
  }
}

// ─── Коды восстановления ────────────────────────────────────────────────────

const RECOVERY_CODE_COUNT = 10;

/**
 * Коды показываются пользователю ровно один раз при подключении 2FA.
 * В базу идут только хеши: восстановить код из дампа нельзя.
 *
 * SHA-256 без соли здесь уместен, в отличие от паролей: код — это 40 бит
 * случайности, перебрать его словарём невозможно, а подбор упирается в те же
 * 2^40 вариантов.
 */
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase(); // 10 символов
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.replace(/[\s-]/g, "").toUpperCase();
  return createHash("sha256").update(normalized).digest("hex");
}

export function recoveryCodeMatches(code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashRecoveryCode(code), "hex");
  const expected = Buffer.from(storedHash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
