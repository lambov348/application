import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Переключатель DE/RU. Обычные формы без JavaScript: работает и в подвале
 * с плохой связью, где гидратация клиентского кода может не доехать.
 */
export async function LocaleSwitcher({
  className,
  variant = "light",
}: {
  className?: string;
  /** dark — для тёмных экранов кабинета бригады. */
  variant?: "light" | "dark";
}) {
  const current = await getLocale();
  const h = await headers();
  // Заголовок ставит Next для серверных компонентов; при его отсутствии
  // возвращаемся на корень.
  const back = h.get("x-pathname") ?? "/";

  return (
    <div className={cn("flex gap-1", className)}>
      {LOCALES.map((locale) => (
        <form key={locale} action="/locale" method="post">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="back" value={back} />
          <button
            type="submit"
            aria-current={locale === current ? "true" : undefined}
            className={cn(
              "rounded-[3px] px-2 py-1 text-xs",
              variant === "dark"
                ? locale === current
                  ? "bg-stahl-2 font-semibold text-white"
                  : "text-[#7D878B]"
                : locale === current
                  ? "bg-stahl font-semibold text-white"
                  : "text-text-2 hover:bg-linie-2",
            )}
          >
            {LOCALE_LABELS[locale]}
          </button>
        </form>
      ))}
    </div>
  );
}
