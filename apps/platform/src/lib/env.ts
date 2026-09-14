/**
 * Проверка переменных окружения при старте.
 * Приложение должно падать сразу с понятным текстом, а не на первом запросе
 * клиента через два часа после деплоя.
 */
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL не задан"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET короче 32 символов"),
  AUTH_URL: z.string().url().optional(),
  SESSION_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(28800),
  // 32 байта в base64 — ровно 44 символа с выравниванием.
  ENCRYPTION_KEY: z
    .string()
    .refine(
      (v) => Buffer.from(v, "base64").length === 32,
      "ENCRYPTION_KEY должен быть 32 байтами в base64 (openssl rand -base64 32)",
    ),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./storage"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  LEAD_WEBHOOK_SECRET: z.string().optional(),
  DISPLAY_TIMEZONE: z.string().default("Europe/Berlin"),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Неверная конфигурация окружения:\n${details}`);
  }
  const env = parsed.data;

  // Драйвер s3 бессмысленен без реквизитов: лучше упасть на старте.
  if (env.STORAGE_DRIVER === "s3") {
    const missing = (
      ["S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const
    ).filter((k) => !env[k]);
    if (missing.length > 0) {
      throw new Error(`STORAGE_DRIVER=s3, но не заданы: ${missing.join(", ")}`);
    }
  }
  return env;
}

/**
 * Проверка выполняется при первом обращении к переменной, а не при загрузке
 * модуля. Иначе `npm run build` требовал бы заполненный .env, а Dockerfile
 * собирает образ до того, как секреты попадают в контейнер.
 */
let cached: ReturnType<typeof load> | null = null;

export const env = new Proxy({} as ReturnType<typeof load>, {
  get(_target, prop) {
    cached ??= load();
    return cached[prop as keyof typeof cached];
  },
});
