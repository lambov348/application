import { describe, expect, it, beforeAll } from "vitest";
import { assertSafeKey, isAllowedImageType, extensionFor } from "./index";

beforeAll(() => {
  process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/d";
  process.env.AUTH_SECRET ??= "a".repeat(40);
  process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
});

describe("проверка ключа файла", () => {
  it("пропускает обычный ключ", () => {
    expect(() =>
      assertSafeKey("appointments/abc123/vorher/x9f2.jpg"),
    ).not.toThrow();
  });

  it("не даёт выйти за пределы хранилища", () => {
    // Классический способ прочитать чужой файл.
    for (const bad of [
      "../etc/passwd",
      "appointments/../../secret",
      "/absolute/path",
      "a\\b",
      "",
    ]) {
      expect(() => assertSafeKey(bad), bad).toThrow();
    }
  });

  it("не пропускает посторонние символы", () => {
    for (const bad of ["a b.jpg", "файл.jpg", "a;rm -rf.jpg", "a\u0000b"]) {
      expect(() => assertSafeKey(bad), bad).toThrow();
    }
  });

  it("не пропускает слишком длинный ключ", () => {
    expect(() => assertSafeKey("a".repeat(301))).toThrow();
  });
});

describe("типы загружаемых файлов", () => {
  it("принимает снимки с телефона", () => {
    for (const type of ["image/jpeg", "image/png", "image/heic", "IMAGE/JPEG"]) {
      expect(isAllowedImageType(type), type).toBe(true);
    }
  });

  it("не принимает всё остальное", () => {
    for (const type of [
      "application/pdf",
      "text/html",
      "image/svg+xml", // svg умеет исполнять скрипты
      "application/octet-stream",
    ]) {
      expect(isAllowedImageType(type), type).toBe(false);
    }
  });

  it("расширение берётся из типа, а не из имени файла", () => {
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/heic")).toBe("heic");
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("что-угодно")).toBe("jpg");
  });
});
