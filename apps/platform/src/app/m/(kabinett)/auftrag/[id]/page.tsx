import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireMonteurArea } from "@/server/auth/guards";
import { jobDetail, runningTimeEntry } from "@/server/queries/monteur";
import { photoMinimums, checkAccess } from "@/server/rules/job";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/datetime";
import { formatMinutes, mapsUrl } from "@/lib/job";
import { formatPhone } from "@/lib/phone";
import { formatCents } from "@/lib/money";
import { Alert } from "@/components/ui/alert";
import { StatusButtons } from "./StatusButtons";
import { PhotoUpload } from "./PhotoUpload";
import { TimeTracker } from "./TimeTracker";
import { ExtraForm } from "./ExtraForm";

/**
 * Экран «Auftrag» (глава 5.6.2 ТЗ): что делать, где, для кого, заметки
 * диспетчера и парковка — плюс всё, что монтажник делает на объекте.
 *
 * Цены здесь нет и быть не может: запрос её не выбирает (глава 4 ТЗ).
 */
export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireMonteurArea();
  const { id } = await params;

  const job = await jobDetail(id);
  if (!job) notFound();

  // Монтажник открывает только свои выезды. Чужой адрес и чужие фотографии
  // клиента ему не нужны — отвечаем «не найдено», а не «нельзя»: иначе по
  // разнице ответов можно перебором узнать, какие выезды существуют.
  if (checkAccess(job, user)) notFound();

  const t = await getTranslations("monteur");
  const tp = await getTranslations("plan");
  const td = await getTranslations("deals");
  const locale = (await getLocale()) as "de" | "ru";

  const [min, running] = await Promise.all([
    photoMinimums(),
    runningTimeEntry(user.id),
  ]);

  const photosOf = (kind: "VORHER" | "NACHHER" | "SCHADEN") =>
    job.photos.filter((p) => p.kind === kind);

  const locked = Boolean(job.handover) || job.status === "ABGESAGT";

  // Время: своя незакрытая запись на этом выезде и общий итог по выезду.
  const runningHere = running?.appointmentId === job.id ? running : null;
  const runningElsewhere = running && running.appointmentId !== job.id;
  const closedEntries = job.timeEntries.filter((e) => e.endAt);
  const totalMinutes = closedEntries.reduce((sum, e) => sum + (e.minutes ?? 0), 0);

  // Номер заказа, на котором у монтажника уже идёт время — чтобы сообщение
  // называло конкретный выезд, а не «где-то ещё».
  let elsewhereNumber: number | null = null;
  if (runningElsewhere) {
    const other = await db.appointment.findUnique({
      where: { id: running.appointmentId },
      select: { deal: { select: { number: true } } },
    });
    elsewhereNumber = other?.deal.number ?? null;
  }

  return (
    <div>
      <Link href="/m" className="text-text-2 mb-3 inline-block text-[13px]">
        ← {t("backToToday")}
      </Link>

      <h1 className="text-lg font-semibold">{job.title}</h1>
      <p className="text-text-2 mb-1 text-[13px]">
        #{job.dealNumber} · {job.customerName}
      </p>
      <p className="mb-3 text-[15px]">
        {formatDate(job.startAt, locale)} · {formatTime(job.startAt, locale)} –{" "}
        {formatTime(job.endAt, locale)}
        <span className="text-text-2 ml-2 text-[12px] uppercase">
          {tp(`statuses.${job.status}`)}
        </span>
      </p>

      {/* Адрес и связь. Первое, что нужно у подъезда. */}
      <section className="border-linie mb-4 rounded-[3px] border bg-white p-3">
        <p className="text-[15px]">
          {job.street}
          <br />
          {job.zip} {job.city}
        </p>
        <p className="text-text-2 mt-1 text-[13px]">
          {job.floor ? `${t("floor")} ${job.floor} · ` : ""}
          {t("elevator")}: {job.elevator ? t("elevatorYes") : t("elevatorNo")}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={mapsUrl(job.street, job.zip, job.city)}
            target="_blank"
            rel="noreferrer noopener"
            className="bg-blau rounded-[3px] px-3 py-2 text-sm font-semibold text-white"
          >
            {t("navigate")}
          </a>
          {job.customerPhone && (
            <a
              href={`tel:${job.customerPhone.replace(/[^\d+]/g, "")}`}
              className="border-linie rounded-[3px] border px-3 py-2 text-sm font-semibold"
            >
              {t("call")} {formatPhone(job.customerPhone)}
            </a>
          )}
        </div>

        {job.parkingNote && (
          <p className="border-linie mt-3 border-t pt-2 text-[13px]">
            <b>{t("parkingNote")}:</b> {job.parkingNote}
          </p>
        )}
      </section>

      {/* Объём работ и заметки. */}
      <section className="border-linie mb-4 rounded-[3px] border bg-white p-3">
        <h2 className="mb-2 text-sm font-semibold">{t("scope")}</h2>
        <ul className="mb-2 text-[13px]">
          {job.services.map((service) => (
            <li key={service}>· {td(`services.${service}`)}</li>
          ))}
        </ul>
        {job.estHours && (
          <p className="text-text-2 text-[13px]">
            {t("estHours")}: {job.estHours} {t("hours")}
          </p>
        )}
        {job.teamName && (
          <p className="text-text-2 text-[13px]">
            {t("team")}: {job.teamName}
          </p>
        )}
        {job.assignees.length > 1 && (
          <p className="text-text-2 text-[13px]">
            {t("withYou")}:{" "}
            {job.assignees
              .filter((a) => a.id !== user.id)
              .map((a) => a.name)
              .join(", ")}
          </p>
        )}
        {job.dispatcherNote && (
          <p className="border-gelb/50 bg-gelb/10 mt-2 rounded-[3px] border p-2 text-[13px]">
            <b>{t("dispatcherNote")}:</b> {job.dispatcherNote}
          </p>
        )}
        {job.dealNotes && (
          <p className="mt-2 text-[13px] whitespace-pre-line">
            <b>{t("dealNotes")}:</b> {job.dealNotes}
          </p>
        )}
      </section>

      <StatusButtons
        appointmentId={job.id}
        status={job.status}
        locked={locked}
      />

      <TimeTracker
        appointmentId={job.id}
        runningSince={runningHere ? formatTime(runningHere.startAt, locale) : null}
        runningElsewhereNumber={elsewhereNumber}
        // Ноль минут — тоже итог: короткий заход показывается как «0 Min.»,
        // а не как «времени нет». Иначе учёт выглядит потерявшим запись.
        totalLabel={
          closedEntries.length > 0 ? formatMinutes(totalMinutes, locale) : null
        }
        locked={locked}
      />

      {/* Фотографии. Минимумы задаёт владелец в настройках. */}
      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold">{t("photosTitle")}</h2>
        <div className="space-y-3">
          <PhotoUpload
            appointmentId={job.id}
            kind="VORHER"
            have={photosOf("VORHER").length}
            need={min.before}
            locked={locked}
          />
          <PhotoUpload
            appointmentId={job.id}
            kind="NACHHER"
            have={photosOf("NACHHER").length}
            need={min.after}
            locked={locked}
          />
          <PhotoUpload
            appointmentId={job.id}
            kind="SCHADEN"
            have={photosOf("SCHADEN").length}
            need={0}
            locked={locked}
          />
        </div>

        {job.photos.length > 0 && (
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {job.photos.map((photo) => (
              <li key={photo.id}>
                {/* Файлы идут через /api/files: там проверяются права.
                    next/image здесь не нужен — снимки и так за проверкой,
                    а оптимизатор только добавил бы работы серверу. */}
                <a href={`/api/files/${photo.storageKey}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${photo.storageKey}`}
                    alt={photo.kind}
                    loading="lazy"
                    className="border-linie h-24 w-full rounded-[3px] border object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Протокол приёмки. */}
      <section className="border-linie mb-4 rounded-[3px] border bg-white p-3">
        <h2 className="mb-2 text-sm font-semibold">{t("handoverTitle")}</h2>
        {job.handover ? (
          <>
            <p className="text-gruen text-[13px]">
              {t("handoverSigned", {
                when: formatDate(job.handover.signedAt, locale),
              })}
            </p>
            {job.handover.pdfKey && (
              <a
                href={`/api/files/${job.handover.pdfKey}`}
                className="text-blau mt-2 inline-block text-[13px] font-semibold"
              >
                {t("handoverPdf")}
              </a>
            )}
          </>
        ) : (
          <Link
            href={`/m/auftrag/${job.id}/abnahme`}
            className="bg-blau inline-block rounded-[3px] px-3 py-2.5 text-sm font-semibold text-white"
          >
            {t("handoverOpen")}
          </Link>
        )}
      </section>

      {/* Материал и доплата. */}
      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold">{t("extrasTitle")}</h2>

        {job.extras.length > 0 && (
          <ul className="mb-3 space-y-2">
            {job.extras.map((extra) => (
              <li
                key={extra.id}
                className="border-linie rounded-[3px] border bg-white p-2 text-[13px]"
              >
                <span className="font-semibold">
                  {extra.kind === "MATERIAL"
                    ? extra.amountCents !== null
                      ? formatCents(extra.amountCents)
                      : ""
                    : `+${extra.extraMinutes} Min.`}
                </span>{" "}
                {extra.description}
                <span className="text-text-2 block text-xs">
                  {t(`extraStatus.${extra.status}`)}
                  {extra.decisionNote ? ` · ${extra.decisionNote}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {job.extras.length === 0 && (
          <p className="text-text-2 mb-3 text-[13px]">{t("extrasNone")}</p>
        )}

        <ExtraForm appointmentId={job.id} locked={locked} />
      </section>
    </div>
  );
}
