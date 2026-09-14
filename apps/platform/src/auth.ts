/**
 * Вход в систему: email + пароль, для роли Inhaber обязателен второй фактор.
 *
 * Почему JWT, а не сессии в базе: Auth.js не поддерживает сессии в БД вместе
 * с входом по паролю — это ограничение библиотеки. Отзыв сессий сделан через
 * User.sessionsValidFrom: токен, выданный раньше этой отметки, недействителен.
 * Проверка живёт в src/server/auth/guards.ts, где есть доступ к базе.
 */
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "./lib/db";
import { verifyPassword } from "./lib/password";
import { decryptSecret } from "./lib/crypto";
import { recoveryCodeMatches, verifyTotpCode } from "./lib/totp";

/**
 * Коды ошибок входа. Auth.js прокидывает поле `code` наружу, по нему форма
 * решает, что показать: сообщение об ошибке или поле для кода 2FA.
 */
export class SignInError extends CredentialsSignin {
  constructor(public readonly reason: string) {
    super(reason);
    this.code = reason;
  }
}

export const SIGNIN_ERRORS = {
  /** Неверная пара email+пароль, либо пользователь отключён. */
  INVALID_CREDENTIALS: "invalid_credentials",
  /** Пароль верный, нужен второй фактор. */
  TOTP_REQUIRED: "totp_required",
  /** Второй фактор введён, но не подошёл. */
  TOTP_INVALID: "totp_invalid",
  /** Роль Inhaber обязана иметь 2FA, но она ещё не настроена. */
  TOTP_SETUP_REQUIRED: "totp_setup_required",
  /** Слишком много неудачных попыток. */
  TOO_MANY_ATTEMPTS: "too_many_attempts",
} as const;

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().optional(),
  recoveryCode: z.string().optional(),
});

// ─── Ограничение частоты попыток ────────────────────────────────────────────
// Счётчик в памяти процесса. Этого достаточно, пока приложение крутится одним
// экземпляром, как в текущем docker-compose. При запуске нескольких копий
// счётчик надо перенести в Redis — он уже поднят в compose.
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; firstAt: number }>();

function tooManyAttempts(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function noteFailure(key: string): void {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  entry.count += 1;
}

function clearFailures(key: string): void {
  attempts.delete(key);
}

/** Запись в журнал действий. Неудача записи не должна ронять вход. */
async function logAuthEvent(
  action: string,
  userId: string | null,
  diff?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        entity: "User",
        entityId: userId ?? "unbekannt",
        userId,
        action,
        diff: diff ? (diff as object) : undefined,
      },
    });
  } catch {
    // Журнал не должен блокировать вход сотрудника на объекте.
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        totp: {},
        recoveryCode: {},
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          throw new SignInError(SIGNIN_ERRORS.INVALID_CREDENTIALS);
        }
        const { password, totp, recoveryCode } = parsed.data;
        const email = parsed.data.email.trim().toLowerCase();

        if (tooManyAttempts(email)) {
          await logAuthEvent("auth.rate_limited", null, { email });
          throw new SignInError(SIGNIN_ERRORS.TOO_MANY_ATTEMPTS);
        }

        const user = await db.user.findUnique({
          where: { email },
          include: { recoveryCodes: { where: { usedAt: null } } },
        });

        // Пароль проверяется даже для несуществующего пользователя: иначе по
        // времени ответа видно, какие адреса заведены в системе.
        const passwordOk = user
          ? await verifyPassword(password, user.passwordHash)
          : await verifyPassword(password, "scrypt$65536$8$1$AAAA$AAAA");

        if (!user || !user.active || !passwordOk) {
          noteFailure(email);
          await logAuthEvent("auth.failed", user?.id ?? null, {
            email,
            reason: !user
              ? "unbekannter Benutzer"
              : !user.active
                ? "Benutzer deaktiviert"
                : "falsches Passwort",
          });
          throw new SignInError(SIGNIN_ERRORS.INVALID_CREDENTIALS);
        }

        // Второй фактор. Обязателен для владельца (глава 4 ТЗ) и включается
        // добровольно остальными.
        if (user.totpSecret && user.totpEnabledAt) {
          const supplied = totp?.trim() || recoveryCode?.trim();
          if (!supplied) {
            // Не ошибка входа: пароль верен, форма должна показать поле кода.
            throw new SignInError(SIGNIN_ERRORS.TOTP_REQUIRED);
          }

          let secondFactorOk = false;

          if (totp?.trim()) {
            secondFactorOk = verifyTotpCode(decryptSecret(user.totpSecret), totp);
          }

          if (!secondFactorOk && recoveryCode?.trim()) {
            const match = user.recoveryCodes.find((rc) =>
              recoveryCodeMatches(recoveryCode, rc.codeHash),
            );
            if (match) {
              // Код восстановления одноразовый — гасим сразу.
              await db.recoveryCode.update({
                where: { id: match.id },
                data: { usedAt: new Date() },
              });
              await logAuthEvent("auth.recovery_code_used", user.id, {
                verbleibend: user.recoveryCodes.length - 1,
              });
              secondFactorOk = true;
            }
          }

          if (!secondFactorOk) {
            noteFailure(email);
            await logAuthEvent("auth.totp_failed", user.id);
            throw new SignInError(SIGNIN_ERRORS.TOTP_INVALID);
          }
        } else if (user.role === "INHABER") {
          // Владелец без настроенного второго фактора внутрь не проходит.
          // Настройка делается отдельным защищённым потоком на /login/2fa-setup.
          throw new SignInError(SIGNIN_ERRORS.TOTP_SETUP_REQUIRED);
        }

        clearFailures(email);
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await logAuthEvent("auth.success", user.id, { rolle: user.role });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionsValidFrom: user.sessionsValidFrom.getTime(),
        };
      },
    }),
  ],
});
