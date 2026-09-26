/**
 * Часть конфигурации Auth.js, пригодная для edge-среды: без Prisma и без
 * node:crypto. Её использует middleware для грубой маршрутизации по ролям.
 *
 * Авторитетная проверка (активен ли пользователь, не отозваны ли сессии,
 * не сменилась ли роль) делается в src/server/auth/guards.ts — там есть база.
 * Middleware лишь не пускает монтажника в бухгалтерию по URL.
 */
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/** Префиксы маршрутов и роли, которым они доступны. */
export const ROUTE_ACCESS: { prefix: string; roles: Role[] }[] = [
  // Кабинет монтажника. Владелец и диспетчер тоже заходят — посмотреть глазами
  // монтажника, что тот видит на объекте.
  { prefix: "/m", roles: ["MONTEUR", "INHABER", "DISPONENT"] },
  { prefix: "/einstellungen", roles: ["INHABER"] },
  { prefix: "/angebote", roles: ["INHABER", "DISPONENT"] },
  { prefix: "/anfragen", roles: ["INHABER", "DISPONENT"] },
  { prefix: "/einsatzplan", roles: ["INHABER", "DISPONENT"] },
  { prefix: "/kunden", roles: ["INHABER", "DISPONENT"] },
  { prefix: "/heute", roles: ["INHABER", "DISPONENT"] },
  // PDF предложения: в документе стоят цены, монтажнику их видеть нельзя
  // (глава 4 ТЗ). Обработчик проверяет роль ещё раз.
  { prefix: "/api/angebote", roles: ["INHABER", "DISPONENT"] },
];

/** Маршруты, открытые без входа. */
const PUBLIC_PREFIXES = [
  "/login", // вход для офиса
  "/m/anmelden", // вход для бригады
  "/offline", // заглушка «нет связи» для service worker
  "/angebot", // публичная страница принятия Angebot по токену
  "/api/auth",
  "/api/webhook",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Куда отправить пользователя сразу после входа — по его роли. */
export function landingPageFor(role: Role): string {
  return role === "MONTEUR" ? "/m" : "/heute";
}

export const authConfig = {
  // Приложение работает за обратным прокси (Caddy), а не на Vercel: без этого
  // Auth.js отвергает заголовки Host и Origin, пришедшие от прокси.
  trustHost: true,

  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: Number(process.env.SESSION_MAX_AGE_SECONDS ?? 28800),
  },
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      if (isPublic(pathname)) return true;

      const role = auth?.user?.role;
      if (!role) return false; // Auth.js сам отправит на /login

      const rule = ROUTE_ACCESS.find(
        (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
      );
      // Маршрут без правила доступен любому вошедшему.
      return rule ? rule.roles.includes(role) : true;
    },

    /** Переносим роль и отметку отзыва сессий в токен. */
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.sessionsValidFrom = user.sessionsValidFrom;
      }
      return token;
    },

    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.role) session.user.role = token.role;
      if (token.sessionsValidFrom) {
        session.user.sessionsValidFrom = token.sessionsValidFrom;
      }
      return session;
    },
  },
  providers: [], // настоящий провайдер добавляется в src/auth.ts (нужен Node)
} satisfies NextAuthConfig;
