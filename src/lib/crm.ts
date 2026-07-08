// ─────────────────────────────────────────────────────────────
// Константы CRM в стиле amoCRM: воронки, этапы, справочники полей,
// автоматизации. Всё в одном месте, чтобы легко менять без правки UI.
// UI — на русском. Значения (ключи) стабильны и хранятся в БД.
// ─────────────────────────────────────────────────────────────

export type Kind = "open" | "won" | "lost";

// ---- Воронки (направления бизнеса) ----
export type PipelineKey = "moebelstock24" | "reinigung" | "renovierung";

export const PIPELINES: { key: PipelineKey; label: string }[] = [
  { key: "moebelstock24", label: "MöbelStock24" },
  { key: "reinigung", label: "ReinigungBerlin24" },
  { key: "renovierung", label: "Renovierung Berlin 24" },
];

export const DEFAULT_PIPELINE: PipelineKey = "moebelstock24";

export function isPipeline(v: string): v is PipelineKey {
  return PIPELINES.some((p) => p.key === v);
}

export function pipelineLabel(key: string): string {
  return PIPELINES.find((p) => p.key === key)?.label ?? key;
}

// ---- Этапы воронки (одинаковые для всех направлений) ----
export type StageDef = {
  key: string;
  label: string;
  short: string; // короткая подпись для узких колонок
  color: string; // hex — используем как inline-style (надёжнее Tailwind-purge)
  kind: Kind;
  probability: number;
};

export const STAGES: StageDef[] = [
  { key: "new",       label: "Новая заявка",              short: "Новая",         color: "#7C8894", kind: "open", probability: 10 },
  { key: "need_info", label: "Нужны фото/размеры/адрес",  short: "Нужны данные",  color: "#5E86A6", kind: "open", probability: 20 },
  { key: "await_calc",label: "Ожидаем расчёт",            short: "Расчёт",        color: "#2F6E8F", kind: "open", probability: 35 },
  { key: "offer_sent",label: "Angebot отправлен",         short: "Angebot",       color: "#C08A2E", kind: "open", probability: 50 },
  { key: "thinking",  label: "Клиент думает / ждём ответ",short: "Думает",        color: "#B9741A", kind: "open", probability: 60 },
  { key: "scheduled", label: "Термин согласован",         short: "Термин",        color: "#8A6D1E", kind: "open", probability: 80 },
  { key: "in_work",   label: "В работе",                  short: "В работе",      color: "#4C7A3A", kind: "open", probability: 90 },
  { key: "done_paid", label: "Выполнено / оплата",        short: "Выполнено",     color: "#2E9E5B", kind: "won",  probability: 100 },
  { key: "warranty",  label: "Гарантия / повторный контакт", short: "Гарантия",   color: "#1F8F6B", kind: "won",  probability: 100 },
  { key: "lost",      label: "Отказ / проиграно",         short: "Отказ",         color: "#CF4A34", kind: "lost", probability: 0 },
];

export const STAGE_KEYS = STAGES.map((s) => s.key);

export function isStage(v: string): boolean {
  return STAGE_KEYS.includes(v);
}

export function stageDef(key: string): StageDef {
  return STAGES.find((s) => s.key === key) ?? STAGES[0];
}

// ---- Тип услуги ----
export const SERVICE_TYPES: { key: string; label: string; emoji: string }[] = [
  { key: "kitchen",   label: "Кухня",     emoji: "🍳" },
  { key: "wardrobe",  label: "Шкаф",      emoji: "🚪" },
  { key: "bed",       label: "Кровать",   emoji: "🛏️" },
  { key: "dresser",   label: "Комод",     emoji: "🗄️" },
  { key: "moving",    label: "Переезд",   emoji: "📦" },
  { key: "dismantle", label: "Демонтаж",  emoji: "🔧" },
  { key: "transport", label: "Транспорт", emoji: "🚚" },
  { key: "disposal",  label: "Вывоз",     emoji: "🗑️" },
  { key: "other",     label: "Другое",    emoji: "✳️" },
];

// ---- Источник заявки ----
export const SOURCES: { key: string; label: string }[] = [
  { key: "whatsapp",      label: "WhatsApp" },
  { key: "site",          label: "Сайт" },
  { key: "google",        label: "Google Ads" },
  { key: "tiktok",        label: "TikTok" },
  { key: "instagram",     label: "Instagram" },
  { key: "kleinanzeigen", label: "Kleinanzeigen" },
  { key: "myhammer",      label: "MyHammer" },
  { key: "referral",      label: "Рекомендация" },
  { key: "other",         label: "Другое" },
];

// ---- Язык клиента ----
export const LANGUAGES = ["DE", "EN", "RU", "RO"];

// ---- Команда ----
export const TEAMS: { key: string; label: string }[] = [
  { key: "team1", label: "Team 1" },
  { key: "team2", label: "Team 2" },
  { key: "other", label: "Другое" },
];

// ---- Способ оплаты ----
export const PAYMENT_METHODS: { key: string; label: string }[] = [
  { key: "ueberweisung", label: "Überweisung" },
  { key: "bar",          label: "Bar" },
  { key: "karte",        label: "Karte" },
  { key: "rechnung",     label: "Rechnung" },
];

// ---- Netto / Brutto ----
export const AMOUNT_TYPES: { key: string; label: string }[] = [
  { key: "netto",  label: "Netto" },
  { key: "brutto", label: "Brutto" },
];

// ---- Парковка ----
export const PARKING: { key: string; label: string; color: string }[] = [
  { key: "yes",     label: "Да",       color: "#2E9E5B" },
  { key: "no",      label: "Нет",      color: "#CF4A34" },
  { key: "unclear", label: "Уточнить", color: "#D08A17" },
];

// ---- Статус оплаты ----
export const PAYMENT_STATUS: { key: string; label: string; color: string }[] = [
  { key: "unpaid",  label: "Не оплачено", color: "#CF4A34" },
  { key: "partial", label: "Частично",    color: "#D08A17" },
  { key: "paid",    label: "Оплачено",    color: "#2E9E5B" },
];

// Универсальный поиск подписи по справочнику.
export function labelOf(
  list: { key: string; label: string }[],
  key: string | null | undefined
): string {
  if (!key) return "—";
  return list.find((x) => x.key === key)?.label ?? key;
}

export function serviceEmoji(key: string | null | undefined): string {
  if (!key) return "";
  return SERVICE_TYPES.find((s) => s.key === key)?.emoji ?? "";
}

// ---- Правило парковки (единый текст) ----
export const PARKING_RULE =
  "Клиент обеспечивает парковочное место у входа для рабочей машины " +
  "(Opel Combo / Mercedes Citan), чтобы мастера могли быстро и безопасно " +
  "выгрузить инструмент и материалы.";

// ---- Автоматизации: при переходе на этап создаётся задача ----
// offsetDays — через сколько дней срок задачи от «сейчас».
export type StageAutomation = {
  kind: string;
  title: string;
  offsetDays: number;
};

export const STAGE_AUTOMATIONS: Record<string, StageAutomation> = {
  new:        { kind: "call",    title: "Позвонить клиенту, уточнить фото/размеры/адрес", offsetDays: 0 },
  need_info:  { kind: "photo",   title: "Запросить фото, размеры и адрес объекта",        offsetDays: 0 },
  await_calc: { kind: "offer",   title: "Подготовить и отправить Angebot",                offsetDays: 1 },
  offer_sent: { kind: "followup",title: "Написать клиенту (прошёл 1 день после Angebot)", offsetDays: 1 },
  thinking:   { kind: "followup",title: "Follow-up: клиент не отвечает — написать",       offsetDays: 2 },
  scheduled:  { kind: "parking", title: "Напомнить клиенту о парковке (Opel Combo/Citan)",offsetDays: 0 },
  done_paid:  { kind: "payment", title: "Проверить оплату и попросить отзыв",             offsetDays: 0 },
};

// Иконки для типов задач.
export const TASK_KIND_EMOJI: Record<string, string> = {
  call: "📞", offer: "📄", photo: "📷", address: "📍", confirm: "✅",
  parking: "🅿️", payment: "💶", review: "⭐", followup: "🔔", todo: "•",
};

export function taskEmoji(kind: string): string {
  return TASK_KIND_EMOJI[kind] ?? "•";
}
