import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { customerOptions } from "@/server/queries/deals";
import { displayNameOf } from "@/server/queries/customers";
import { NewDealForm } from "./NewDealForm";
import { Alert } from "@/components/ui/alert";

export default async function NeueAnfragePage() {
  await requireRole("INHABER", "DISPONENT");
  const t = await getTranslations("deals");

  const customers = await customerOptions("");

  return (
    <div className="max-w-2xl">
      <a href="/anfragen" className="text-text-2 mb-3 inline-block text-sm hover:underline">
        ← {t("backToBoard")}
      </a>
      <h2 className="mb-3 text-lg font-semibold">{t("newTitle")}</h2>

      {customers.length === 0 ? (
        <Alert tone="info">
          {t("noCustomersYet")}{" "}
          <a href="/kunden/neu" className="text-blau underline">
            {t("createCustomerFirst")}
          </a>
        </Alert>
      ) : (
        <NewDealForm
          customers={customers.map((c) => ({
            id: c.id,
            label: displayNameOf(c) || c.id,
            addresses: c.addresses.map((a) => ({
              id: a.id,
              label: `${a.street}, ${a.zip} ${a.city}`,
            })),
          }))}
        />
      )}
    </div>
  );
}
