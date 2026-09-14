/**
 * Хеширование паролей.
 *
 * Используется scrypt из встроенного модуля node:crypto — без внешних
 * зависимостей и без нативных сборок, которые ломаются в Alpine-образе.
 * scrypt входит в список рекомендованных OWASP функций для паролей.
 *
 * Формат хранения: scrypt$N$r$p$<соль base64>$<хеш base64>
 * Параметры лежат в самой строке, поэтому их можно будет усилить позже,
 * не ломая уже сохранённые пароли: старые проверятся своими параметрами.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

// promisify выбирает перегрузку без опций, поэтому объявляем сигнатуру сами.
const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/** Стоимость: 2^16 итераций, 64 МБ памяти на одну проверку. */
const N = 65536;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** scrypt требует лимит памяти выше, чем 32 МБ по умолчанию в Node. */
const MAX_MEM = 128 * N * R * 2;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEM,
  }));

  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/**
 * Проверка пароля. Никогда не бросает исключение на повреждённой строке —
 * возвращает false, чтобы сломанная запись в базе не превращалась в отказ
 * всей формы входа.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;

    const n = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = Buffer.from(parts[4] ?? "", "base64");
    const expected = Buffer.from(parts[5] ?? "", "base64");

    if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
      return false;
    }
    if (salt.length === 0 || expected.length === 0) return false;

    const derived = (await scryptAsync(
      password.normalize("NFKC"),
      salt,
      expected.length,
      { N: n, r, p, maxmem: 128 * n * r * 2 },
    ));

    // Сравнение за постоянное время: обычное === выдаёт длину совпадения
    // по времени работы.
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Требования к паролю. Намеренно скромные по составу символов и строгие по
 * длине: правила вида «одна заглавная и один спецсимвол» на практике дают
 * Passwort1! и записку под клавиатурой.
 */
export const PASSWORD_MIN_LENGTH = 12;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`;
  }
  if (password.length > 200) {
    return "Passwort ist zu lang (maximal 200 Zeichen)";
  }
  return null;
}
