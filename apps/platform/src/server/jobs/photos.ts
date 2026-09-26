/**
 * Приём фотографий с объекта (глава 5.6.4 ТЗ).
 *
 * Одна функция на два входа: обычная форма (работает без JavaScript) и
 * очередь отправки в телефоне, которая дожимает снимки при плохой связи.
 * Проверки прав и правил обязаны быть общими — иначе один из путей
 * рано или поздно окажется дырой.
 *
 * Идемпотентность держится на clientKey: телефон присваивает снимку ключ
 * до отправки, и повторная попытка из очереди не создаёт второй файл.
 */
import { randomBytes } from "node:crypto";
import type { PhotoKind } from "@prisma/client";
import { db } from "@/lib/db";
import {
  MAX_UPLOAD_BYTES,
  extensionFor,
  isAllowedImageType,
  storage,
} from "@/lib/storage";
import { logActivity } from "@/server/activity";
import type { CurrentUser } from "@/server/auth/guards";
import {
  JobDenied,
  checkAccess,
  checkCanUploadPhoto,
  loadJobForRules,
} from "@/server/rules/job";

export type SavePhotoInput = {
  appointmentId: string;
  kind: PhotoKind;
  /** Ключ от телефона. Пустой — сервер придумает свой. */
  clientKey?: string;
  contentType: string;
  data: Buffer;
};

export type SavePhotoResult =
  | { ok: true; id: string; storageKey: string; duplicate: boolean }
  | { ok: false; code: string; message: string };

/** Проверка содержимого по первым байтам: тип из заголовка приходит от клиента. */
function sniffImageType(data: Buffer): string | null {
  if (data.length < 12) return null;
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP")
    return "image/webp";
  // HEIC/HEIF: контейнер ISO-BMFF, тип лежит в блоке ftyp.
  if (data.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = data.subarray(8, 12).toString("ascii");
    if (["heic", "heix", "hevc", "mif1", "msf1", "heim"].includes(brand)) {
      return "image/heic";
    }
  }
  return null;
}

export async function savePhoto(
  input: SavePhotoInput,
  user: CurrentUser,
): Promise<SavePhotoResult> {
  if (input.data.byteLength === 0) {
    return { ok: false, code: "empty", message: "Datei ist leer" };
  }
  if (input.data.byteLength > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      code: "too_large",
      message: `Datei ist größer als ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`,
    };
  }

  // Тип определяем сами. Расширение и Content-Type от клиента — подсказка,
  // а не доказательство: под именем foto.jpg легко приходит что угодно.
  const sniffed = sniffImageType(input.data);
  if (!sniffed || !isAllowedImageType(sniffed)) {
    return {
      ok: false,
      code: "wrong_type",
      message: "Nur Fotos (JPEG, PNG, WebP, HEIC) sind erlaubt",
    };
  }

  const job = await loadJobForRules(input.appointmentId);
  if (!job) {
    return { ok: false, code: "not_found", message: "Termin nicht gefunden" };
  }

  const denied: JobDenied | null =
    checkAccess(job, user) ?? checkCanUploadPhoto(job);
  if (denied) {
    return { ok: false, code: denied.code, message: denied.message };
  }

  // Ключ от телефона делает повторную отправку безвредной.
  const clientKey =
    input.clientKey && input.clientKey.length > 0
      ? `${input.appointmentId}:${input.clientKey}`
      : `${input.appointmentId}:srv-${randomBytes(12).toString("hex")}`;

  const existing = await db.jobPhoto.findUnique({
    where: { clientKey },
    select: { id: true, storageKey: true },
  });
  if (existing) {
    return { ok: true, ...existing, duplicate: true };
  }

  const storageKey =
    `appointments/${input.appointmentId}/${input.kind.toLowerCase()}/` +
    `${randomBytes(16).toString("hex")}.${extensionFor(sniffed)}`;

  await storage().put(storageKey, input.data, sniffed);

  try {
    const photo = await db.jobPhoto.create({
      data: {
        appointmentId: input.appointmentId,
        kind: input.kind,
        storageKey,
        uploadedById: user.id,
        clientKey,
      },
      select: { id: true, storageKey: true },
    });

    await logActivity({
      entity: "Appointment",
      entityId: input.appointmentId,
      action: "photo.uploaded",
      userId: user.id,
      diff: { foto: [null, `${input.kind} ${storageKey}`] },
    });

    return { ok: true, ...photo, duplicate: false };
  } catch (error) {
    // Запись не создалась — файл в хранилище оставлять незачем.
    await storage().delete(storageKey).catch(() => {});

    // Гонка двух попыток из очереди: обе прошли проверку, вторая уперлась
    // в уникальный clientKey. Это не ошибка, снимок уже на месте.
    const again = await db.jobPhoto.findUnique({
      where: { clientKey },
      select: { id: true, storageKey: true },
    });
    if (again) return { ok: true, ...again, duplicate: true };

    throw error;
  }
}
