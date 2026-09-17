import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { listTeams } from "@/server/queries/teams";
import { appointmentsBetween } from "@/server/queries/appointments";
import {
  formatDate,
  formatTime,
  berlinDateIso,
  berlinDayStart,
  berlinWeekStart,
  berlinDays,
} from "@/lib/datetime";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

/**
 * Календарь и диспетчеризация (глава 5.3 ТЗ).
 *
 * По горизонтали дни, по вертикали бригады — как в ТЗ. Вид «неделя» основной,
 * «день» для плотных дней. Страница целиком серверная: сетка приезжает
 * готовой разметкой, клиентского кода здесь нет вовсе.
 */

type View = "tag" | "woche";

export default async function EinsatzplanPage({
  searchParams,
}: {
  searchParams: Promise<{ datum?: string; ansicht?: string }>;
}) {
  await requireRole("INHABER", "DISPONENT");
  const params = await searchParams;
  const t = await getTranslations("plan");

  const view: View = params.ansicht === "tag" ? "tag" : "woche";
  const today = berlinDateIso();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.datum ?? "")
    ? params.datum!
    : today;

  const dayCount = view === "tag" ? 1 : 7;
  const from =
    view === "tag" ? berlinDayStart(anchor) : berlinWeekStart(anchor);

  // Дни строятся по календарю, а не прибавлением суток в миллисекундах:
  // в неделю с переводом часов одни сутки длятся 23 или 25 часов.
  const days = berlinDays(berlinDateIso(from), dayCount);
  const to = berlinDayStart(
    berlinDateIso(new Date(days[days.length - 1]!.getTime() + 36 * 60 * 60_000)),
  );

  const [teams, appointments] = await Promise.all([
    listTeams(),
    appointmentsBetween(from, to),
  ]);

  const prev = berlinDateIso(
    new Date(from.getTime() - (dayCount - 0.5) * 24 * 60 * 60_000),
  );
  const next = berlinDateIso(to);

  /** Выезды бригады в конкретный день. */
  const cellOf = (teamId: string | null, day: Date) => {
    const dayIso = berlinDateIso(day);
    return appointments.filter(
      (a) =>
        a.teamId === teamId &&
        a.status !== "ABGESAGT" &&
        berlinDateIso(a.startAt) === dayIso,
    );
  };

  /** Выезды без назначенной бригады — их надо распределить. */
  const unassigned = appointments.filter(
    (a) => a.teamId === null && a.status !== "ABGESAGT",
  );

  const link = (datum: string, ansicht: View) =>
    `/einsatzplan?datum=${datum}&ansicht=${ansicht}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <a href={link(prev, view)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          ←
        </a>
        <a href={link(today, view)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          {t("today")}
        </a>
        <a href={link(next, view)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          →
        </a>

        <span className="ml-2 text-sm font-semibold">
          {view === "tag"
            ? formatDate(from)
            : `${formatDate(days[0]!)} – ${formatDate(days[6]!)}`}
        </span>

        <div className="ml-auto flex gap-1">
          {(["tag", "woche"] as View[]).map((v) => (
            <a
              key={v}
              href={link(anchor, v)}
              aria-current={v === view ? "page" : undefined}
              className={
                v === view
                  ? "bg-stahl rounded-[3px] px-2.5 py-1 text-[13px] font-semibold text-white"
                  : buttonVariants({ variant: "ghost", size: "sm" })
              }
            >
              {t(`views.${v}`)}
            </a>
          ))}
        </div>
      </div>

      {teams.length === 0 ? (
        <Alert tone="info">
          {t("noTeams")}{" "}
          <a href="/einstellungen/teams" className="text-blau underline">
            {t("createTeam")}
          </a>
        </Alert>
      ) : (
        <div className="border-linie bg-blatt overflow-x-auto rounded-[3px] border">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-beton border-linie border-b">
                <th className="border-linie w-[132px] border-r px-3 py-2 text-left font-semibold">
                  {t("team")}
                </th>
                {days.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="border-linie border-r px-2 py-2 text-left font-semibold last:border-r-0"
                  >
                    <span className="block">
                      {new Intl.DateTimeFormat("de-DE", {
                        weekday: "short",
                        timeZone: "Europe/Berlin",
                      }).format(day)}
                    </span>
                    <span className="text-text-2 font-normal">
                      {formatDate(day)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-linie-2 border-b align-top">
                  <th
                    scope="row"
                    className="border-linie border-r px-3 py-2 text-left font-semibold"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="inline-block h-2.5 w-2.5 rounded-[2px]"
                        style={{ backgroundColor: team.color }}
                      />
                      {team.name}
                    </span>
                    <span className="text-text-2 block text-[11px] font-normal">
                      {team.members.map((m) => m.name).join(", ")}
                    </span>
                  </th>

                  {days.map((day) => {
                    const cell = cellOf(team.id, day);
                    return (
                      <td
                        key={day.toISOString()}
                        className="border-linie min-w-[168px] border-r p-1 align-top last:border-r-0"
                      >
                        {cell.map((a) => (
                          <a
                            key={a.id}
                            href={`/anfragen/${a.dealId}`}
                            className="mb-1 block rounded-[3px] px-1.5 py-1 text-white"
                            // Цветовая кодировка по виду работ (глава 5.3).
                            style={{ backgroundColor: a.serviceColor }}
                          >
                            <span className="block font-semibold">
                              {formatTime(a.startAt)}–{formatTime(a.endAt)}
                            </span>
                            <span className="block text-[12px]">{a.customerName}</span>
                            <span className="block text-[11px] opacity-85">
                              {a.street}, {a.city}
                            </span>
                            {a.status !== "GEPLANT" && (
                              <span className="mt-0.5 inline-block rounded-[2px] bg-white/20 px-1 text-[10px]">
                                {t(`statuses.${a.status}`)}
                              </span>
                            )}
                          </a>
                        ))}
                        {cell.length === 0 && (
                          <span className="text-text-2 block px-1 py-1 text-[11px]">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {unassigned.length > 0 && (
        <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">{t("unassigned")}</h3>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((a) => (
              <a
                key={a.id}
                href={`/anfragen/${a.dealId}`}
                className="border-gelb bg-gelb/10 w-[220px] rounded-[3px] border p-2"
              >
                <span className="block text-[12px] font-semibold">
                  {formatDate(a.startAt)} {formatTime(a.startAt)}
                </span>
                <span className="block text-[12px]">{a.customerName}</span>
                <span className="text-text-2 block text-[11px]">
                  {a.street}, {a.city}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <p className="text-text-2 mt-4 text-xs">{t("planHint")}</p>
    </div>
  );
}
