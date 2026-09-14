import { getTranslations } from "next-intl/server";

/**
 * Страница «нет связи». Её показывает service worker, когда переход по
 * приложению не удался. Никаких данных здесь нет и быть не может: страница
 * лежит в кэше телефона.
 */
export default async function OfflinePage() {
  const t = await getTranslations("offline");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center p-6 text-center">
      <h1 className="mb-2 text-lg font-semibold">{t("title")}</h1>
      <p className="text-text-2 mb-6 text-sm">{t("hint")}</p>
      <a
        href="/m"
        className="bg-blau rounded-[3px] px-4 py-2.5 text-sm font-semibold text-white"
      >
        {t("retry")}
      </a>
    </main>
  );
}
