import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth/guards";
import { landingPageFor } from "@/auth.config";
import { LoginForm } from "./LoginForm";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default async function LoginPage() {
  // Уже вошедшего пускать на форму входа незачем.
  const user = await getCurrentUser();
  if (user) redirect(landingPageFor(user.role));

  const t = await getTranslations("login");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">MöbelStock24</h1>
          <p className="text-text-2 text-sm">{t("subtitle")}</p>
        </div>

        <div className="border-linie bg-blatt rounded-[3px] border p-6">
          <LoginForm />
        </div>

        <div className="mt-4 flex justify-center">
          <LocaleSwitcher />
        </div>
      </div>
    </main>
  );
}
