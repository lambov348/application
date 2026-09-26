import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { getSettings, legalBlocksMissing } from "@/server/queries/settings";
import { PROPOSED_LEGAL_TEXTS } from "@/lib/legal-texts";
import { SettingsForm } from "./SettingsForm";

/**
 * Настройки фирмы.
 *
 * Правовые блоки Angebot, если они ещё пусты, подставляются в форму как
 * предложение — но в базу не попадают, пока владелец не прочитает их и не
 * нажмёт «Сохранить». Тексты говорят от лица фирмы и обещают клиенту
 * гарантию: записывать такое без прочтения человеком нельзя.
 */
export default async function FirmaPage() {
  await requireRole("INHABER");
  const t = await getTranslations("settings");
  const settings = await getSettings();

  const missing = legalBlocksMissing(settings);
  const legalPrefilled = missing.length > 0;

  return (
    <div className="max-w-3xl">
      <p className="text-text-2 mb-4 text-sm">{t("intro")}</p>

      <SettingsForm
        legalPrefilled={legalPrefilled}
        values={{
          companyName: settings.companyName,
          companyStreet: settings.companyStreet,
          companyZip: settings.companyZip,
          companyCity: settings.companyCity,
          companyEmail: settings.companyEmail,
          companyPhone: settings.companyPhone,
          taxNumber: settings.taxNumber ?? "",
          vatId: settings.vatId ?? "",
          taxMode: settings.taxMode,
          vatPercent: (settings.defaultVatRateBp / 100).toString().replace(".", ","),
          hourlyRate:
            settings.hourlyRateCents === null
              ? ""
              : (settings.hourlyRateCents / 100).toFixed(2).replace(".", ","),
          // Пустой блок заменяется предложением только в форме.
          warrantyText: settings.warrantyText || PROPOSED_LEGAL_TEXTS.warrantyText,
          parkingText: settings.parkingText || PROPOSED_LEGAL_TEXTS.parkingText,
          scopeText: settings.scopeText || PROPOSED_LEGAL_TEXTS.scopeText,
          travelBufferMinutes: settings.travelBufferMinutes,
          minPhotosBefore: settings.minPhotosBefore,
          minPhotosAfter: settings.minPhotosAfter,
        }}
      />
    </div>
  );
}
