import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";

/**
 * Временная страница Этапа 0: показывает, что приложение действительно
 * говорит с базой и какие миграции применены. Будет заменена панелью «Heute»
 * в куске 3. Никаких выдуманных данных — только то, что реально в базе.
 */
export default async function HomePage() {
  const t = await getTranslations();

  let migrations: { name: string; applied: Date | null }[] = [];
  let error: string | null = null;

  try {
    migrations = await db.$queryRaw<{ name: string; applied: Date | null }[]>`
      SELECT migration_name AS name, finished_at AS applied
      FROM _prisma_migrations
      ORDER BY started_at
    `;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold tracking-tight">{t("app.name")}</h1>
      <p className="text-text-2 mb-6 text-sm">{t("app.tagline")}</p>

      <div className="border-linie bg-blatt rounded-[3px] border p-4">
        <h2 className="mb-3 font-semibold">{t("setup.title")}</h2>

        {error ? (
          <p className="text-rot text-sm">
            {t("setup.dbFailed")}: {error}
          </p>
        ) : (
          <>
            <p className="text-gruen mb-3 text-sm">{t("setup.dbReady")}</p>
            <p className="text-text-2 mb-1 text-xs uppercase">
              {t("setup.migrations")}
            </p>
            <ul className="text-sm">
              {migrations.map((m) => (
                <li key={m.name} className="font-cond">
                  {m.name}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
