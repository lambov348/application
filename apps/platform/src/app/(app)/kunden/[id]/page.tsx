import { notFound } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { getCustomer } from "@/server/queries/customers";
import { formatPhone } from "@/lib/phone";
import { CustomerForm } from "../CustomerForm";
import { AddressForm, DangerZone } from "./AddressForms";
import { Alert } from "@/components/ui/alert";

/**
 * Карточка клиента: контакты, адреса, история заказов, работа с данными.
 * Глава 5.10 ТЗ.
 */
export default async function KundePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireRole("INHABER", "DISPONENT");
  const { id } = await params;

  const customer = await getCustomer(id);
  if (!customer) notFound();

  const t = await getTranslations("customers");
  const format = await getFormatter();
  const anonymized = customer.anonymizedAt !== null;

  return (
    <div className="max-w-3xl">
      <a href="/kunden" className="text-text-2 mb-3 inline-block text-sm hover:underline">
        ← {t("backToList")}
      </a>

      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <h2 className="text-lg font-semibold">
          {customer.displayName || t("noName")}
        </h2>
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="text-blau text-sm hover:underline">
            {formatPhone(customer.phone)}
          </a>
        )}
        {customer.email && (
          <a href={`mailto:${customer.email}`} className="text-blau text-sm hover:underline">
            {customer.email}
          </a>
        )}
      </div>

      {customer.deletedAt && !anonymized && (
        <Alert tone="warning">{t("archivedNotice")}</Alert>
      )}
      {anonymized && <Alert tone="info">{t("anonymizedNotice")}</Alert>}

      {/* ── Заказы ─────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold uppercase">{t("dealsTitle")}</h3>
        {customer.deals.length === 0 ? (
          <div className="border-linie bg-blatt text-text-2 rounded-[3px] border p-4 text-sm">
            {t("noDeals")}
          </div>
        ) : (
          <div className="border-linie bg-blatt overflow-hidden rounded-[3px] border">
            <table className="w-full text-sm">
              <tbody>
                {customer.deals.map((deal) => (
                  <tr key={deal.id} className="border-linie-2 border-b last:border-0">
                    <td className="px-4 py-2 font-semibold">#{deal.number}</td>
                    <td className="px-4 py-2">{deal.title}</td>
                    <td className="text-text-2 px-4 py-2">{deal.status}</td>
                    <td className="text-text-2 px-4 py-2 text-right">
                      {format.dateTime(deal.createdAt, { dateStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Адреса ─────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold uppercase">{t("addressesTitle")}</h3>
        <div className="border-linie bg-blatt overflow-hidden rounded-[3px] border">
          {customer.addresses.length === 0 && (
            <p className="text-text-2 px-4 py-3 text-sm">{t("noAddresses")}</p>
          )}

          {customer.addresses.map((a) => (
            <details key={a.id}>
              <summary className="hover:bg-beton/60 cursor-pointer px-4 py-2.5 text-sm">
                <span className="font-semibold">
                  {a.street}, {a.zip} {a.city}
                </span>
                <span className="text-text-2 ml-2 text-xs">
                  {a.label && `${a.label} · `}
                  {a.floor && `${a.floor} · `}
                  {a.elevator ? t("withElevator") : t("noElevator")}
                </span>
              </summary>
              {!anonymized && <AddressForm customerId={customer.id} address={a} />}
            </details>
          ))}

          {!anonymized && (
            <details>
              <summary className="text-blau hover:bg-beton/60 cursor-pointer px-4 py-2.5 text-sm font-semibold">
                + {t("addAddress")}
              </summary>
              <AddressForm customerId={customer.id} />
            </details>
          )}
        </div>
      </section>

      {/* ── Данные клиента ─────────────────────────────────────────────── */}
      {!anonymized && (
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold uppercase">{t("dataSection")}</h3>
          <CustomerForm
            customer={{
              id: customer.id,
              type: customer.type,
              salutation: customer.salutation,
              firstName: customer.firstName,
              lastName: customer.lastName,
              company: customer.company,
              email: customer.email,
              phone: customer.phone,
              language: customer.language,
              notes: customer.notes,
              tags: customer.tags,
            }}
          />
        </section>
      )}

      <section>
        <DangerZone
          customerId={customer.id}
          archived={customer.deletedAt !== null}
          anonymized={anonymized}
          // Необратимое удаление персональных данных — только владелец.
          canAnonymize={actor.role === "INHABER"}
        />
      </section>
    </div>
  );
}
