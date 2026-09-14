"use server";

import QRCode from "qrcode";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import {
  createTotpSecret,
  createTotpUri,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotpCode,
} from "@/lib/totp";

/**
 * Настройка второго фактора до входа в систему.
 *
 * Роль Inhaber обязана иметь 2FA (глава 4 ТЗ), поэтому владелец при первом
 * входе оказывается здесь, ещё не имея сессии. Доступ защищён повторной
 * проверкой пароля на каждом шаге — сессия для этого не нужна и её нет.
 */

export type SetupState = {
  step: "credentials" | "confirm" | "done";
  error?: string;
  email?: string;
  /** QR-код как data:URL. Показывается только на шаге подтверждения. */
  qrDataUrl?: string;
  /** Тот же секрет текстом — если камера не читает QR. */
  secret?: string;
  /** Коды восстановления. Показываются ровно один раз. */
  recoveryCodes?: string[];
};

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  code: z.string().optional(),
});

/** Общая для обоих шагов проверка пароля. */
async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return user;
}

export async function setupTotpAction(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    code: formData.get("code") ?? undefined,
  });

  if (!parsed.success) {
    return { step: "credentials", error: "invalid_credentials" };
  }
  const { email, password, code } = parsed.data;

  const user = await authenticate(email, password);
  if (!user) {
    return { step: "credentials", error: "invalid_credentials", email };
  }

  // Уже настроенный второй фактор здесь не пересоздаётся: иначе любой, кто
  // знает пароль, мог бы сбросить чужую 2FA. Сброс — только через владельца
  // в разделе управления пользователями.
  if (user.totpEnabledAt) {
    return { step: "credentials", error: "already_enabled", email };
  }

  // ── Шаг 1: пароль верен, кода ещё нет — выдаём секрет и QR ──────────────
  if (!code?.trim()) {
    const secret = createTotpSecret();
    await db.user.update({
      where: { id: user.id },
      // totpEnabledAt остаётся пустым: секрет записан, но фактор не включён.
      data: { totpSecret: encryptSecret(secret) },
    });

    const uri = createTotpUri(secret, user.email);
    return {
      step: "confirm",
      email,
      secret,
      qrDataUrl: await QRCode.toDataURL(uri, { margin: 1, width: 220 }),
    };
  }

  // ── Шаг 2: проверяем код из приложения ──────────────────────────────────
  if (!user.totpSecret) {
    return { step: "credentials", error: "setup_expired", email };
  }

  const secret = decryptSecret(user.totpSecret);
  if (!verifyTotpCode(secret, code)) {
    const uri = createTotpUri(secret, user.email);
    return {
      step: "confirm",
      email,
      error: "wrong_code",
      secret,
      qrDataUrl: await QRCode.toDataURL(uri, { margin: 1, width: 220 }),
    };
  }

  // Код сошёлся — включаем фактор и выдаём коды восстановления.
  const recoveryCodes = generateRecoveryCodes();

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { totpEnabledAt: new Date() },
    });
    // Старые неиспользованные коды больше не действуют.
    await tx.recoveryCode.deleteMany({ where: { userId: user.id } });
    await tx.recoveryCode.createMany({
      data: recoveryCodes.map((c) => ({
        userId: user.id,
        codeHash: hashRecoveryCode(c),
      })),
    });
    await tx.activityLog.create({
      data: {
        entity: "User",
        entityId: user.id,
        userId: user.id,
        action: "user.totp_enabled",
      },
    });
  });

  return { step: "done", email, recoveryCodes };
}
