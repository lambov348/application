import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole, canSeePrices } from "@/server/auth/guards";
import { getDeal, getDealActivity } from "@/server/queries/deals";
import { db } from "@/lib/db";
import { formatCents, formatVatRate, grossCents } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { formatPhone } from "@/lib/phone";
import { MoveForm } from "../MoveForm";
import { PlanForm } from "./PlanForm";
import { OfferForm, SendOfferForm, CopyTextButton } from "./OfferForm";
import { getSettings, legalBlocksMissing } from "@/server/queries/settings";
import { listTeams, assignableUsers } from "@/server/queries/teams";
import { appointmentsOfDeal } from "@/server/queries/appointments";
import { toLocalInputValue } from "@/lib/datetime";
import { PriceForm } from "./PriceForm";
import { DealDetailsForm, ChecklistForm, FirstResponseForm } from "./DealForms";
import { Alert } from "@/components/ui/alert";

export default async function DealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireRole("INHABER", "DISPONENT");
  const { id } = await params;

  const showPrices = canSeePrices(actor);
  const deal = await getDeal(id, showPrices);
  if (!deal) notFound();

  const t = await getTranslations("deals");
  const tPlan = await getTranslations("plan");
  const tOffer = await getTranslations("offers");
  const [activity, teams, members, appointments, settings, offers, catalog] =
    await Promise.all([
      getDealActivity(id),
      listTeams(),
      assignableUsers(),
      appointmentsOfDeal(id),
      getSettings(),
      db.offer.findMany({
        where: { dealId: id },
        orderBy: { version: "desc" },
        include: { items: { orderBy: { position: "asc" } } },
      }),
      db.serviceCatalogItem.findMany({
        where: { active: true },
        orderBy: [{ sort: "asc" }, { name: "asc" }],
        select: { id: true, name: true, unit: true, priceCents: true },
      }),
    ]);

  // Правило 9.2: без правовых блоков Angebot не сохранить.
  const legalMissing = legalBlocksMissing(settings);

  // Значение по умолчанию: завтра 08:00–12:00 по Берлину.
  const tomorrow = new Date(Date.now() + 24 * 60 * 60_000);
  const defaultStart = `${toLocalInputValue(tomorrow).slice(0, 10)}T08:00`;
  const defaultEnd = `${toLocalInputValue(tomorrow).slice(0, 10)}T12:00`;

  // Поля цены приходят из выборки только тем ролям, которым цена разрешена.
  const price = deal as typeof deal & {
    priceNetCents?: number | null;
    vatRateBp?: number;
    priceApproved?: boolean;
    priceApprovedAt?: Date | null;
    priceApprovedBy?: { name: string } | null;
  };

  return (
    <div className="max-w-4xl">
      <a href="/anfragen" className="text-text-2 mb-3 inline-block text-sm hover:underline">
        ← {t("backToBoard")}
      </a>

      <div className="mb-4">
        <span className="text-text-2 text-sm">#{deal.number}</span>
        <h2 className="text-lg font-semibold">{deal.title}</h2>
        <p className="text-sm">
          <a href={`/kunden/${deal.customer.id}`} className="text-blau hover:underline">
            {deal.customerName}
          </a>
          {deal.customer.phone && (
            <>
              {" · "}
              <a href={`tel:${deal.customer.phone}`} className="hover:underline">
                {formatPhone(deal.customer.phone)}
              </a>
            </>
          )}
        </p>
      </div>

      {deal.lostReason && (
        <Alert tone="warning">
          {t("lostNotice", { reason: t(`lostReasons.${deal.lostReason}`) })}
          {deal.lostNote ? ` — ${deal.lostNote}` : ""}
        </Alert>
      )}

      <div className="mb-5">
        <MoveForm dealId={deal.id} status={deal.status} />
      </div>

      {/* Цена — только владельцу. Диспетчер этот блок не получает вовсе. */}
      {showPrices && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          {actor.role === "INHABER" ? (
            <PriceForm
              dealId={deal.id}
              priceNetCents={price.priceNetCents ?? null}
              approvedBy={price.priceApprovedBy?.name ?? null}
              approvedAt={
                price.priceApprovedAt ? formatDateTime(price.priceApprovedAt) : null
              }
            />
          ) : (
            <div className="border-linie bg-blatt rounded-[3px] border p-4">
              <h3 className="mb-1 text-sm font-semibold">{t("priceTitle")}</h3>
              <p className="text-text-2 mb-2 text-xs">{t("priceReadOnly")}</p>
              {price.priceNetCents == null ? (
                <p className="text-text-2 text-sm">{t("noPrice")}</p>
              ) : (
                <p className="text-sm">
                  <b>{formatCents(price.priceNetCents)}</b> {t("net")}
                  {price.priceApproved ? (
                    <span className="text-gruen ml-2 text-xs">{t("approved")}</span>
                  ) : (
                    <span className="text-rot ml-2 text-xs">{t("notApproved")}</span>
                  )}
                </p>
              )}
            </div>
          )}

          {price.priceNetCents != null && price.vatRateBp != null && (
            <div className="border-linie bg-blatt rounded-[3px] border p-4 text-sm">
              <h3 className="mb-2 text-sm font-semibold">{t("sums")}</h3>
              <dl className="grid grid-cols-2 gap-y-1">
                <dt className="text-text-2">{t("net")}</dt>
                <dd className="text-right">{formatCents(price.priceNetCents)}</dd>
                <dt className="text-text-2">
                  {t("vat")} {formatVatRate(price.vatRateBp)}
                </dt>
                <dd className="text-right">
                  {formatCents(grossCents(price.priceNetCents, price.vatRateBp) - price.priceNetCents)}
                </dd>
                <dt className="font-semibold">{t("gross")}</dt>
                <dd className="text-right font-semibold">
                  {formatCents(grossCents(price.priceNetCents, price.vatRateBp))}
                </dd>
              </dl>
            </div>
          )}
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <ChecklistForm
          dealId={deal.id}
          checklist={(deal.checklist ?? {}) as Record<string, boolean>}
        />

        <div className="border-linie bg-blatt rounded-[3px] border p-4">
          <h3 className="mb-2 text-sm font-semibold">{t("firstResponseTitle")}</h3>
          {deal.firstResponseAt ? (
            <p className="text-gruen text-sm">
              {t("firstResponseDone", {
                when: formatDateTime(deal.firstResponseAt),
              })}
            </p>
          ) : (
            <FirstResponseForm dealId={deal.id} />
          )}
        </div>
      </div>

      {/* ── Angebote ───────────────────────────────────────────────── */}
      <section className="mb-5">
        <h3 className="mb-2 text-sm font-semibold uppercase">{tOffer("title")}</h3>

        {legalMissing.length > 0 && (
          <Alert tone="warning">
            {tOffer("legalMissing")}{" "}
            <a href="/einstellungen/firma" className="text-blau underline">
              {tOffer("toSettings")}
            </a>
          </Alert>
        )}

        <div className="border-linie bg-blatt overflow-hidden rounded-[3px] border">
          {offers.length === 0 && (
            <p className="text-text-2 px-4 py-3 text-sm">{tOffer("none")}</p>
          )}

          {offers.map((offer) => (
            <details key={offer.id} open={offer.status === "GESENDET"}>
              <summary className="hover:bg-beton/60 cursor-pointer px-4 py-2.5 text-sm">
                <b>v{offer.version}</b>
                <span className="ml-2">{formatCents(offer.totalGrossCents)}</span>
                <span className="text-text-2 ml-2 text-xs">
                  {tOffer(`statuses.${offer.status}`)}
                  {offer.sentAt && ` · ${formatDateTime(offer.sentAt)}`}
                </span>
              </summary>

              <div className="border-linie border-t p-4">
                {offer.status === "ENTWURF" ? (
                  <>
                    <OfferForm
                      dealId={deal.id}
                      offerId={offer.id}
                      canEdit={legalMissing.length === 0}
                      catalog={catalog}
                      initialLines={offer.items.map((i) => ({
                        description: i.description,
                        qty: i.qty.toString(),
                        unit: i.unit,
                        price: (i.unitPriceCents / 100).toFixed(2).replace(".", ","),
                      }))}
                    />
                    <div className="border-linie mt-4 border-t pt-4">
                      <SendOfferForm offerId={offer.id} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <CopyTextButton text={offer.bodyText} />
                      {offer.acceptToken && (
                        <a
                          href={`/angebot/${offer.acceptToken}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blau text-[13px] underline"
                        >
                          {tOffer("publicLink")}
                        </a>
                      )}
                      {offer.acceptedAt && (
                        <span className="text-gruen text-[13px]">
                          {tOffer("acceptedAt", {
                            when: formatDateTime(offer.acceptedAt),
                            ip: offer.acceptedIp ?? "—",
                          })}
                        </span>
                      )}
                    </div>
                    <pre className="border-linie bg-beton overflow-x-auto rounded-[3px] border p-3 text-xs whitespace-pre-wrap">
                      {offer.bodyText}
                    </pre>
                  </>
                )}
              </div>
            </details>
          ))}

          {legalMissing.length === 0 && (
            <details>
              <summary className="text-blau hover:bg-beton/60 cursor-pointer px-4 py-2.5 text-sm font-semibold">
                + {tOffer("newVersion")}
              </summary>
              <div className="border-linie border-t p-4">
                <OfferForm dealId={deal.id} canEdit catalog={catalog} />
              </div>
            </details>
          )}
        </div>
      </section>

      {/* ── Выезды ─────────────────────────────────────────────────── */}
      <section className="mb-5">
        <h3 className="mb-2 text-sm font-semibold uppercase">{tPlan("title")}</h3>
        <div className="border-linie bg-blatt overflow-hidden rounded-[3px] border">
          {appointments.length === 0 && (
            <p className="text-text-2 px-4 py-3 text-sm">{tPlan("noAppointments")}</p>
          )}

          {appointments.map((a) => (
            <details key={a.id}>
              <summary className="hover:bg-beton/60 cursor-pointer px-4 py-2.5 text-sm">
                <b>
                  {formatDateTime(a.startAt)} – {formatDateTime(a.endAt).slice(-5)}
                </b>
                <span className="text-text-2 ml-2 text-xs">
                  {a.teamName ?? tPlan("noTeam")} · {tPlan(`statuses.${a.status}`)}
                  {a.assignees.length > 0 &&
                    ` · ${a.assignees.map((m) => m.name).join(", ")}`}
                </span>
              </summary>
              <PlanForm
                dealId={deal.id}
                teams={teams.map((x) => ({ id: x.id, name: x.name }))}
                members={members.map((m) => ({ id: m.id, name: m.name }))}
                defaultStart={defaultStart}
                defaultEnd={defaultEnd}
                appointment={{
                  id: a.id,
                  startLocal: toLocalInputValue(a.startAt),
                  endLocal: toLocalInputValue(a.endAt),
                  teamId: a.teamId,
                  status: a.status,
                  dispatcherNote: a.dispatcherNote,
                  assigneeIds: a.assignees.map((m) => m.id),
                }}
              />
            </details>
          ))}

          <details>
            <summary className="text-blau hover:bg-beton/60 cursor-pointer px-4 py-2.5 text-sm font-semibold">
              + {tPlan("plan")}
            </summary>
            <div className="border-linie border-t p-4">
              <PlanForm
                dealId={deal.id}
                teams={teams.map((x) => ({ id: x.id, name: x.name }))}
                members={members.map((m) => ({ id: m.id, name: m.name }))}
                defaultStart={defaultStart}
                defaultEnd={defaultEnd}
              />
            </div>
          </details>
        </div>
      </section>

      <div className="mb-5">
        <DealDetailsForm
          deal={{
            id: deal.id,
            title: deal.title,
            addressId: deal.addressId,
            source: deal.source,
            services: deal.services,
            estHours: deal.estHours?.toString() ?? null,
            estMonteure: deal.estMonteure,
            notes: deal.notes,
          }}
          addresses={deal.customer.addresses}
        />
      </div>

      {/* Лента активности, глава 5.2. */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase">{t("activity")}</h3>
        <div className="border-linie bg-blatt rounded-[3px] border">
          {activity.length === 0 && (
            <p className="text-text-2 px-4 py-3 text-sm">{t("noActivity")}</p>
          )}
          {activity.map((entry) => (
            <div
              key={entry.id}
              className="border-linie-2 flex flex-wrap items-baseline gap-2 border-b px-4 py-2 text-sm last:border-0"
            >
              <span className="text-text-2 text-xs">
                {formatDateTime(entry.createdAt)}
              </span>
              {/* Неизвестный код действия не должен ломать ленту: показываем
                  сам код. Так новое событие видно ещё до перевода. */}
              <span className="font-semibold">
                {t.has(`actions.${entry.action}`)
                  ? t(`actions.${entry.action}`)
                  : entry.action}
              </span>
              <span className="text-text-2 text-xs">
                {entry.user?.name ?? t("systemActor")}
              </span>
              {entry.diff != null && (
                <code className="text-text-2 w-full text-[11px]">
                  {JSON.stringify(entry.diff)}
                </code>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
