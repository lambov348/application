import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { dashboardData } from "@/server/queries/dashboard";
import { openExtras } from "@/server/queries/monteur";
import { formatTime, formatDateTime } from "@/lib/datetime";
import { formatCents } from "@/lib/money";
import { formatMinutes } from "@/lib/job";
import { Alert } from "@/components/ui/alert";
import { ExtraDecision } from "./ExtraDecision";

/**
 * Панель «Heute»: что требует внимания сегодня.
 *
 * Показываются только настоящие данные. Пустой блок означает, что делать
 * нечего, — это тоже ответ, и он честнее выдуманных показателей.
 */
export default async function HeutePage() {
  const user = await requireRole("INHABER", "DISPONENT");
  const t = await getTranslations("heute");
  const tp = await getTranslations("plan");
  const locale = (await getLocale()) as "de" | "ru";

  const [data, extras] = await Promise.all([dashboardData(), openExtras()]);

  const nothingToDo =
    data.appointments.length === 0 &&
    data.unanswered.length === 0 &&
    extras.length === 0 &&
    data.counts.neu === 0;

  return (
    <div>
      <p className="mb-4 text-sm">{t("greeting", { name: user.name })}</p>

      {nothingToDo && <Alert tone="info">{t("allClear")}</Alert>}

      {/* Счётчики по доске. Ссылки ведут в нужную колонку. */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          href="/anfragen?status=NEU"
          label={t("tileNew")}
          value={data.counts.neu}
        />
        <Tile
          href="/anfragen?status=DATEN_FEHLEN"
          label={t("tileMissing")}
          value={data.counts.datenFehlen}
        />
        <Tile
          href="/anfragen?status=NACHFASSEN"
          label={t("tileFollowUp")}
          value={data.counts.nachfassen}
        />
        <Tile
          href="/angebote"
          label={t("tileOpenOffers")}
          value={data.counts.offeneAngebote}
        />
      </div>

      {/* Заявки без ответа. Метрика главы 1 ТЗ: первый ответ за 15 минут. */}
      {data.unanswered.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">{t("unansweredTitle")}</h2>
          <p className="text-text-2 mb-2 text-xs">{t("unansweredHint")}</p>
          <ul className="border-linie divide-linie divide-y rounded-[3px] border bg-white">
            {data.unanswered.map((deal) => (
              <li key={deal.id} className="px-3 py-2 text-sm">
                <Link href={`/anfragen/${deal.id}`} className="font-semibold">
                  #{deal.number} {deal.title}
                </Link>
                <span className="text-text-2 ml-2 text-[13px]">
                  {deal.customerName}
                </span>
                <span className="text-rot ml-2 text-[13px] font-semibold">
                  {formatMinutes(deal.waitingMinutes, locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Выезды дня. */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">{t("todayTitle")}</h2>
        {data.appointments.length === 0 ? (
          <p className="text-text-2 text-[13px]">{t("noAppointments")}</p>
        ) : (
          <ul className="border-linie divide-linie divide-y rounded-[3px] border bg-white">
            {data.appointments.map((job) => (
              <li key={job.id} className="flex items-baseline gap-2 px-3 py-2 text-sm">
                <b className="w-24 shrink-0">
                  {formatTime(job.startAt, locale)}–{formatTime(job.endAt, locale)}
                </b>
                <Link href={`/anfragen/${job.dealId}`} className="font-semibold">
                  #{job.dealNumber} {job.title}
                </Link>
                <span className="text-text-2 text-[13px]">
                  {job.customerName} · {job.zip} {job.city}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-2 text-[12px]">
                  {job.teamName && (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: job.teamColor ?? "#646C6F" }}
                      aria-hidden
                    />
                  )}
                  <span className="text-text-2 uppercase">
                    {tp(`statuses.${job.status}`)}
                  </span>
                  {job.handoverSigned && <span className="text-gruen">✓</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Сообщения о доплате с объектов (глава 5.6.7 ТЗ). */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">{t("extrasTitle")}</h2>
        {extras.length === 0 ? (
          <p className="text-text-2 text-[13px]">{t("extrasNone")}</p>
        ) : (
          <ul className="space-y-2">
            {extras.map((extra) => (
              <li
                key={extra.id}
                className="border-gelb/50 bg-gelb/5 rounded-[3px] border p-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <b>
                    {extra.kind === "MATERIAL"
                      ? extra.amountCents !== null
                        ? formatCents(extra.amountCents)
                        : ""
                      : `+${extra.extraMinutes} Min.`}
                  </b>
                  <span>{extra.description}</span>
                </div>
                <p className="text-text-2 mt-1 text-[13px]">
                  <Link href={`/anfragen/${extra.dealId}`} className="underline">
                    #{extra.dealNumber} {extra.dealTitle}
                  </Link>
                  {" · "}
                  {extra.reportedByName} · {formatDateTime(extra.createdAt, locale)}
                </p>

                {/* Решение принимает только владелец: это деньги. */}
                {user.role === "INHABER" ? (
                  <ExtraDecision extraId={extra.id} />
                ) : (
                  <p className="text-text-2 mt-1 text-xs">{t("extraOwnerOnly")}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="border-linie hover:bg-beton/60 rounded-[3px] border bg-white p-3"
    >
      <span className="block text-2xl font-semibold">{value}</span>
      <span className="text-text-2 text-[13px]">{label}</span>
    </Link>
  );
}
