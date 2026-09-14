import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth/guards";
import { landingPageFor } from "@/auth.config";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { MonteurLoginForm } from "./MonteurLoginForm";

/**
 * Вход для бригады — отдельный от офисного.
 *
 * Тёмный экран во весь телефон: с него запускается приложение, добавленное
 * на домашний экран, и он должен выглядеть как приложение, а не как сайт.
 */
export default async function MonteurLoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(landingPageFor(user.role));

  const t = await getTranslations("login");

  return (
    <main className="bg-stahl flex min-h-screen flex-col justify-center px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">MöbelStock24</h1>
          <p className="mt-1 text-sm text-[#7D878B]">{t("teamSubtitle")}</p>
        </div>

        <MonteurLoginForm />

        <div className="mt-8 flex items-center justify-between">
          <LocaleSwitcher variant="dark" />
          <a href="/login" className="text-xs text-[#7D878B] underline">
            {t("officeLink")}
          </a>
        </div>
      </div>
    </main>
  );
}
