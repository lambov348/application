/**
 * Справочники и чистая логика кабинета монтажника (глава 5.6 ТЗ).
 *
 * Модуль без зависимостей: его импортируют и серверные правила, и кнопки
 * на телефоне монтажника. Ничего серверного сюда класть нельзя — иначе
 * сборка потянет в браузер драйвер базы.
 */
import type { AppointmentStatus, ExtraKind, PhotoKind } from "@prisma/client";
import { APPOINTMENT_FLOW } from "./deals";

/** Статусы, которые монтажник ставит сам, по порядку. */
export const JOB_FLOW = APPOINTMENT_FLOW;

/**
 * Следующий статус по цепочке. null означает «дальше некуда»:
 * после FERTIG выезд закрыт, отменённый выезд не двигается вовсе.
 */
export function nextJobStatus(
  current: AppointmentStatus,
): AppointmentStatus | null {
  const index = JOB_FLOW.indexOf(current);
  if (index < 0) return null; // ABGESAGT
  return JOB_FLOW[index + 1] ?? null;
}

/**
 * Назад по цепочке двигаться нельзя. Отметка «выехал» в 8:10 — это факт,
 * а не черновик; переписывать его задним числом означает переписывать
 * основание для расчёта зарплаты.
 */
export function isForwardTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  const a = JOB_FLOW.indexOf(from);
  const b = JOB_FLOW.indexOf(to);
  return a >= 0 && b >= 0 && b > a;
}

/** Виды фотографий, которые монтажник снимает сам. */
export const MONTEUR_PHOTO_KINDS: PhotoKind[] = ["VORHER", "NACHHER", "SCHADEN"];

export const EXTRA_KINDS: ExtraKind[] = ["MATERIAL", "ZEIT"];

/**
 * Чек-лист протокола приёмки (глава 5.6.5 ТЗ). Не путать с чек-листом
 * заявки в @/lib/deals: тот про недостающие данные до выезда, этот — про
 * сданную работу.
 */
export const HANDOVER_CHECKLIST = [
  "montage_vollstaendig", // монтаж выполнен полностью
  "funktion_geprueft", // работоспособность проверена
  "keine_schaeden", // повреждений нет
  "arbeitsplatz_gereinigt", // рабочее место убрано
  "verpackung_entsorgt", // упаковка вывезена
] as const;

export type HandoverChecklistKey = (typeof HANDOVER_CHECKLIST)[number];

/** Ссылка на навигацию. Координат не храним, ведём по адресу строкой. */
export function mapsUrl(street: string, zip: string, city: string): string {
  const query = encodeURIComponent(`${street}, ${zip} ${city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
}

/** Минуты между двумя отметками, без отрицательных значений. */
export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

/** «3 ч 25 мин» — как это читает человек в отчёте по времени. */
export function formatMinutes(total: number, locale: "de" | "ru" = "de"): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const h = locale === "ru" ? "ч" : "Std.";
  const m = locale === "ru" ? "мин" : "Min.";
  if (hours === 0) return `${minutes} ${m}`;
  if (minutes === 0) return `${hours} ${h}`;
  return `${hours} ${h} ${minutes} ${m}`;
}
