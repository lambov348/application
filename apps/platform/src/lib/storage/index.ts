/**
 * Хранилище файлов: фотографии объектов, подписи клиентов, PDF.
 *
 * Два драйвера за одним интерфейсом:
 *   local — том на сервере, входит в ежедневный бэкап. Так работает сейчас;
 *   s3    — S3-совместимое хранилище. Для DSGVO регион обязан быть в ЕС
 *           (Hetzner Object Storage: fsn1, nbg1, hel1).
 *
 * Драйвер выбирается переменной STORAGE_DRIVER, переезд между ними — смена
 * одной строки в окружении и перенос файлов.
 *
 * Файлы никогда не отдаются напрямую из хранилища: доступ идёт через
 * /api/files, где проверяются права. Фотография из квартиры клиента не
 * должна открываться по угаданной ссылке.
 */
import { env } from "@/lib/env";
import { localDriver } from "./local";
import { s3Driver } from "./s3";

export type StoredFile = {
  /** Ключ вида appointments/<id>/vorher/<случайное>.jpg */
  key: string;
  size: number;
  contentType: string;
};

export type StorageDriver = {
  put(key: string, data: Buffer, contentType: string): Promise<StoredFile>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
};

/** Разрешённые типы загружаемых файлов. */
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * Предел на файл: снимок с телефона редко бывает крупнее.
 * Значение живёт в ./limits — его читают и клиентские формы, которым этот
 * модуль с драйверами импортировать нельзя.
 */
export { MAX_UPLOAD_BYTES } from "./limits";

export function isAllowedImageType(contentType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(contentType.toLowerCase());
}

/**
 * Расширение по типу содержимого. Имя файла от клиента не используется:
 * в нём приезжают и пробелы, и точки, и попытки выйти из каталога.
 */
export function extensionFor(contentType: string): string {
  switch (contentType.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
    case "image/heif":
      return "heic";
    default:
      return "jpg";
  }
}

/**
 * Ключ должен оставаться внутри хранилища. Проверка стоит здесь, а не
 * в драйвере: «..» в пути — классический способ прочитать чужой файл.
 */
export function assertSafeKey(key: string): void {
  if (
    key.length === 0 ||
    key.length > 300 ||
    key.startsWith("/") ||
    key.includes("..") ||
    key.includes("\\") ||
    !/^[A-Za-z0-9/_.-]+$/.test(key)
  ) {
    throw new Error(`Недопустимый ключ файла: ${key}`);
  }
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  driver ??= env.STORAGE_DRIVER === "s3" ? s3Driver() : localDriver();
  return driver;
}
