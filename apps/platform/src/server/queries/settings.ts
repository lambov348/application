/**
 * Настройки фирмы. Таблица из одной строки (id = 1).
 *
 * Строка создаётся при первом обращении: так приложение работает сразу после
 * миграции, а сид с выдуманными реквизитами не нужен.
 */
import { db } from "@/lib/db";

export async function getSettings() {
  const existing = await db.settings.findUnique({ where: { id: 1 } });
  if (existing) return existing;

  // Значения по умолчанию заданы в схеме: реквизиты пустые, ставка 19 %.
  return db.settings.create({ data: { id: 1 } });
}

export type Settings = Awaited<ReturnType<typeof getSettings>>;

/**
 * Готовы ли настройки к выпуску Angebot.
 * Правило 9.2 ТЗ: без трёх правовых блоков предложение сохранить нельзя.
 */
export function legalBlocksMissing(settings: {
  warrantyText: string;
  parkingText: string;
  scopeText: string;
}): string[] {
  const missing: string[] = [];
  if (!settings.warrantyText.trim()) missing.push("warrantyText");
  if (!settings.parkingText.trim()) missing.push("parkingText");
  if (!settings.scopeText.trim()) missing.push("scopeText");
  return missing;
}

/** Реквизиты по §14 UStG, без которых документ неполон. */
export function companyDataMissing(settings: {
  companyName: string;
  companyStreet: string;
  companyZip: string;
  companyCity: string;
  taxNumber: string | null;
  vatId: string | null;
  taxMode: string;
}): string[] {
  const missing: string[] = [];
  if (!settings.companyName.trim()) missing.push("companyName");
  if (!settings.companyStreet.trim()) missing.push("companyStreet");
  if (!settings.companyZip.trim()) missing.push("companyZip");
  if (!settings.companyCity.trim()) missing.push("companyCity");
  // §14 UStG требует Steuernummer либо USt-IdNr — достаточно одного.
  if (!settings.taxNumber?.trim() && !settings.vatId?.trim()) {
    missing.push("taxNumber");
  }
  return missing;
}
