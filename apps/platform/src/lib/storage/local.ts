/**
 * Хранение файлов на диске сервера.
 *
 * Том Docker, который входит в ежедневный бэкап. Для пяти монтажников и
 * нескольких тысяч фотографий в год этого достаточно; переезд на S3 —
 * смена одной переменной окружения.
 */
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { env } from "@/lib/env";
import { assertSafeKey, type StorageDriver, type StoredFile } from "./index";

/** Тип содержимого хранится рядом: файловая система его не помнит. */
const TYPE_SUFFIX = ".type";

export function localDriver(): StorageDriver {
  const root = resolve(env.STORAGE_LOCAL_PATH);

  /** Путь внутри хранилища, с повторной защитой от выхода за его пределы. */
  const pathOf = (key: string) => {
    assertSafeKey(key);
    const full = resolve(join(root, key));
    if (!full.startsWith(root + "/") && full !== root) {
      throw new Error(`Ключ выводит за пределы хранилища: ${key}`);
    }
    return full;
  };

  return {
    async put(key, data, contentType): Promise<StoredFile> {
      const full = pathOf(key);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, data);
      await writeFile(full + TYPE_SUFFIX, contentType, "utf8");
      return { key, size: data.byteLength, contentType };
    },

    async get(key) {
      const full = pathOf(key);
      try {
        const data = await readFile(full);
        const contentType = await readFile(full + TYPE_SUFFIX, "utf8").catch(
          () => "application/octet-stream",
        );
        return { data, contentType: contentType.trim() };
      } catch (error) {
        // Отсутствие файла — обычное дело: ссылка устарела или файл удалён.
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },

    async delete(key) {
      const full = pathOf(key);
      await unlink(full).catch(() => {});
      await unlink(full + TYPE_SUFFIX).catch(() => {});
    },
  };
}
