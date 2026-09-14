import { getTranslations } from "next-intl/server";
import { requireRole, canSeePrices } from "@/server/auth/guards";
import { getBoard } from "@/server/queries/deals";
import { formatCents } from "@/lib/money";
import { elapsedSince } from "@/lib/datetime";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Канбан заявок, глава 5.2 ТЗ.
 *
 * Страница целиком серверная: колонки и карточки приезжают готовой разметкой.
 * Перевод между колонками — в карточке заявки, выпадающим списком.
 */
export default async function AnfragenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const actor = await requireRole("INHABER", "DISPONENT");
  const { q } = await searchParams;
  const t = await getTranslations("deals");

  const showPrices = canSeePrices(actor);
  const board = await getBoard({ canSeePrice: showPrices, query: q ?? "" });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex gap-2" role="search">
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className="w-64"
          />
          <button type="submit" className={buttonVariants({ size: "sm" })}>
            {t("search")}
          </button>
          {q && (
            <a href="/anfragen" className={buttonVariants({ variant: "quiet", size: "sm" })}>
              {t("reset")}
            </a>
          )}
        </form>
        <a href="/anfragen/neu" className={buttonVariants({ size: "sm" })}>
          {t("new")}
        </a>
      </div>

      {/* Горизонтальная прокрутка: девять колонок в экран не помещаются. */}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {board.columns.map((column) => (
          <section
            key={column.status}
            className="bg-linie-2/40 w-[232px] shrink-0 rounded-[3px] p-2"
            aria-label={t(`statuses.${column.status}`)}
          >
            <h3 className="mb-2 flex items-baseline justify-between px-1 text-[12.5px] font-semibold">
              {t(`statuses.${column.status}`)}
              <span className="text-text-2 font-normal">{column.total}</span>
            </h3>

            {column.cards.map((card) => (
              <a
                key={card.id}
                href={`/anfragen/${card.id}`}
                className="border-linie bg-blatt mb-1.5 block rounded-[3px] border p-2.5 hover:border-blau"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-text-2 text-[11px]">#{card.number}</span>
                  {/* Счётчик времени без ответа: красный после 30 минут
                      (глава 5.1). */}
                  {card.awaitingFirstResponse && (
                    <span
                      className={
                        Date.now() - card.createdAt.getTime() > 30 * 60_000
                          ? "bg-rot rounded-[3px] px-1 text-[10px] font-semibold text-white"
                          : "text-text-2 text-[10px]"
                      }
                    >
                      {elapsedSince(card.createdAt)}
                    </span>
                  )}
                </div>

                <p className="text-[13px] font-semibold">{card.title}</p>
                <p className="text-text-2 text-[12px]">{card.customerName}</p>
                {card.city && (
                  <p className="text-text-2 text-[11px]">{card.city}</p>
                )}

                {showPrices && card.priceNetCents !== null && (
                  <p className="mt-1 text-[12px] font-semibold">
                    {formatCents(card.priceNetCents)}
                    {card.priceApproved && (
                      <span className="text-gruen ml-1 text-[10px]">
                        {t("approvedShort")}
                      </span>
                    )}
                  </p>
                )}
              </a>
            ))}

            {column.cards.length === 0 && (
              <p className="text-text-2 px-1 py-2 text-[12px]">{t("columnEmpty")}</p>
            )}
          </section>
        ))}
      </div>

      {board.lost.total > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold">
            {t("statuses.VERLOREN")} ({board.lost.total})
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {board.lost.cards.map((card) => (
              <a
                key={card.id}
                href={`/anfragen/${card.id}`}
                className="border-linie bg-blatt w-[232px] rounded-[3px] border p-2.5 opacity-70 hover:opacity-100"
              >
                <span className="text-text-2 text-[11px]">#{card.number}</span>
                <p className="text-[13px] font-semibold">{card.title}</p>
                <p className="text-text-2 text-[12px]">{card.customerName}</p>
                {card.lostReason && (
                  <p className="text-rot mt-1 text-[11px]">
                    {t(`lostReasons.${card.lostReason}`)}
                  </p>
                )}
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
