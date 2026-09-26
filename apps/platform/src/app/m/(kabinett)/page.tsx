import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireMonteurArea } from "@/server/auth/guards";
import { jobsOfDay } from "@/server/queries/monteur";
import { berlinDateIso, formatTime } from "@/lib/datetime";
import { mapsUrl } from "@/lib/job";
import { formatPhone } from "@/lib/phone";
import { Alert } from "@/components/ui/alert";

/**
 * Экран «Heute» (глава 5.6.1 ТЗ): выезды на сегодня, время, адрес, телефон
 * клиента, кнопка навигации.
 *
 * Страница целиком серверная — на телефоне в подвале каждый килобайт
 * JavaScript это лишняя секунда ожидания. Всё, что нужно для первого
 * взгляда, приезжает готовой разметкой.
 */
export default async function MonteurHeutePage() {
  const user = await requireMonteurArea();
  const t = await getTranslations("monteur");
  const tp = await getTranslations("plan");
  const locale = (await getLocale()) as "de" | "ru";

  // Монтажник видит только свои выезды. Владелец и диспетчер — все:
  // им кабинет нужен, чтобы посмотреть, что происходит на объектах.
  const jobs = await jobsOfDay(user.id, berlinDateIso(), user.role === "MONTEUR");

  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold">{t("today")}</h1>

      {jobs.length === 0 && (
        <Alert tone="info">
          {t("empty")}
          <span className="mt-1 block text-xs">{t("emptyHint")}</span>
        </Alert>
      )}

      <ul className="space-y-3">
        {jobs.map((job) => (
          <li
            key={job.id}
            className="border-linie rounded-[3px] border bg-white p-3"
          >
            <div className="flex items-baseline gap-2">
              <b className="text-[17px]">{formatTime(job.startAt, locale)}</b>
              <span className="text-text-2 text-[13px]">
                – {formatTime(job.endAt, locale)}
              </span>
              <span className="text-text-2 ml-auto text-[11px] uppercase">
                {tp(`statuses.${job.status}`)}
              </span>
            </div>

            <p className="mt-1 font-semibold">{job.title}</p>
            <p className="text-text-2 text-[13px]">
              #{job.dealNumber} · {job.customerName}
            </p>
            <p className="mt-1 text-[13px]">
              {job.street}, {job.zip} {job.city}
              {job.floor ? ` · ${t("floor")} ${job.floor}` : ""}
            </p>

            {/* Три действия, которые нужны у подъезда: открыть, позвонить,
                проложить маршрут. Все — обычные ссылки, работают без JS. */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/m/auftrag/${job.id}`}
                className="bg-blau rounded-[3px] px-3 py-2 text-sm font-semibold text-white"
              >
                {t("openJob")}
              </Link>
              {job.customerPhone && (
                <a
                  href={`tel:${job.customerPhone.replace(/[^\d+]/g, "")}`}
                  className="border-linie rounded-[3px] border px-3 py-2 text-sm font-semibold"
                >
                  {t("call")} {formatPhone(job.customerPhone)}
                </a>
              )}
              <a
                href={mapsUrl(job.street, job.zip, job.city)}
                target="_blank"
                rel="noreferrer noopener"
                className="border-linie rounded-[3px] border px-3 py-2 text-sm font-semibold"
              >
                {t("navigate")}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
