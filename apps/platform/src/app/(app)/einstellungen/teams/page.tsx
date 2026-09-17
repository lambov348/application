import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { listTeams, assignableUsers } from "@/server/queries/teams";
import { TeamForm } from "./TeamForms";

/**
 * Бригады — строки календаря. Заводит только владелец: это часть структуры
 * фирмы, а не оперативная работа диспетчера.
 */
export default async function TeamsPage() {
  await requireRole("INHABER");
  const t = await getTranslations("teams");

  const [teams, users] = await Promise.all([
    listTeams(true),
    assignableUsers(),
  ]);

  return (
    <div className="max-w-3xl">
      <p className="text-text-2 mb-4 text-sm">{t("intro")}</p>

      <div className="border-linie bg-blatt mb-6 overflow-hidden rounded-[3px] border">
        {teams.length === 0 && (
          <p className="text-text-2 px-4 py-3 text-sm">{t("empty")}</p>
        )}

        {teams.map((team) => (
          <details key={team.id}>
            <summary className="hover:bg-beton/60 flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm">
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-[2px]"
                style={{ backgroundColor: team.color }}
              />
              <b className={team.active ? "" : "text-text-2 line-through"}>
                {team.name}
              </b>
              <span className="text-text-2 text-xs">
                {team.members.length === 0
                  ? t("noMembers")
                  : team.members.map((m) => m.name).join(", ")}
              </span>
            </summary>
            <TeamForm
              team={{
                id: team.id,
                name: team.name,
                color: team.color,
                sort: team.sort,
                active: team.active,
                memberIds: team.members.map((m) => m.id),
              }}
              users={users}
            />
          </details>
        ))}
      </div>

      <TeamForm users={users} />
    </div>
  );
}
