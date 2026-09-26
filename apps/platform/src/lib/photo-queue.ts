/**
 * Очередь отправки фотографий в телефоне монтажника.
 *
 * Требование главы 5.6 ТЗ: «всё должно работать при слабом интернете в
 * подвале». Снимок сначала ложится в IndexedDB и только потом уходит на
 * сервер. Закрытая страница, потерянная связь и лифт без сети ничего не
 * ломают: очередь доживает до следующего открытия кабинета.
 *
 * Модуль браузерный — на сервере не исполняется и зависимостей не имеет.
 * Повторная отправка безопасна: у каждого снимка есть clientKey, и сервер
 * по нему узнаёт уже принятый файл (src/server/jobs/photos.ts).
 */

const DB_NAME = "ms24-fotos";
const STORE = "queue";
const DB_VERSION = 1;

export type QueuedPhoto = {
  clientKey: string;
  appointmentId: string;
  kind: string;
  blob: Blob;
  createdAt: number;
  /** Сколько раз отправка уже не удалась — для разбора неясных случаев. */
  attempts: number;
  /** Причина окончательного отказа сервера. Такие снимки не повторяются. */
  rejected?: string;
};

export function queueSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "clientKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function enqueue(
  item: Omit<QueuedPhoto, "createdAt" | "attempts">,
): Promise<void> {
  await tx("readwrite", (store) =>
    store.put({ ...item, createdAt: Date.now(), attempts: 0 }),
  );
}

export async function listQueue(): Promise<QueuedPhoto[]> {
  const all = await tx<QueuedPhoto[]>("readonly", (store) =>
    store.getAll() as IDBRequest<QueuedPhoto[]>,
  );
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function remove(clientKey: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(clientKey));
}

async function update(item: QueuedPhoto): Promise<void> {
  await tx("readwrite", (store) => store.put(item));
}

export type FlushResult = {
  sent: number;
  /** Осталось в очереди: связь пропала, попробуем позже. */
  waiting: number;
  /** Сервер отказал окончательно — монтажнику нужно показать причину. */
  rejected: { clientKey: string; reason: string }[];
};

/**
 * Попытка отправить очередь.
 *
 * Различаются два вида неудачи:
 *   нет связи или сервер недоступен — снимок остаётся в очереди;
 *   сервер отказал по существу (не фото, слишком большой, протокол
 *   подписан) — повторять бессмысленно, отмечаем и показываем причину.
 */
export async function flushQueue(): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, waiting: 0, rejected: [] };
  const items = await listQueue();

  for (const item of items) {
    if (item.rejected) {
      result.rejected.push({ clientKey: item.clientKey, reason: item.rejected });
      continue;
    }

    const form = new FormData();
    form.set("appointmentId", item.appointmentId);
    form.set("kind", item.kind);
    form.set("clientKey", item.clientKey);
    form.set("file", item.blob, `${item.clientKey}.jpg`);

    let response: Response;
    try {
      response = await fetch("/api/photos", { method: "POST", body: form });
    } catch {
      // Связи нет. Остальные снимки тоже не уйдут — прекращаем до следующего раза.
      result.waiting = items.length - result.sent - result.rejected.length;
      return result;
    }

    if (response.ok) {
      await remove(item.clientKey);
      result.sent += 1;
      continue;
    }

    // 5xx и 429 — сервер занят или сломан, снимок не виноват.
    if (response.status >= 500 || response.status === 429) {
      await update({ ...item, attempts: item.attempts + 1 });
      result.waiting = items.length - result.sent - result.rejected.length;
      return result;
    }

    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    const reason = body.message ?? body.code ?? `HTTP ${response.status}`;
    await update({ ...item, attempts: item.attempts + 1, rejected: reason });
    result.rejected.push({ clientKey: item.clientKey, reason });
  }

  return result;
}

/** Снимки этого выезда, ждущие отправки — для счётчика на экране. */
export async function countWaiting(appointmentId: string): Promise<number> {
  const items = await listQueue();
  return items.filter((i) => i.appointmentId === appointmentId && !i.rejected)
    .length;
}
