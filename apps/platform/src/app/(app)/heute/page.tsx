import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { Alert } from "@/components/ui/alert";

/**
 * Панель «Heute». Наполнение появится вместе с заявками и календарём
 * (куски 6 и 7). Сейчас страница честно говорит, что данных ещё нет —
 * выдуманных цифр здесь не будет.
 */
export default async function HeutePage() {
  const user = await requireRole("INHABER", "DISPONENT");
  const t = await getTranslations("heute");

  return (
    <div>
      <p className="mb-4 text-sm">{t("greeting", { name: user.name })}</p>
      <Alert tone="info">{t("empty")}</Alert>
    </div>
  );
}
