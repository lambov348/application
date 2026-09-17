/**
 * Запросы по бригадам.
 *
 * Бригада — строка календаря (глава 5.3 ТЗ). В ТЗ это «Team 1», «Team 2»,
 * «Ivan»: владелец, работающий один, тоже бригада.
 */
import { db } from "@/lib/db";

export type TeamListItem = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  sort: number;
  members: { id: string; name: string; role: string }[];
};

export async function listTeams(
  includeInactive = false,
): Promise<TeamListItem[]> {
  const teams = await db.team.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      color: true,
      active: true,
      sort: true,
      members: {
        select: { user: { select: { id: true, name: true, role: true } } },
      },
    },
  });

  return teams.map((t) => ({
    ...t,
    members: t.members.map((m) => m.user),
  }));
}

/** Кого можно поставить в бригаду: монтажники, а также владелец и диспетчер. */
export async function assignableUsers() {
  return db.user.findMany({
    where: { active: true, role: { in: ["MONTEUR", "INHABER", "DISPONENT"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true },
  });
}
