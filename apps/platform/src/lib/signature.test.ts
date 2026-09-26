import { describe, expect, it, beforeAll } from "vitest";
import { deflateSync } from "node:zlib";
import { decodeSignature, pngHasContent } from "./signature";

beforeAll(() => {
  process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/d";
  process.env.AUTH_SECRET ??= "a".repeat(40);
  process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
});

/** Минимальный корректный PNG указанного размера из заданных пикселей. */
function png(width: number, height: number, fill: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "ascii");
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 бит на канал
  ihdr[9] = 6; // RGBA
  // Строка: байт фильтра 0 + пиксели.
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 4, fill)]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("подпись клиента", () => {
  it("читает PNG из холста", () => {
    const image = png(4, 2, 0x11);
    const url = `data:image/png;base64,${image.toString("base64")}`;
    expect(decodeSignature(url)?.equals(image)).toBe(true);
  });

  it("не принимает посторонние данные вместо подписи", () => {
    for (const bad of [
      "",
      "data:image/png;base64,",
      "data:image/jpeg;base64,AAAA",
      "javascript:alert(1)",
      // Правильная оболочка, но внутри не PNG: подменить содержимое легко.
      `data:image/png;base64,${Buffer.from("nicht png").toString("base64")}`,
    ]) {
      expect(decodeSignature(bad), bad).toBeNull();
    }
  });

  it("отличает подпись от пустого холста", () => {
    // Нетронутый холст прозрачен: все байты после распаковки нулевые.
    expect(pngHasContent(png(20, 10, 0x00))).toBe(false);
    // Хоть один штрих — уже подпись.
    expect(pngHasContent(png(20, 10, 0x01))).toBe(true);
  });

  it("считает испорченный PNG пустым, а не подписью", () => {
    const broken = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(10, 0x41),
    ]);
    expect(pngHasContent(broken)).toBe(false);
  });
});
