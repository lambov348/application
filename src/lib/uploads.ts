import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

// Локальное хранилище фото для MVP.
// Важно: файлы храним ВНЕ папки public, потому что `next start` отдаёт public
// снимком на момент сборки и не видит файлы, добавленные во время работы.
// Поэтому файлы лежат в ./storage/uploads и отдаются через route-handler
// /uploads/[name] (см. src/app/uploads/[name]/route.ts) — работает и в dev, и в prod.
// В проде это легко заменить на S3, не меняя вызывающий код.

export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8 МБ на файл

// Сохраняет список файлов из FormData и возвращает массив публичных путей.
// Пустые/неверные файлы молча пропускаются, чтобы не ломать отправку формы.
export async function saveUploadedFiles(files: File[]): Promise<string[]> {
  const valid = files.filter(
    (f) => f && f.size > 0 && f.size <= MAX_BYTES && ALLOWED.includes(f.type)
  );
  if (valid.length === 0) return [];

  await mkdir(UPLOAD_DIR, { recursive: true });

  const paths: string[] = [];
  for (const file of valid) {
    const ext = extFor(file.type);
    const name = `${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, name), buffer);
    paths.push(`/uploads/${name}`);
  }
  return paths;
}

function extFor(mime: string): string {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
  }
}
