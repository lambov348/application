/**
 * Права на файл из хранилища.
 *
 * Файлы не отдаются напрямую из хранилища: фотография квартиры клиента и
 * его подпись не должны открываться по угаданной ссылке. Ключ разбирается
 * здесь, и по нему проверяется доступ к выезду.
 */
import { db } from "@/lib/db";
import type { CurrentUser } from "@/server/auth/guards";

/** Из ключа файла достаётся выезд, к которому он относится. */
export function appointmentIdFromKey(key: string): string | null {
  const parts = key.split("/");
  if (parts.length < 3) return null;
  if (parts[0] !== "appointments" && parts[0] !== "handover") return null;
  return parts[1] ?? null;
}

export async function canReadFile(
  key: string,
  user: CurrentUser,
): Promise<boolean> {
  const appointmentId = appointmentIdFromKey(key);
  if (!appointmentId) return false;

  // Владелец и диспетчер видят всё: они ведут заказы и разбирают претензии.
  if (user.role !== "MONTEUR") {
    const exists = await db.appointment.count({ where: { id: appointmentId } });
    return exists > 0;
  }

  // Монтажник — только свои выезды.
  const mine = await db.appointment.count({
    where: { id: appointmentId, assignees: { some: { userId: user.id } } },
  });
  return mine > 0;
}
