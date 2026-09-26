/**
 * Приём заявок с сайта (глава 8 ТЗ, Этап 1).
 *
 * POST с подписью HMAC в заголовке. Ответы намеренно скупые: наружу не
 * сообщается, существует ли клиент и что именно не сошлось в подписи.
 */
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { revalidatePath } from "next/cache";
import {
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  intakeLead,
  leadSchema,
  verifySignature,
} from "@/server/jobs/lead-intake";

/** Предел на тело запроса: форма с сайта короткая. */
const MAX_BODY_BYTES = 32 * 1024;

export async function POST(request: Request) {
  const secret = env.LEAD_WEBHOOK_SECRET;
  if (!secret) {
    // Секрет не настроен — эндпоинт закрыт. Открытый приём заявок означал бы
    // мусор в доске у первого же сканера портов.
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const check = verifySignature(
    rawBody,
    request.headers.get(SIGNATURE_HEADER),
    request.headers.get(TIMESTAMP_HEADER),
    secret,
  );
  if (!check.ok) {
    console.warn(`Lead-Webhook abgelehnt: ${check.reason}`);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_payload",
        // Поле с ошибкой сообщаем: это нужно тому, кто настраивает форму.
        field: parsed.error.issues[0]?.path.join(".") ?? null,
      },
      { status: 400 },
    );
  }

  const result = await intakeLead(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: 400 });
  }

  revalidatePath("/anfragen");
  revalidatePath("/heute");

  return NextResponse.json(
    { ok: true, number: result.dealNumber, duplicate: result.duplicate },
    { status: result.duplicate ? 200 : 201 },
  );
}
