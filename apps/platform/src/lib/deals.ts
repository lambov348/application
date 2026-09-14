/**
 * Справочники по заявкам: статусы, причины проигрыша, виды работ, источники.
 *
 * Модуль намеренно без единой зависимости. Его импортируют и серверные
 * правила, и клиентские формы; если сюда попадёт что-то серверное, сборка
 * потянет в браузер драйвер PostgreSQL — так уже было.
 */
import type { DealStatus, LostReason, ServiceType, LeadSource } from "@prisma/client";

/** Колонки доски в порядке из главы 5.2 ТЗ. */
export const BOARD_STATUSES: DealStatus[] = [
  "NEU",
  "DATEN_FEHLEN",
  "ANGEBOT_RAUS",
  "NACHFASSEN",
  "BESTAETIGT",
  "TERMIN_GEPLANT",
  "AUSGEFUEHRT",
  "RECHNUNG",
  "BEZAHLT",
];

/** «Verloren» стоит отдельно от ленты — так же, как в ТЗ. */
export const LOST_STATUS: DealStatus = "VERLOREN";

export const ALL_STATUSES: DealStatus[] = [...BOARD_STATUSES, LOST_STATUS];

export const LOST_REASONS: LostReason[] = [
  "ZU_TEUER",
  "GUENSTIGER_ANBIETER",
  "ANDERS_ENTSCHIEDEN",
  "KEINE_ANTWORT",
  "NICHT_UNSER_PROFIL",
];

export const SERVICES: ServiceType[] = [
  "MOEBELMONTAGE",
  "KUECHENMONTAGE",
  "DEMONTAGE",
  "TRANSPORT",
  "UMZUG",
  "ENTSORGUNG",
  "REPARATUR",
  "GERAETEANSCHLUSS",
  "ARBEITSPLATTE",
];

export const SOURCES: LeadSource[] = [
  "WEBSITE",
  "GOOGLE_ADS",
  "WHATSAPP",
  "INSTAGRAM",
  "KLEINANZEIGEN",
  "TIKTOK",
  "TELEFON",
  "EMAIL",
  "EMPFEHLUNG",
  "SONSTIGE",
];

/** Чек-лист «что нужно уточнить» из главы 5.2. */
export const CHECKLIST_KEYS = [
  "adresse",
  "etage",
  "lift",
  "anschluesse",
  "teile_geliefert",
] as const;

export type ChecklistKey = (typeof CHECKLIST_KEYS)[number];
