import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { listCustomers, PAGE_SIZE } from "@/server/queries/customers";
import { formatPhone } from "@/lib/phone";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Список клиентов с поиском по имени, телефону и адресу (глава 5.10 ТЗ).
 *
 * Поиск — обычная форма с методом GET, а не живой фильтр на клиенте. Так он
 * работает до загрузки скриптов, результат можно отправить коллеге ссылкой,
 * а отбор делает база, а не браузер: при тысяче клиентов это разница между
 * мгновением и заметной паузой.
 */
export default async function KundenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; seite?: string; archiv?: string }>;
}) {
  await requireRole("INHABER", "DISPONENT");
  const params = await searchParams;
  const t = await getTranslations("customers");

  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.seite ?? 1) || 1);
  const includeArchived = params.archiv === "1";

  const { items, total } = await listCustomers({ query, page, includeArchived });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-1 gap-2" role="search">
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className="max-w-sm"
          />
          {includeArchived && <input type="hidden" name="archiv" value="1" />}
          <button type="submit" className={buttonVariants({ size: "sm" })}>
            {t("search")}
          </button>
          {query && (
            <a
              href={includeArchived ? "/kunden?archiv=1" : "/kunden"}
              className={buttonVariants({ variant: "quiet", size: "sm" })}
            >
              {t("reset")}
            </a>
          )}
        </form>

        <a href="/kunden/neu" className={buttonVariants({ size: "sm" })}>
          {t("new")}
        </a>
      </div>

      <div className="text-text-2 mb-3 flex items-center gap-4 text-xs">
        <span>{t("found", { count: total })}</span>
        <a
          href={
            includeArchived
              ? `/kunden${query ? `?q=${encodeURIComponent(query)}` : ""}`
              : `/kunden?archiv=1${query ? `&q=${encodeURIComponent(query)}` : ""}`
          }
          className="underline"
        >
          {includeArchived ? t("hideArchived") : t("showArchived")}
        </a>
      </div>

      {items.length === 0 ? (
        <div className="border-linie bg-blatt rounded-[3px] border p-8 text-center">
          <p className="text-text-2 text-sm">
            {query ? t("nothingFound", { query }) : t("empty")}
          </p>
        </div>
      ) : (
        <div className="border-linie bg-blatt overflow-hidden rounded-[3px] border">
          <table className="w-full text-sm">
            <thead className="border-linie bg-beton border-b text-left">
              <tr>
                <th className="px-4 py-2 font-semibold">{t("name")}</th>
                <th className="px-4 py-2 font-semibold">{t("contact")}</th>
                <th className="px-4 py-2 font-semibold">{t("city")}</th>
                <th className="px-4 py-2 text-right font-semibold">
                  {t("deals")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-linie-2 hover:bg-beton/50 border-b">
                  <td className="px-4 py-2">
                    <a href={`/kunden/${c.id}`} className="font-semibold hover:underline">
                      {c.displayName || t("noName")}
                    </a>
                    {c.anonymized && (
                      <span className="text-text-2 ml-2 text-xs">
                        {t("anonymizedShort")}
                      </span>
                    )}
                    {c.tags.length > 0 && (
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {c.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-linie-2 text-text-2 rounded-[3px] px-1.5 text-[11px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {c.phone && (
                      // tel: — на телефоне диспетчера это звонок в один тап.
                      <a href={`tel:${c.phone}`} className="block hover:underline">
                        {formatPhone(c.phone)}
                      </a>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="text-text-2 block text-xs hover:underline"
                      >
                        {c.email}
                      </a>
                    )}
                  </td>
                  <td className="text-text-2 px-4 py-2">{c.city ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{c.dealCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center gap-2 text-sm" aria-label={t("pages")}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => {
            const search = new URLSearchParams();
            if (query) search.set("q", query);
            if (includeArchived) search.set("archiv", "1");
            if (p > 1) search.set("seite", String(p));
            const href = `/kunden${search.toString() ? `?${search}` : ""}`;

            return p === page ? (
              <span
                key={p}
                aria-current="page"
                className="bg-stahl rounded-[3px] px-2.5 py-1 font-semibold text-white"
              >
                {p}
              </span>
            ) : (
              <a
                key={p}
                href={href}
                className="border-linie hover:bg-linie-2 rounded-[3px] border px-2.5 py-1"
              >
                {p}
              </a>
            );
          })}
        </nav>
      )}
    </div>
  );
}
