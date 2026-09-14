/**
 * Запросы по клиентам и их адресам.
 *
 * Правило проекта: страницы и действия не ходят в db напрямую. Когда в
 * Этапе 4 появится вторая фирма (мандант), ограничение по ней добавится
 * здесь, а не в полусотне мест по приложению.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { phoneSearchDigits } from "@/lib/phone";

/** Сколько клиентов показывать на странице списка. */
export const PAGE_SIZE = 25;

export type CustomerListItem = {
  id: string;
  type: "PRIVAT" | "FIRMA";
  displayName: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  tags: string[];
  dealCount: number;
  anonymized: boolean;
};

/**
 * Имя для списков и заголовков.
 *
 * У частного лица это фамилия с именем, у фирмы — название. Пустое имя
 * встречается: заявка приходит с одним телефоном, и клиента заводят до того,
 * как выяснили, как его зовут.
 */
export function displayNameOf(c: {
  type: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
}): string {
  if (c.type === "FIRMA" && c.company) return c.company;
  const parts = [c.lastName, c.firstName].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return c.company ?? "";
}

/**
 * Условие поиска по имени, фамилии, названию фирмы, почте, телефону и адресу
 * (глава 5.10 ТЗ).
 *
 * Поиск по номеру идёт по нормализованной колонке, поэтому «0176» находит
 * клиента, записанного как «+49 176 …».
 */
function searchFilter(query: string): Prisma.CustomerWhereInput | undefined {
  const q = query.trim();
  if (q.length < 2) return undefined;

  const or: Prisma.CustomerWhereInput[] = [
    { firstName: { contains: q, mode: "insensitive" } },
    { lastName: { contains: q, mode: "insensitive" } },
    { company: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
    {
      addresses: {
        some: {
          OR: [
            { street: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { zip: { startsWith: q } },
          ],
        },
      },
    },
  ];

  const digits = phoneSearchDigits(q);
  if (digits) or.push({ phoneNormalized: { contains: digits } });

  return { OR: or };
}

export async function listCustomers({
  query = "",
  page = 1,
  includeArchived = false,
}: {
  query?: string;
  page?: number;
  includeArchived?: boolean;
} = {}): Promise<{ items: CustomerListItem[]; total: number; page: number }> {
  const where: Prisma.CustomerWhereInput = {
    ...(includeArchived ? {} : { deletedAt: null }),
    ...searchFilter(query),
  };

  const [rows, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { company: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        type: true,
        firstName: true,
        lastName: true,
        company: true,
        phone: true,
        email: true,
        tags: true,
        anonymizedAt: true,
        // Город первого адреса — по нему в списке узнают выезд.
        addresses: { select: { city: true }, take: 1 },
        _count: { select: { deals: true } },
      },
    }),
    db.customer.count({ where }),
  ]);

  return {
    page,
    total,
    items: rows.map((c) => ({
      id: c.id,
      type: c.type,
      displayName: displayNameOf(c),
      phone: c.phone,
      email: c.email,
      city: c.addresses[0]?.city ?? null,
      tags: c.tags,
      dealCount: c._count.deals,
      anonymized: c.anonymizedAt !== null,
    })),
  };
}

/** Карточка клиента со всеми адресами и историей заказов. */
export async function getCustomer(id: string) {
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: { createdAt: "asc" } },
      deals: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          createdAt: true,
          services: true,
        },
      },
    },
  });
  if (!customer) return null;

  return { ...customer, displayName: displayNameOf(customer) };
}

export type CustomerDetail = NonNullable<
  Awaited<ReturnType<typeof getCustomer>>
>;
