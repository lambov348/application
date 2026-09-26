/**
 * Данные панели «Heute» (глава 5 ТЗ).
 *
 * Панель отвечает на один вопрос: что сегодня требует внимания. Поэтому
 * здесь не «красивые показатели», а то, по чему нужно действовать: выезды
 * дня, необработанные заявки, нерешённые сообщения о доплате.
 */
import { db } from "@/lib/db";
import { berlinDateIso, berlinDayStart } from "@/lib/datetime";
import { displayNameOf } from "./customers";

/** Заявка, на которую ещё не ответили. Метрика главы 1: ответ < 15 минут. */
const FIRST_RESPONSE_MINUTES = 15;

export async function dashboardData() {
  const dayStart = berlinDayStart(berlinDateIso());
  const dayEnd = berlinDayStart(
    berlinDateIso(new Date(dayStart.getTime() + 36 * 60 * 60_000)),
  );
  const overdueBefore = new Date(Date.now() - FIRST_RESPONSE_MINUTES * 60_000);

  const [appointments, counts, unanswered, openOffers] = await Promise.all([
    db.appointment.findMany({
      where: {
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
        status: { not: "ABGESAGT" },
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        team: { select: { name: true, color: true } },
        deal: {
          select: {
            id: true,
            number: true,
            title: true,
            customer: {
              select: {
                type: true,
                firstName: true,
                lastName: true,
                company: true,
              },
            },
          },
        },
        address: { select: { zip: true, city: true } },
        assignees: { select: { user: { select: { name: true } } } },
        handover: { select: { signedAt: true } },
      },
    }),

    db.deal.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { status: { in: ["NEU", "DATEN_FEHLEN", "NACHFASSEN", "ANGEBOT_RAUS"] } },
    }),

    // Заявки без первого ответа дольше четверти часа — то, что горит.
    db.deal.findMany({
      where: {
        firstResponseAt: null,
        status: { in: ["NEU", "DATEN_FEHLEN"] },
        createdAt: { lt: overdueBefore },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: {
        id: true,
        number: true,
        title: true,
        createdAt: true,
        customer: {
          select: {
            type: true,
            firstName: true,
            lastName: true,
            company: true,
          },
        },
      },
    }),

    db.offer.count({ where: { status: "GESENDET", acceptedAt: null } }),
  ]);

  const countOf = (status: string) =>
    counts.find((c) => c.status === status)?._count._all ?? 0;

  return {
    appointments: appointments.map((a) => ({
      id: a.id,
      dealId: a.deal.id,
      dealNumber: a.deal.number,
      title: a.deal.title,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      teamName: a.team?.name ?? null,
      teamColor: a.team?.color ?? null,
      customerName: displayNameOf(a.deal.customer),
      zip: a.address.zip,
      city: a.address.city,
      assignees: a.assignees.map((x) => x.user.name),
      handoverSigned: Boolean(a.handover?.signedAt),
    })),
    counts: {
      neu: countOf("NEU"),
      datenFehlen: countOf("DATEN_FEHLEN"),
      nachfassen: countOf("NACHFASSEN"),
      angebotRaus: countOf("ANGEBOT_RAUS"),
      offeneAngebote: openOffers,
    },
    unanswered: unanswered.map((d) => ({
      id: d.id,
      number: d.number,
      title: d.title,
      createdAt: d.createdAt,
      customerName: displayNameOf(d.customer),
      waitingMinutes: Math.floor((Date.now() - d.createdAt.getTime()) / 60_000),
    })),
  };
}
