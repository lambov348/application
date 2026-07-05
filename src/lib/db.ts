import { PrismaClient } from "@prisma/client";

// Единственный экземпляр PrismaClient. В dev-режиме Next.js часто перезагружает
// модули, поэтому кэшируем клиент в globalThis, чтобы не плодить соединения.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
