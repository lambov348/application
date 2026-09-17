/**
 * Правила планирования выездов (глава 5.3 ТЗ).
 *
 * Два вида конфликтов, оба — предупреждения, а не запреты:
 *
 *   1. Бригада уже занята в это время. Физически быть в двух местах нельзя,
 *      но короткое наложение иногда осмысленно: соседний подъезд, заезд
 *      на пятнадцать минут. Решает диспетчер, система показывает.
 *   2. Между выездами по разным адресам меньше времени, чем нужно на переезд.
 *
 * Почему зазор задаётся числом минут, а не расстоянием: расчёт расстояния
 * требует геокодинга, то есть внешнего сервиса и отдельного согласия по DSGVO.
 * Фиксированный зазор из настроек честно работает уже сегодня.
 *
 * Правило 9.3 главы ТЗ (нельзя поставить Termin без адреса и фамилии клиента)
 * проверяется здесь же: это ровно тот момент, когда Termin создаётся.
 */
import {
  APPOINTMENT_FLOW,
  SERVICE_COLORS,
  DEFAULT_SERVICE_COLOR,
} from "@/lib/deals";

// Справочники живут в @/lib/deals — модуле без зависимостей: их импортируют
// и клиентские формы, а этот файл тянет за собой Prisma.
export { APPOINTMENT_FLOW, SERVICE_COLORS, DEFAULT_SERVICE_COLOR };

/** Существующий выезд, с которым сверяемся. */
export type ExistingAppointment = {
  id: string;
  startAt: Date;
  endAt: Date;
  addressId: string;
  teamId: string | null;
  dealNumber: number;
  city: string;
};

export type PlannedAppointment = {
  /** Пусто при создании нового выезда. */
  id?: string;
  startAt: Date;
  endAt: Date;
  addressId: string;
  teamId: string | null;
};

export type Conflict = {
  code: "overlap" | "travel_time";
  /** С каким выездом столкнулись. */
  withAppointmentId: string;
  dealNumber: number;
  /** Сколько минут не хватает на переезд. Только для travel_time. */
  missingMinutes?: number;
  city: string;
};

/** Пересекаются ли два промежутка. Касание концами пересечением не считается. */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Поиск конфликтов планируемого выезда с уже существующими.
 *
 * Сверяется только с выездами той же бригады: две разные бригады могут
 * работать одновременно, для того они и разные.
 */
export function findConflicts(
  planned: PlannedAppointment,
  existing: ExistingAppointment[],
  travelBufferMinutes: number,
): Conflict[] {
  const conflicts: Conflict[] = [];
  if (!planned.teamId) return conflicts;

  for (const other of existing) {
    // Сам с собой выезд не конфликтует — это правка, а не второй заказ.
    if (planned.id && other.id === planned.id) continue;
    if (other.teamId !== planned.teamId) continue;

    if (
      intervalsOverlap(planned.startAt, planned.endAt, other.startAt, other.endAt)
    ) {
      conflicts.push({
        code: "overlap",
        withAppointmentId: other.id,
        dealNumber: other.dealNumber,
        city: other.city,
      });
      continue;
    }

    // Переезд нужен только между разными адресами: два заказа в одном доме
    // идут подряд без зазора.
    if (other.addressId === planned.addressId) continue;

    const gapMinutes = Math.round(
      (planned.startAt >= other.endAt
        ? planned.startAt.getTime() - other.endAt.getTime()
        : other.startAt.getTime() - planned.endAt.getTime()) / 60_000,
    );

    if (gapMinutes < travelBufferMinutes) {
      conflicts.push({
        code: "travel_time",
        withAppointmentId: other.id,
        dealNumber: other.dealNumber,
        missingMinutes: travelBufferMinutes - gapMinutes,
        city: other.city,
      });
    }
  }

  return conflicts;
}

/** Отказ в планировании: то, что обойти нельзя. */
export class PlanningDenied extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PlanningDenied";
  }
}

/**
 * Правило 9.3: Termin невозможен без адреса и без того, как зовут клиента.
 * В отличие от конфликтов это запрет, а не предупреждение.
 */
export function checkCanPlan(deal: {
  addressId: string | null;
  customer: { lastName: string | null; company: string | null };
}): PlanningDenied | null {
  if (!deal.addressId) {
    return new PlanningDenied(
      "address_required",
      "Ohne Adresse kann kein Termin geplant werden",
    );
  }
  if (!deal.customer.lastName && !deal.customer.company) {
    return new PlanningDenied(
      "customer_name_required",
      "Ohne Nachname oder Firma des Kunden kann kein Termin geplant werden",
    );
  }
  return null;
}

/** Промежуток времени должен быть осмысленным. */
export function checkInterval(
  startAt: Date,
  endAt: Date,
): PlanningDenied | null {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return new PlanningDenied("invalid_time", "Datum oder Uhrzeit ist ungültig");
  }
  if (endAt <= startAt) {
    return new PlanningDenied(
      "end_before_start",
      "Das Ende muss nach dem Beginn liegen",
    );
  }
  // Выезд длиной больше суток — почти наверняка опечатка в дате.
  if (endAt.getTime() - startAt.getTime() > 24 * 60 * 60_000) {
    return new PlanningDenied(
      "too_long",
      "Ein Termin über 24 Stunden ist vermutlich ein Tippfehler im Datum",
    );
  }
  return null;
}
