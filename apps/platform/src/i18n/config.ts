/**
 * Локали интерфейса. Немецкий — рабочий язык фирмы и значение по умолчанию.
 *
 * Локаль хранится в куке, а не в префиксе URL: это внутренний инструмент, и
 * ссылка на заявку, отправленная коллеге, должна открываться одинаково
 * независимо от того, на каком языке работает получатель.
 */
export const LOCALES = ["de", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "de";
export const LOCALE_COOKIE = "ms24_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  de: "Deutsch",
  ru: "Русский",
};

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}
