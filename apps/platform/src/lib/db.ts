/**
 * Единственный экземпляр Prisma Client.
 *
 * Prisma 7 требует драйверный адаптер: строка подключения больше не берётся
 * из schema.prisma, она приходит сюда из окружения.
 *
 * Поверх клиента навешено расширение, запрещающее изменять и удалять записи
 * журнала действий. Это первый рубеж — удобный, с понятной ошибкой в коде.
 * Второй рубеж, который нельзя обойти, — триггер в базе (миграция db_guards).
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Запрет на изменение уже записанного. Возвращает функцию-заглушку для
 * соответствующей операции Prisma.
 */
function deny(model: string, operation: string) {
  return (): never => {
    throw new Error(
      `${model} доступен только на запись: операция "${operation}" запрещена. ` +
        `Журнал действий не переписывается — добавьте новую запись.`,
    );
  };
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  }).$extends({
    name: "append-only-guard",
    query: {
      activityLog: {
        update: deny("ActivityLog", "update"),
        updateMany: deny("ActivityLog", "updateMany"),
        delete: deny("ActivityLog", "delete"),
        deleteMany: deny("ActivityLog", "deleteMany"),
        upsert: deny("ActivityLog", "upsert"),
      },
    },
  });
}

// В режиме разработки Next.js перезагружает модули, и без этого кэша
// накапливались бы десятки пулов подключений.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
