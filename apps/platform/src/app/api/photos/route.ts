/**
 * Приём снимков из очереди отправки (глава 5.6.4 ТЗ: «загружаются даже при
 * плохой связи»).
 *
 * Отдельный эндпоинт, а не серверное действие: очередь в телефоне должна
 * повторять отправку сама, видеть код ответа и понимать, стоит ли пробовать
 * ещё раз. Форма без JavaScript работает через серверное действие — правила
 * у обоих путей общие (src/server/jobs/photos.ts).
 */
import { NextResponse } from "next/server";
import type { PhotoKind } from "@prisma/client";
import { getCurrentUser } from "@/server/auth/guards";
import { savePhoto } from "@/server/jobs/photos";
import { MAX_UPLOAD_BYTES } from "@/lib/storage";

const KINDS: PhotoKind[] = ["VORHER", "NACHHER", "SCHADEN"];

/**
 * Защита от запроса с чужого сайта. Серверные действия Next делают это сами,
 * свой обработчик обязан проверить источник вручную: браузер приложит куки
 * к POST с любой страницы.
 */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ code: "bad_origin" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    // Очередь по этому коду поймёт: отправлять бесполезно, нужен вход.
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ code: "bad_request" }, { status: 400 });
  }

  const appointmentId = String(form.get("appointmentId") ?? "");
  const kindRaw = String(form.get("kind") ?? "");
  const clientKey = String(form.get("clientKey") ?? "");
  const file = form.get("file");

  if (!appointmentId || !KINDS.includes(kindRaw as PhotoKind)) {
    return NextResponse.json({ code: "bad_request" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ code: "no_file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ code: "too_large" }, { status: 413 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  const result = await savePhoto(
    {
      appointmentId,
      kind: kindRaw as PhotoKind,
      clientKey,
      contentType: file.type,
      data,
    },
    user,
  );

  if (!result.ok) {
    // 422 — «так отправлять не нужно»: очередь такие снимки не повторяет,
    // а показывает монтажнику причину.
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: result.code === "not_found" ? 404 : 422 },
    );
  }

  return NextResponse.json({
    id: result.id,
    duplicate: result.duplicate,
  });
}
