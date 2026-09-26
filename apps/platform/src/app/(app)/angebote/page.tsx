import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { db } from "@/lib/db";
import { displayNameOf } from "@/server/queries/customers";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { Alert } from "@/components/ui/alert";

/** Все предложения фирмы. Создаются они в карточке заявки. */
export default async function AngebotePage() {
  await requireRole("INHABER", "DISPONENT");
  const t = await getTranslations("offers");

  const offers = await db.offer.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      version: true,
      status: true,
      sentAt: true,
      acceptedAt: true,
      totalGrossCents: true,
      dealId: true,
      deal: {
        select: {
          number: true,
          title: true,
          customer: {
            select: { type: true, firstName: true, lastName: true, company: true },
          },
        },
      },
    },
  });

  if (offers.length === 0) {
    return <Alert tone="info">{t("listEmpty")}</Alert>;
  }

  return (
    <div className="border-linie bg-blatt max-w-4xl overflow-hidden rounded-[3px] border">
      <table className="w-full text-sm">
        <thead className="border-linie bg-beton border-b text-left">
          <tr>
            <th className="px-4 py-2 font-semibold">{t("deal")}</th>
            <th className="px-4 py-2 font-semibold">{t("customer")}</th>
            <th className="px-4 py-2 font-semibold">{t("state")}</th>
            <th className="px-4 py-2 text-right font-semibold">{t("sum")}</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.id} className="border-linie-2 hover:bg-beton/50 border-b">
              <td className="px-4 py-2">
                <a href={`/anfragen/${offer.dealId}`} className="font-semibold hover:underline">
                  #{offer.deal.number} · v{offer.version}
                </a>
                <span className="text-text-2 block text-xs">{offer.deal.title}</span>
              </td>
              <td className="px-4 py-2">{displayNameOf(offer.deal.customer)}</td>
              <td className="px-4 py-2">
                {t(`statuses.${offer.status}`)}
                {offer.sentAt && (
                  <span className="text-text-2 block text-xs">
                    {formatDateTime(offer.sentAt)}
                  </span>
                )}
              </td>
              <td className="px-4 py-2 text-right font-semibold">
                {formatCents(offer.totalGrossCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
