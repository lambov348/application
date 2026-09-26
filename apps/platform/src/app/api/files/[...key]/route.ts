/**
 * Выдача файлов из хранилища с проверкой прав.
 *
 * Прямых ссылок на хранилище нет намеренно: фотографии из квартир клиентов
 * и подписи — персональные данные (глава 3 ТЗ), и открываться они должны
 * только тем, кто имеет отношение к выезду.
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/guards";
import { assertSafeKey, storage } from "@/lib/storage";
import { canReadFile } from "@/server/jobs/file-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const user = await getCurrentUser();
  // Не перенаправляем на вход: это запрос картинки, а не переход по странице.
  if (!user) return new NextResponse(null, { status: 401 });

  const { key: segments } = await params;
  const key = segments.join("/");

  try {
    assertSafeKey(key);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // «Нет прав» и «нет файла» отвечают одинаково: иначе по кодам ответа
  // можно перебором узнать, какие выезды существуют.
  if (!(await canReadFile(key, user))) {
    return new NextResponse(null, { status: 404 });
  }

  const file = await storage().get(key);
  if (!file) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.data.byteLength),
      // Файл под ключом неизменяем, но кеш только приватный: общий кеш
      // прокси не должен хранить чужие фотографии.
      "Cache-Control": "private, max-age=86400, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
