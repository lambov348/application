/**
 * Запросы по заявкам и сделкам.
 *
 * Жёсткое требование главы 4 ТЗ: монтажник не видит цену заказа. Здесь это
 * сделано не скрытием в разметке, а отсутствием полей в выборке: для роли
 * MONTEUR цена физически не покидает базу. Спрятанное в React значение
 * всё равно уезжает в HTML и видно через «просмотр кода страницы».
 */
import type { DealStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { displayNameOf } from "./customers";
import { BOARD_STATUSES, LOST_STATUS } from "@/server/rules/deal-status";

/** Поля карточки, одинаковые для всех ролей. */
const CARD_COMMON = {
  id: true,
  number: true,
  title: true,
  status: true,
  services: true,
  source: true,
  createdAt: true,
  firstResponseAt: true,
  estHours: true,
  estMonteure: true,
  lostReason: true,
  customer: {
    select: {
      id: true,
      type: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
    },
  },
  address: { select: { city: true, street: true, zip: true } },
} satisfies Prisma.DealSelect;

/** Поля цены. Добавляются только для ролей, которым цена разрешена. */
const CARD_PRICE = {
  priceNetCents: true,
  vatRateBp: true,
  priceApproved: true,
} satisfies Prisma.DealSelect;

export type BoardCard = {
  id: string;
  number: number;
  title: string;
  status: DealStatus;
  services: string[];
  source: string;
  customerName: string;
  customerPhone: string | null;
  city: string | null;
  createdAt: Date;
  /** Заявка без первого ответа — та, которую ещё никто не взял. */
  awaitingFirstResponse: boolean;
  lostReason: string | null;
  /** null у роли, которой цена не положена. Не ноль, а именно отсутствие. */
  priceNetCents: number | null;
  priceApproved: boolean | null;
};

type WithPrice = {
  priceNetCents?: number | null;
  vatRateBp?: number;
  priceApproved?: boolean;
};

function toCard(
  row: Prisma.DealGetPayload<{ select: typeof CARD_COMMON }> & WithPrice,
  canSeePrice: boolean,
): BoardCard {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    status: row.status,
    services: row.services,
    source: row.source,
    customerName: displayNameOf(row.customer),
    customerPhone: row.customer.phone,
    city: row.address?.city ?? null,
    createdAt: row.createdAt,
    awaitingFirstResponse: row.firstResponseAt === null,
    lostReason: row.lostReason,
    priceNetCents: canSeePrice ? (row.priceNetCents ?? null) : null,
    priceApproved: canSeePrice ? (row.priceApproved ?? false) : null,
  };
}

export type Board = {
  columns: { status: DealStatus; cards: BoardCard[]; total: number }[];
  lost: { cards: BoardCard[]; total: number };
};

/** Сколько карточек грузить в колонку: доска не должна тянуть всю базу. */
const CARDS_PER_COLUMN = 50;

export async function getBoard({
  canSeePrice,
  query = "",
}: {
  canSeePrice: boolean;
  query?: string;
}): Promise<Board> {
  const q = query.trim();
  const where: Prisma.DealWhereInput =
    q.length >= 2
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { customer: { lastName: { contains: q, mode: "insensitive" } } },
            { customer: { company: { contains: q, mode: "insensitive" } } },
            ...(Number.isInteger(Number(q)) ? [{ number: Number(q) }] : []),
          ],
        }
      : {};

  const select = canSeePrice
    ? { ...CARD_COMMON, ...CARD_PRICE }
    : CARD_COMMON;

  const statuses = [...BOARD_STATUSES, LOST_STATUS];

  // Один запрос на колонку, но все параллельно: доска открывается за один
  // поход в базу по времени.
  const results = await Promise.all(
    statuses.map(async (status) => {
      const [rows, total] = await Promise.all([
        db.deal.findMany({
          where: { ...where, status },
          orderBy: { createdAt: "desc" },
          take: CARDS_PER_COLUMN,
          select,
        }),
        db.deal.count({ where: { ...where, status } }),
      ]);
      return { status, cards: rows.map((r) => toCard(r, canSeePrice)), total };
    }),
  );

  const lost = results.find((r) => r.status === LOST_STATUS);

  return {
    columns: results.filter((r) => r.status !== LOST_STATUS),
    lost: { cards: lost?.cards ?? [], total: lost?.total ?? 0 },
  };
}

/** Карточка заявки целиком. Цена — только тем, кому положено. */
export async function getDeal(id: string, canSeePrice: boolean) {
  const deal = await db.deal.findUnique({
    where: { id },
    select: {
      ...CARD_COMMON,
      ...(canSeePrice ? CARD_PRICE : {}),
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      notes: true,
      checklist: true,
      lostNote: true,
      addressId: true,
      updatedAt: true,
      ...(canSeePrice
        ? {
            priceApprovedAt: true,
            priceApprovedBy: { select: { name: true } },
          }
        : {}),
      customer: {
        select: {
          id: true,
          type: true,
          firstName: true,
          lastName: true,
          company: true,
          phone: true,
          email: true,
          language: true,
          addresses: {
            select: {
              id: true,
              label: true,
              street: true,
              zip: true,
              city: true,
              floor: true,
              elevator: true,
              parkingNote: true,
            },
          },
        },
      },
      address: {
        select: {
          id: true,
          street: true,
          zip: true,
          city: true,
          floor: true,
          elevator: true,
          parkingNote: true,
        },
      },
    },
  });

  if (!deal) return null;
  return { ...deal, customerName: displayNameOf(deal.customer) };
}

export type DealDetail = NonNullable<Awaited<ReturnType<typeof getDeal>>>;

/** Лента событий по заявке (глава 5.2: «лента активности»). */
export async function getDealActivity(dealId: string) {
  return db.activityLog.findMany({
    where: { entity: "Deal", entityId: dealId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      diff: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });
}

/** Клиенты для выпадающего списка при создании заявки. */
export async function customerOptions(query: string) {
  const q = query.trim();
  return db.customer.findMany({
    where: {
      deletedAt: null,
      ...(q.length >= 2
        ? {
            OR: [
              { lastName: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { company: "asc" }],
    take: 50,
    select: {
      id: true,
      type: true,
      firstName: true,
      lastName: true,
      company: true,
      addresses: { select: { id: true, street: true, zip: true, city: true } },
    },
  });
}
