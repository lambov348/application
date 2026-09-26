# Многоступенчатая сборка.
#
# Три итоговых образа из одного файла:
#   runner — то, что крутится в проде: без исходников и без devDependencies;
#   tools  — миграции и разовые команды: там нужен prisma CLI и scripts/.
#
# Разделение не косметическое: prisma и tsx лежат в devDependencies, и
# запустить миграцию или создание владельца из runner-образа невозможно.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma generate не подключается к базе, но prisma.config.ts требует строку
# подключения и намеренно падает, когда её нет. Значение нужно только этой
# стадии и в рабочий образ не попадает: стадии не наследуют переменные.
# Без него сборка образа падала на «Cannot resolve environment variable:
# DATABASE_URL» — то есть при первом же `docker compose up --build` на сервере.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
RUN npx prisma generate && npm run build

# ─── Образ для миграций и разовых команд ────────────────────────────────────
# Содержит devDependencies (prisma CLI, tsx), схему, конфиг и скрипты.
FROM node:22-alpine AS tools
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/scripts ./scripts
# scripts/create-user.ts импортирует хеширование паролей из src/lib.
COPY --from=builder /app/src ./src
CMD ["npx", "prisma", "migrate", "deploy"]

# ─── Рабочий образ ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# output: "standalone" собирает минимальный набор зависимостей.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Загруженные файлы переживают пересборку образа только на томе.
RUN mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

# Проверка живости: Caddy и compose по ней понимают, поднялось ли приложение.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
