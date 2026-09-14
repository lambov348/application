/**
 * Журнал действий (глава 4 ТЗ: «журнал действий на все изменения сделок,
 * цен и счетов»).
 *
 * Записи неизменяемы: расширение Prisma Client запрещает update и delete,
 * а триггер в базе не даёт обойти это сырым SQL.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { clientIp } from "./auth/guards";

export type LoggedEntity =
  | "Deal"
  | "Offer"
  | "Appointment"
  | "Customer"
  | "User"
  | "Settings"
  | "ServiceCatalogItem";

/** Значение, которое можно положить в JSON-поле базы. */
type JsonValue = Prisma.InputJsonValue | null;

/** Изменение одного поля: [было, стало]. */
export type FieldDiff = Record<string, [JsonValue, JsonValue]>;

/**
 * Приводит значение к виду, пригодному для хранения в JSON.
 * Date превращается в строку ISO (то есть в UTC), остальное проходит через
 * сериализацию — если значение в JSON не превращается, в журнал попадёт null,
 * а не исключение посреди сохранения сделки.
 */
function toJsonValue(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue;
  } catch {
    return null;
  }
}

/**
 * Сравнивает две версии записи и оставляет только изменившиеся поля.
 * В журнал не должно попадать «обновили заявку» без указания, что именно.
 */
export function diffOf<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): FieldDiff {
  const diff: FieldDiff = {};
  for (const [key, next] of Object.entries(after)) {
    if (next === undefined) continue;

    const prevValue = toJsonValue(before[key]);
    const nextValue = toJsonValue(next);

    if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
      diff[key] = [prevValue, nextValue];
    }
  }
  return diff;
}

export type LogInput = {
  entity: LoggedEntity;
  entityId: string;
  action: string;
  userId: string | null;
  diff?: FieldDiff;
  /** Передавайте клиент транзакции, чтобы запись и журнал жили или падали вместе. */
  tx?: Prisma.TransactionClient;
};

export async function logActivity({
  entity,
  entityId,
  action,
  userId,
  diff,
  tx,
}: LogInput): Promise<void> {
  const client = tx ?? db;
  await client.activityLog.create({
    data: {
      entity,
      entityId,
      action,
      userId,
      diff: diff && Object.keys(diff).length > 0 ? diff : undefined,
      ip: await clientIp().catch(() => null),
    },
  });
}
