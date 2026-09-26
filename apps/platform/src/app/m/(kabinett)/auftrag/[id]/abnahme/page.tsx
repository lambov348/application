import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireMonteurArea } from "@/server/auth/guards";
import { jobDetail } from "@/server/queries/monteur";
import { checkAccess, photoMinimums } from "@/server/rules/job";
import { formatDate } from "@/lib/datetime";
import { Alert } from "@/components/ui/alert";
import { HandoverForm } from "./HandoverForm";

/**
 * Экран приёмки (глава 5.6.5 ТЗ).
 *
 * Отдельная страница, а не блок на карточке заказа: подпись ставит клиент,
 * и в этот момент на экране не должно быть ничего лишнего — ни статусов,
 * ни кнопок доплаты.
 */
export default async function AbnahmePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireMonteurArea();
  const { id } = await params;

  const job = await jobDetail(id);
  if (!job) notFound();
  if (checkAccess(job, user)) notFound();

  // Протокол уже подписан — возвращаем на карточку, там ссылка на PDF.
  if (job.handover) redirect(`/m/auftrag/${id}`);

  const t = await getTranslations("handover");
  const tm = await getTranslations("monteur");
  const locale = (await getLocale()) as "de" | "ru";

  const min = await photoMinimums();
  const photosAfter = job.photos.filter((p) => p.kind === "NACHHER").length;
  const photosMissing = photosAfter < min.after;

  return (
    <div>
      <Link
        href={`/m/auftrag/${id}`}
        className="text-text-2 mb-3 inline-block text-[13px]"
      >
        ← {tm("job")} #{job.dealNumber}
      </Link>

      <h1 className="text-lg font-semibold">{t("title")}</h1>
      <p className="text-text-2 mb-1 text-[13px]">
        #{job.dealNumber} · {job.customerName}
      </p>
      <p className="mb-4 text-[13px]">
        {job.street}, {job.zip} {job.city} · {formatDate(job.startAt, locale)}
      </p>

      {/* Правило 9.4: без фотографий «после» приёмка не открывается. */}
      {photosMissing ? (
        <>
          <Alert tone="warning">
            {t("photosFirst", { need: min.after, have: photosAfter })}
          </Alert>
          <Link
            href={`/m/auftrag/${id}`}
            className="bg-blau inline-block rounded-[3px] px-4 py-3 text-sm font-semibold text-white"
          >
            {tm("addPhotos")}
          </Link>
        </>
      ) : (
        <>
          <noscript>
            <Alert tone="error">{t("noScript")}</Alert>
          </noscript>
          <HandoverForm appointmentId={job.id} />
        </>
      )}
    </div>
  );
}
