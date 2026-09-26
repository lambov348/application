/**
 * PDF предложения для сотрудников офиса.
 *
 * Роль Monteur сюда не допускается: в документе стоят цены, а глава 4 ТЗ
 * запрещает показывать их монтажнику. Поэтому проверка роли явная, а файл
 * не выдаётся через общий /api/files.
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/guards";
import { storage } from "@/lib/storage";
import { ensureOfferPdf } from "@/server/jobs/offer-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 401 });
  if (user.role === "MONTEUR") return new NextResponse(null, { status: 404 });

  const { id } = await params;
  const key = await ensureOfferPdf(id);
  if (!key) return new NextResponse(null, { status: 404 });

  const file = await storage().get(key);
  if (!file) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(file.data.byteLength),
      "Content-Disposition": `inline; filename="Angebot-${id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
