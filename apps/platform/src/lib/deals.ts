/**
 * Справочники по заявкам: статусы, причины проигрыша, виды работ, источники.
 *
 * Модуль намеренно без единой зависимости. Его импортируют и серверные
 * правила, и клиентские формы; если сюда попадёт что-то серверное, сборка
 * потянет в браузер драйвер PostgreSQL — так уже было.
 */
import type {
  AppointmentStatus,
  DealStatus,
  LeadSource,
  LostReason,
  ServiceType,
} from "@prisma/client";

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

/**
 * Порядок статусов выезда: geplant → unterwegs → angekommen → in Arbeit →
 * fertig (объединение глав 5.3 и 5.6 ТЗ). Отмена стоит отдельно.
 */
export const APPOINTMENT_FLOW: AppointmentStatus[] = [
  "GEPLANT",
  "UNTERWEGS",
  "ANGEKOMMEN",
  "IN_ARBEIT",
  "FERTIG",
];

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  ...APPOINTMENT_FLOW,
  "ABGESAGT",
];

/** Цвет карточки в календаре по виду работ (глава 5.3: цветовая кодировка). */
export const SERVICE_COLORS: Record<string, string> = {
  KUECHENMONTAGE: "#1A4F7A",
  MOEBELMONTAGE: "#2D6A4F",
  DEMONTAGE: "#A63A2B",
  TRANSPORT: "#F0B429",
  UMZUG: "#6B4E9B",
  ENTSORGUNG: "#646C6F",
  REPARATUR: "#8A6D3B",
  GERAETEANSCHLUSS: "#2A6B7C",
  ARBEITSPLATTE: "#7A4B2A",
};

export const DEFAULT_SERVICE_COLOR = "#2A3034";
