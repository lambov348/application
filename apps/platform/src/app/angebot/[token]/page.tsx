import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { formatCents, formatVatRate } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { KLEINUNTERNEHMER_NOTE } from "@/lib/legal-texts";
import { AcceptForm } from "./AcceptForm";

/**
 * Публичная страница принятия Angebot (глава 5.4 ТЗ).
 *
 * Открывается без входа в систему по неугадываемому токену. Здесь нет ни
 * навигации, ни ссылок внутрь платформы: клиент видит только своё
 * предложение.
 */
export default async function AngebotPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("publicOffer");

  const offer = await db.offer.findUnique({
    where: { acceptToken: token },
    select: {
      id: true,
      version: true,
      status: true,
      sentAt: true,
      acceptedAt: true,
      declinedAt: true,
      totalNetCents: true,
      vatRateBp: true,
      vatAmountCents: true,
      totalGrossCents: true,
      warrantyText: true,
      parkingText: true,
      scopeText: true,
      items: { orderBy: { position: "asc" } },
      deal: {
        select: {
          title: true,
          customer: { select: { salutation: true, lastName: true, company: true } },
        },
      },
    },
  });

  if (!offer || !offer.sentAt) notFound();

  const settings = await db.settings.findUnique({ where: { id: 1 } });
  const answered = offer.acceptedAt !== null || offer.declinedAt !== null;
  const isKleinunternehmer = offer.vatRateBp === 0;

  return (
    <main className="mx-auto max-w-2xl p-5">
      <header className="border-linie mb-5 border-b pb-3">
        <h1 className="text-lg font-semibold">{settings?.companyName || "MöbelStock24"}</h1>
        {settings?.companyStreet && (
          <p className="text-text-2 text-xs">
            {settings.companyStreet}, {settings.companyZip} {settings.companyCity}
            {settings.companyPhone && ` · ${settings.companyPhone}`}
          </p>
        )}
      </header>

      <h2 className="mb-1 font-semibold">
        {t("title")}
        {offer.version > 1 && ` · ${t("version", { version: offer.version })}`}
      </h2>
      <p className="text-text-2 mb-4 text-xs">
        {t("dated", { date: formatDate(offer.sentAt) })}
      </p>

      <p className="mb-2 text-sm">{offer.deal.title}</p>

      {/* Тот же документ, что и на экране, — файлом: клиенту нужно чем-то
          показать предложение мужу, бухгалтеру или в банк. */}
      <p className="mb-4">
        <a
          href={`/angebot/${token}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="text-blau text-[13px] underline"
        >
          {t("pdf")}
        </a>
      </p>

      <table className="border-linie bg-blatt mb-4 w-full border text-sm">
        <thead className="bg-beton border-linie border-b text-left">
          <tr>
            <th className="px-3 py-2 font-semibold">{t("position")}</th>
            <th className="px-3 py-2 text-right font-semibold">{t("amount")}</th>
          </tr>
        </thead>
        <tbody>
          {offer.items.map((item) => (
            <tr key={item.id} className="border-linie-2 border-b last:border-0">
              <td className="px-3 py-2">
                {item.description}
                {item.unit !== "PAUSCHALE" && (
                  <span className="text-text-2 block text-xs">
                    {item.qty.toString()} × {formatCents(item.unitPriceCents)}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                {formatCents(item.lineNetCents)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-linie border-t">
          {!isKleinunternehmer && (
            <>
              <tr>
                <td className="px-3 py-1 text-right">{t("net")}</td>
                <td className="px-3 py-1 text-right">
                  {formatCents(offer.totalNetCents)}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-1 text-right">
                  {t("vat")} {formatVatRate(offer.vatRateBp)}
                </td>
                <td className="px-3 py-1 text-right">
                  {formatCents(offer.vatAmountCents)}
                </td>
              </tr>
            </>
          )}
          <tr className="font-semibold">
            <td className="px-3 py-2 text-right">{t("total")}</td>
            <td className="px-3 py-2 text-right">
              {formatCents(offer.totalGrossCents)}
            </td>
          </tr>
        </tfoot>
      </table>

      {isKleinunternehmer && (
        <p className="text-text-2 mb-4 text-xs">{KLEINUNTERNEHMER_NOTE}</p>
      )}

      <div className="text-text-2 mb-6 space-y-3 text-xs">
        <p>{offer.scopeText}</p>
        <p>{offer.warrantyText}</p>
        <p>{offer.parkingText}</p>
      </div>

      {answered ? (
        <p className="border-linie bg-beton rounded-[3px] border p-3 text-sm">
          {offer.acceptedAt
            ? t("alreadyAccepted", { date: formatDate(offer.acceptedAt) })
            : t("alreadyDeclined")}
        </p>
      ) : (
        <AcceptForm token={token} />
      )}
    </main>
  );
}
