/**
 * Симметричное шифрование секретов, которые должны лежать в базе, но не
 * должны быть читаемыми при утечке дампа. Сейчас это секреты TOTP.
 *
 * AES-256-GCM: даёт и шифрование, и проверку целостности — подменённое
 * значение не расшифруется, а не расшифруется «во что-то другое».
 *
 * Ключ — ENCRYPTION_KEY, 32 байта в base64. При его потере все настроенные
 * вторые факторы придётся сбрасывать вручную: расшифровать нечем.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // рекомендованная длина вектора для GCM
const AUTH_TAG_LENGTH = 16;
const PREFIX = "v1";

function key(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, "base64");
}

/** Возвращает строку вида v1.<iv>.<тег>.<шифротекст>, все части в base64url. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Неизвестный формат зашифрованного значения");
  }

  const iv = Buffer.from(parts[1] ?? "", "base64url");
  const tag = Buffer.from(parts[2] ?? "", "base64url");
  const data = Buffer.from(parts[3] ?? "", "base64url");

  if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Повреждённое зашифрованное значение");
  }

  const decipher = createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
