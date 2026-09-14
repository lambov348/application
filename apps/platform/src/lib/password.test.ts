import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "./password";

describe("хеширование паролей", () => {
  it("принимает верный пароль", async () => {
    const hash = await hashPassword("Küchenmontage2026!");
    expect(await verifyPassword("Küchenmontage2026!", hash)).toBe(true);
  });

  it("отвергает неверный пароль", async () => {
    const hash = await hashPassword("Küchenmontage2026!");
    expect(await verifyPassword("Kuechenmontage2026!", hash)).toBe(false);
  });

  it("даёт разный хеш при одинаковом пароле — соль случайная", async () => {
    const a = await hashPassword("gleichesPasswort");
    const b = await hashPassword("gleichesPasswort");
    expect(a).not.toBe(b);
    expect(await verifyPassword("gleichesPasswort", a)).toBe(true);
    expect(await verifyPassword("gleichesPasswort", b)).toBe(true);
  });

  it("хранит параметры в самой строке — их можно усилить позже", async () => {
    const hash = await hashPassword("egal");
    expect(hash.startsWith("scrypt$65536$8$1$")).toBe(true);
  });

  it("нормализует юникод: ü из одного и из двух символов — один пароль", async () => {
    const composed = "Müller-Passwort"; // ü одним символом
    const decomposed = "Müller-Passwort"; // u + комбинирующий умляут
    const hash = await hashPassword(composed);
    expect(await verifyPassword(decomposed, hash)).toBe(true);
  });

  it("не падает на повреждённой строке, а возвращает false", async () => {
    for (const broken of ["", "мусор", "scrypt$1$2$3", "scrypt$a$b$c$d$e"]) {
      expect(await verifyPassword("egal", broken)).toBe(false);
    }
  });

  it("требует минимум 12 символов", () => {
    expect(validatePasswordStrength("kurz")).not.toBeNull();
    expect(validatePasswordStrength("a".repeat(12))).toBeNull();
    expect(validatePasswordStrength("a".repeat(201))).not.toBeNull();
  });
});
