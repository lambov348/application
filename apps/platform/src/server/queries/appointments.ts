/**
 * Запросы по выездам для календаря (глава 5.3 ТЗ).
 *
 * Монтажник видит только свои выезды и не видит цену заказа — это то же
 * требование главы 4, что и на доске заявок, и решается тем же способом:
 * поля цены не попадают в выборку.
 */
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { displayNameOf } from "./customers";
import { SERVICE_COLORS, DEFAULT_SERVICE_COLOR } from "@/lib/deals";

export type CalendarAppointment = {
  id: string;
  dealId: string;
  dealNumber: number;
  title: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  teamId: string | null;
  teamName: string | null;
  teamColor: string | null;
  /** Цвет по виду работ — цветовая кодировка из главы 5.3. */
  serviceColor: string;
  customerName: string;
  customerPhone: string | null;
  street: string;
  zip: string;
  city: string;
  floor: string | null;
  elevator: boolean;
  parkingNote: string | null;
  assignees: { id: string; name: string }[];
  dispatcherNote: string | null;
};

const CALENDAR_SELECT = {
  id: true,
  dealId: true,
  startAt: true,
  endAt: true,
  status: true,
  teamId: true,
  dispatcherNote: true,
  team: { select: { name: true, color: true } },
  deal: {
    select: {
      number: true,
      title: true,
      services: true,
      customer: {
        select: {
          type: true,
          firstName: true,
          lastName: true,
          company: true,
          phone: true,
        },
      },
    },
  },
  address: {
    select: {
      street: true,
      zip: true,
      city: true,
      floor: true,
      elevator: true,
      parkingNote: true,
    },
  },
  assignees: { select: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.AppointmentSelect;

function toCalendar(
  row: Prisma.AppointmentGetPayload<{ select: typeof CALENDAR_SELECT }>,
): CalendarAppointment {
  const firstService = row.deal.services[0];
  return {
    id: row.id,
    dealId: row.dealId,
    dealNumber: row.deal.number,
    title: row.deal.title,
    startAt: row.startAt,
    endAt: row.endAt,
    status: row.status,
    teamId: row.teamId,
    teamName: row.team?.name ?? null,
    teamColor: row.team?.color ?? null,
    serviceColor: firstService
      ? (SERVICE_COLORS[firstService] ?? DEFAULT_SERVICE_COLOR)
      : DEFAULT_SERVICE_COLOR,
    customerName: displayNameOf(row.deal.customer),
    customerPhone: row.deal.customer.phone,
    street: row.address.street,
    zip: row.address.zip,
    city: row.address.city,
    floor: row.address.floor,
    elevator: row.address.elevator,
    parkingNote: row.address.parkingNote,
    assignees: row.assignees.map((a) => a.user),
    dispatcherNote: row.dispatcherNote,
  };
}

/**
 * Выезды за промежуток.
 * `onlyForUserId` ограничивает выборку выездами конкретного монтажника —
 * ровно то, что нужно его кабинету.
 */
export async function appointmentsBetween(
  from: Date,
  to: Date,
  onlyForUserId?: string,
): Promise<CalendarAppointment[]> {
  const rows = await db.appointment.findMany({
    where: {
      // Захватываем и выезды, начавшиеся раньше окна, но заходящие в него.
      startAt: { lt: to },
      endAt: { gt: from },
      ...(onlyForUserId
        ? { assignees: { some: { userId: onlyForUserId } } }
        : {}),
    },
    orderBy: { startAt: "asc" },
    select: CALENDAR_SELECT,
  });

  return rows.map(toCalendar);
}

/**
 * Существующие выезды бригады рядом с планируемым — для поиска конфликтов.
 * Берём сутки вокруг, этого хватает: зазор на переезд измеряется минутами.
 */
export async function appointmentsNear(
  teamId: string,
  startAt: Date,
  endAt: Date,
) {
  const window = 24 * 60 * 60_000;
  const rows = await db.appointment.findMany({
    where: {
      teamId,
      status: { not: "ABGESAGT" },
      startAt: { lt: new Date(endAt.getTime() + window) },
      endAt: { gt: new Date(startAt.getTime() - window) },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      addressId: true,
      teamId: true,
      deal: { select: { number: true } },
      address: { select: { city: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    startAt: r.startAt,
    endAt: r.endAt,
    addressId: r.addressId,
    teamId: r.teamId,
    dealNumber: r.deal.number,
    city: r.address.city,
  }));
}

/** Выезды одной заявки — для карточки заявки. */
export async function appointmentsOfDeal(dealId: string) {
  const rows = await db.appointment.findMany({
    where: { dealId },
    orderBy: { startAt: "asc" },
    select: CALENDAR_SELECT,
  });
  return rows.map(toCalendar);
}
