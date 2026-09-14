import { describe, expect, it } from "vitest";
import {
  createTotpSecret,
  createTotpUri,
  currentTotpCode,
  totpCodeAt,
  verifyTotpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  recoveryCodeMatches,
} from "./totp";

describe("второй фактор (TOTP)", () => {
  it("принимает код, выданный по тому же секрету", () => {
    const secret = createTotpSecret();
    expect(verifyTotpCode(secret, currentTotpCode(secret))).toBe(true);
  });

  it("отвергает код от чужого секрета", () => {
    const code = currentTotpCode(createTotpSecret());
    // Теоретически коды могут совпасть (1 к миллиону) — берём другой секрет
    // и считаем тест пройденным, если хотя бы один из десяти не совпал.
    const mismatches = Array.from({ length: 10 }, () =>
      verifyTotpCode(createTotpSecret(), code),
    ).filter((v) => v === false);
    expect(mismatches.length).toBeGreaterThan(0);
  });

  it("терпит пробелы: люди переносят код группами цифр", () => {
    const secret = createTotpSecret();
    const code = currentTotpCode(secret);
    expect(verifyTotpCode(secret, `${code.slice(0, 3)} ${code.slice(3)}`)).toBe(true);
  });

  it("отвергает всё, что не шесть цифр", () => {
    const secret = createTotpSecret();
    for (const bad of ["", "12345", "1234567", "abcdef", "12 34 5"]) {
      expect(verifyTotpCode(secret, bad)).toBe(false);
    }
  });

  it("строит ссылку otpauth для аутентификатора", () => {
    const uri = createTotpUri("JBSWY3DPEHPK3PXP", "inhaber@example.de");
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=MoebelStock24");
  });
});

describe("коды восстановления", () => {
  it("выдаёт десять различных кодов", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(codes.every((c) => /^[0-9A-F]{5}-[0-9A-F]{5}$/.test(c))).toBe(true);
  });

  it("узнаёт свой код по хешу", () => {
    const [code] = generateRecoveryCodes();
    const hash = hashRecoveryCode(code!);
    expect(recoveryCodeMatches(code!, hash)).toBe(true);
  });

  it("не зависит от дефиса и регистра при вводе", () => {
    const [code] = generateRecoveryCodes();
    const hash = hashRecoveryCode(code!);
    expect(recoveryCodeMatches(code!.replace("-", "").toLowerCase(), hash)).toBe(true);
  });

  it("отвергает чужой код", () => {
    const codes = generateRecoveryCodes();
    expect(recoveryCodeMatches(codes[1]!, hashRecoveryCode(codes[0]!))).toBe(false);
  });
});

describe("допуск по времени", () => {
  // Регрессия: в otplib 13 допуск задаётся в секундах через epochTolerance и
  // по умолчанию равен нулю. С нулём код, набранный на 31-й секунде, отвергался.
  it("принимает код из предыдущего шага — человек не успел набрать", () => {
    const secret = createTotpSecret();
    const code = totpCodeAt(secret, Date.now() - 29_000);
    expect(verifyTotpCode(secret, code)).toBe(true);
  });

  it("принимает код следующего шага — часы телефона спешат", () => {
    const secret = createTotpSecret();
    const code = totpCodeAt(secret, Date.now() + 29_000);
    expect(verifyTotpCode(secret, code)).toBe(true);
  });

  it("отвергает код, устаревший на несколько минут", () => {
    const secret = createTotpSecret();
    const code = totpCodeAt(secret, Date.now() - 5 * 60_000);
    expect(verifyTotpCode(secret, code)).toBe(false);
  });
});
