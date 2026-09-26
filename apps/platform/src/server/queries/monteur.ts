/**
 * Запросы кабинета монтажника (глава 5.6 ТЗ).
 *
 * Два жёстких требования главы 4 соблюдаются здесь, а не в разметке:
 *   — монтажник не видит цену заказа: поля цены не входят в выборку,
 *     их физически нет в данных, которые уходят на телефон;
 *   — монтажник видит только свои выезды: фильтр по составу бригады.
 */
import type { AppointmentStatus, ExtraStatus, PhotoKind } from "@prisma/client";
import { db } from "@/lib/db";
import { berlinDateIso, berlinDayStart } from "@/lib/datetime";
import { displayNameOf } from "./customers";

export type JobListItem = {
  id: string;
  dealNumber: number;
  title: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  customerName: string;
  customerPhone: string | null;
  street: string;
  zip: string;
  city: string;
  floor: string | null;
  elevator: boolean;
};

/**
 * Выезды монтажника на календарный день по берлинскому времени.
 *
 * Границы считаются по календарю, а не прибавлением 24 часов: в дни
 * перевода часов сутки длятся 23 или 25 часов.
 */
export async function jobsOfDay(
  userId: string,
  dayIso: string,
  onlyOwn = true,
): Promise<JobListItem[]> {
  const from = berlinDayStart(dayIso);
  // Полдень следующих суток попадает в нужный день и в ночь перевода часов.
  const to = berlinDayStart(berlinDateIso(new Date(from.getTime() + 36 * 60 * 60_000)));

  const rows = await db.appointment.findMany({
    where: {
      startAt: { lt: to },
      endAt: { gt: from },
      status: { not: "ABGESAGT" },
      ...(onlyOwn ? { assignees: { some: { userId } } } : {}),
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      deal: {
        select: {
          number: true,
          title: true,
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
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    dealNumber: r.deal.number,
    title: r.deal.title,
    startAt: r.startAt,
    endAt: r.endAt,
    status: r.status,
    customerName: displayNameOf(r.deal.customer),
    customerPhone: r.deal.customer.phone,
    street: r.address.street,
    zip: r.address.zip,
    city: r.address.city,
    floor: r.address.floor,
    elevator: r.address.elevator,
  }));
}

export type JobPhotoItem = {
  id: string;
  kind: PhotoKind;
  storageKey: string;
  createdAt: Date;
  uploadedByName: string;
};

export type JobExtra = {
  id: string;
  kind: "MATERIAL" | "ZEIT";
  description: string;
  amountCents: number | null;
  extraMinutes: number | null;
  status: ExtraStatus;
  createdAt: Date;
  reportedByName: string;
  decisionNote: string | null;
};

export type JobTimeEntry = {
  id: string;
  userId: string;
  userName: string;
  startAt: Date;
  endAt: Date | null;
  minutes: number | null;
};

export type JobDetail = JobListItem & {
  dealId: string;
  /** Объём работ и заметки — то, что нужно на объекте (глава 5.6.2). */
  services: string[];
  dealNotes: string | null;
  dispatcherNote: string | null;
  parkingNote: string | null;
  addressLabel: string | null;
  estHours: string | null;
  teamName: string | null;
  assignees: { id: string; name: string }[];
  photos: JobPhotoItem[];
  timeEntries: JobTimeEntry[];
  extras: JobExtra[];
  handover: { signedAt: Date; pdfKey: string | null } | null;
  /** Состав бригады — для проверки прав в действиях. */
  assigneeIds: string[];
};

/**
 * Карточка выезда. Цена заказа не запрашивается вовсе: ни priceNetCents,
 * ни vatRateBp — их нет в select, а значит, нет и в ответе сервера.
 */
export async function jobDetail(appointmentId: string): Promise<JobDetail | null> {
  const row = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      dealId: true,
      startAt: true,
      endAt: true,
      status: true,
      dispatcherNote: true,
      team: { select: { name: true } },
      deal: {
        select: {
          number: true,
          title: true,
          services: true,
          notes: true,
          estHours: true,
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
          label: true,
        },
      },
      assignees: { select: { user: { select: { id: true, name: true } } } },
      photos: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          kind: true,
          storageKey: true,
          createdAt: true,
          uploadedBy: { select: { name: true } },
        },
      },
      timeEntries: {
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          userId: true,
          startAt: true,
          endAt: true,
          minutes: true,
          user: { select: { name: true } },
        },
      },
      extras: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          kind: true,
          description: true,
          amountCents: true,
          extraMinutes: true,
          status: true,
          createdAt: true,
          decisionNote: true,
          reportedBy: { select: { name: true } },
        },
      },
      handover: { select: { signedAt: true, pdfKey: true } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    dealId: row.dealId,
    dealNumber: row.deal.number,
    title: row.deal.title,
    startAt: row.startAt,
    endAt: row.endAt,
    status: row.status,
    customerName: displayNameOf(row.deal.customer),
    customerPhone: row.deal.customer.phone,
    street: row.address.street,
    zip: row.address.zip,
    city: row.address.city,
    floor: row.address.floor,
    elevator: row.address.elevator,
    services: row.deal.services,
    dealNotes: row.deal.notes,
    dispatcherNote: row.dispatcherNote,
    parkingNote: row.address.parkingNote,
    addressLabel: row.address.label,
    estHours: row.deal.estHours ? row.deal.estHours.toString() : null,
    teamName: row.team?.name ?? null,
    assignees: row.assignees.map((a) => a.user),
    assigneeIds: row.assignees.map((a) => a.user.id),
    photos: row.photos.map((p) => ({
      id: p.id,
      kind: p.kind,
      storageKey: p.storageKey,
      createdAt: p.createdAt,
      uploadedByName: p.uploadedBy.name,
    })),
    timeEntries: row.timeEntries.map((e) => ({
      id: e.id,
      userId: e.userId,
      userName: e.user.name,
      startAt: e.startAt,
      endAt: e.endAt,
      minutes: e.minutes,
    })),
    extras: row.extras.map((e) => ({
      id: e.id,
      kind: e.kind,
      description: e.description,
      amountCents: e.amountCents,
      extraMinutes: e.extraMinutes,
      status: e.status,
      createdAt: e.createdAt,
      reportedByName: e.reportedBy.name,
      decisionNote: e.decisionNote,
    })),
    handover: row.handover
      ? { signedAt: row.handover.signedAt, pdfKey: row.handover.pdfKey }
      : null,
  };
}

/** Незакрытая запись времени этого монтажника — на любом выезде. */
export async function runningTimeEntry(userId: string) {
  return db.timeEntry.findFirst({
    where: { userId, endAt: null },
    orderBy: { startAt: "desc" },
    select: { id: true, appointmentId: true, startAt: true },
  });
}

/** Открытые сообщения о доплате — для владельца (глава 5.6.7). */
export async function openExtras() {
  const rows = await db.extraRequest.findMany({
    where: { status: "OFFEN" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      kind: true,
      description: true,
      amountCents: true,
      extraMinutes: true,
      createdAt: true,
      reportedBy: { select: { name: true } },
      appointment: {
        select: {
          id: true,
          startAt: true,
          deal: { select: { id: true, number: true, title: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    description: r.description,
    amountCents: r.amountCents,
    extraMinutes: r.extraMinutes,
    createdAt: r.createdAt,
    reportedByName: r.reportedBy.name,
    appointmentId: r.appointment.id,
    appointmentStart: r.appointment.startAt,
    dealId: r.appointment.deal.id,
    dealNumber: r.appointment.deal.number,
    dealTitle: r.appointment.deal.title,
  }));
}
