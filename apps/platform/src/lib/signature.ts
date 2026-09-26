/**
 * Проверка подписи клиента, пришедшей с холста (глава 5.6.5 ТЗ).
 *
 * Модуль без зависимостей: подпись — единственное место, где в систему
 * попадает картинка, нарисованная на клиенте, и проверки должны быть
 * покрыты тестами без базы и без Next.
 */
import { inflateSync } from "node:zlib";

/** Предел на подпись: рисунок пальцем на экране телефона меньше на порядок. */
export const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Есть ли в PNG хоть один непрозрачный пиксель.
 *
 * Пустой холст — законная на вид картинка, и без этой проверки протокол
 * подписывался бы пустым прямоугольником. Полотно подписи прозрачное, поэтому
 * у нетронутого изображения все байты после распаковки нулевые: фильтры строк
 * из нулей тоже дают нули.
 */
export function pngHasContent(png: Buffer): boolean {
  const chunks: Buffer[] = [];
  let offset = 8; // подпись формата

  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const start = offset + 8;
    if (start + length > png.length) break;
    if (type === "IDAT") chunks.push(png.subarray(start, start + length));
    if (type === "IEND") break;
    offset = start + length + 4; // + CRC
  }

  if (chunks.length === 0) return false;

  try {
    const raw = inflateSync(Buffer.concat(chunks));
    return raw.some((byte) => byte !== 0);
  } catch {
    return false;
  }
}

/** Разбор data:image/png;base64,… из холста подписи. */
export function decodeSignature(dataUrl: string): Buffer | null {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match?.[1]) return null;

  let data: Buffer;
  try {
    data = Buffer.from(match[1], "base64");
  } catch {
    return null;
  }

  if (data.byteLength === 0 || data.byteLength > MAX_SIGNATURE_BYTES) return null;
  if (!data.subarray(0, 8).equals(PNG_MAGIC)) return null;
  return data;
}
