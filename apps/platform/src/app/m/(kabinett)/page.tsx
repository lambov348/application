import { getTranslations } from "next-intl/server";
import { requireMonteurArea } from "@/server/auth/guards";
import { Alert } from "@/components/ui/alert";

/**
 * Экран «Heute» монтажника. Наполнение появится вместе с календарём
 * (кусок 9). Выдуманных выездов здесь нет.
 */
export default async function MonteurHeutePage() {
  await requireMonteurArea();
  const t = await getTranslations("monteur");

  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold">{t("today")}</h1>
      <Alert tone="info">{t("empty")}</Alert>
    </div>
  );
}
