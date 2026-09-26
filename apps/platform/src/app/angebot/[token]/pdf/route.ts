/**
 * PDF предложения по публичной ссылке — то же, что клиент видит на странице.
 *
 * Входа в систему нет, единственная защита — неугадываемый токен, как и на
 * самой странице предложения. Черновик по ссылке недоступен: пока предложение
 * не отправлено, документа для клиента не существует.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { ensureOfferPdf } from "@/server/jobs/offer-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 20) return new NextResponse(null, { status: 404 });

  const offer = await db.offer.findUnique({
    where: { acceptToken: token },
    select: { id: true, sentAt: true, deal: { select: { number: true } } },
  });
  if (!offer?.sentAt) return new NextResponse(null, { status: 404 });

  const key = await ensureOfferPdf(offer.id);
  if (!key) return new NextResponse(null, { status: 404 });

  const file = await storage().get(key);
  if (!file) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(file.data.byteLength),
      "Content-Disposition": `inline; filename="Angebot-${offer.deal.number}.pdf"`,
      // Личный документ клиента: промежуточные кеши его хранить не должны.
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
