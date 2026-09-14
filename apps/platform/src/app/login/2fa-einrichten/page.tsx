import { getTranslations } from "next-intl/server";
import { SetupForm } from "./SetupForm";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default async function TwoFactorSetupPage() {
  const t = await getTranslations("twofactor");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-text-2 text-sm">{t("subtitle")}</p>
        </div>

        <div className="border-linie bg-blatt rounded-[3px] border p-6">
          <SetupForm />
        </div>

        <div className="mt-4 flex justify-center">
          <LocaleSwitcher />
        </div>
      </div>
    </main>
  );
}
