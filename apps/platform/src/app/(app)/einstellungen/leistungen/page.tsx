import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { CatalogItemForm } from "./CatalogForms";

/**
 * Leistungskatalog — прайс фирмы.
 *
 * Пустой при первом запуске: цен в коде и в сидах нет намеренно. Это
 * настоящий прайс, а не пример, и заполняет его владелец.
 */
export default async function LeistungenPage() {
  await requireRole("INHABER");
  const t = await getTranslations("catalog");

  const items = await db.serviceCatalogItem.findMany({
    orderBy: [{ sort: "asc" }, { name: "asc" }],
  });

  return (
    <div className="max-w-3xl">
      <p className="text-text-2 mb-4 text-sm">{t("intro")}</p>

      <div className="border-linie bg-blatt mb-6 overflow-hidden rounded-[3px] border">
        {items.length === 0 && (
          <p className="text-text-2 px-4 py-3 text-sm">{t("empty")}</p>
        )}

        {items.map((item) => (
          <details key={item.id}>
            <summary className="hover:bg-beton/60 flex cursor-pointer items-baseline gap-2 px-4 py-2.5 text-sm">
              <b className={item.active ? "" : "text-text-2 line-through"}>
                {item.name}
              </b>
              <span className="text-text-2 text-xs">{t(`units.${item.unit}`)}</span>
              <span className="ml-auto font-semibold">
                {formatCents(item.priceCents)}
              </span>
            </summary>
            <CatalogItemForm
              item={{
                id: item.id,
                name: item.name,
                unit: item.unit,
                price: (item.priceCents / 100).toFixed(2).replace(".", ","),
                service: item.service,
                sort: item.sort,
                active: item.active,
              }}
            />
          </details>
        ))}
      </div>

      <CatalogItemForm />
    </div>
  );
}
