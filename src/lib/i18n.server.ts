import "server-only";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALES,
  Locale,
  Messages,
  getDict,
} from "./i18n";

// Серверные помощники i18n: читают выбранный язык из куки.
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get("locale")?.value as Locale | undefined;
  return value && LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

// Удобный помощник: сразу локаль + словарь.
export async function getI18n(): Promise<{ locale: Locale; t: Messages }> {
  const locale = await getLocale();
  return { locale, t: getDict(locale) };
}
