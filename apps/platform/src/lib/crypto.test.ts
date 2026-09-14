import { beforeAll, describe, expect, it } from "vitest";

// env.ts проверяет окружение на этапе импорта — заполняем до загрузки модуля.
beforeAll(() => {
  process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/d";
  process.env.AUTH_SECRET ??= "a".repeat(40);
  process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
});

describe("шифрование секретов", () => {
  it("расшифровывает то, что зашифровало", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    const secret = "JBSWY3DPEHPK3PXP";
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("каждый раз даёт разный шифротекст — вектор случайный", async () => {
    const { encryptSecret } = await import("./crypto");
    expect(encryptSecret("gleich")).not.toBe(encryptSecret("gleich"));
  });

  it("отвергает подменённый шифротекст, а не расшифровывает в мусор", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    const payload = encryptSecret("JBSWY3DPEHPK3PXP");
    const parts = payload.split(".");
    const data = Buffer.from(parts[3]!, "base64url");
    data[0] = data[0]! ^ 0xff; // меняем один бит
    parts[3] = data.toString("base64url");

    expect(() => decryptSecret(parts.join("."))).toThrow();
  });

  it("отвергает мусор вместо шифротекста", async () => {
    const { decryptSecret } = await import("./crypto");
    expect(() => decryptSecret("мусор")).toThrow();
    expect(() => decryptSecret("v1.a.b.c")).toThrow();
  });
});
