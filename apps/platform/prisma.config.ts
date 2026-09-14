// Prisma 7 больше не берёт строку подключения из schema.prisma —
// она задаётся здесь, а PrismaClient получает драйверный адаптер (src/lib/db.ts).
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
