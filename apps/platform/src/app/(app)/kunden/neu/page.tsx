import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { CustomerForm } from "../CustomerForm";

export default async function NeuerKundePage() {
  await requireRole("INHABER", "DISPONENT");
  const t = await getTranslations("customers");

  return (
    <div className="max-w-2xl">
      <a href="/kunden" className="text-text-2 mb-3 inline-block text-sm hover:underline">
        ← {t("backToList")}
      </a>
      <h2 className="mb-3 text-lg font-semibold">{t("newTitle")}</h2>
      <CustomerForm />
      <p className="text-text-2 mt-3 text-xs">{t("addressAfterCreate")}</p>
    </div>
  );
}
