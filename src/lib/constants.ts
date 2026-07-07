// Языконезависимые константы: коды статусов, цвета бейджей, слаги услуг.
// Все подписи для интерфейса живут в src/lib/i18n.ts.

export type RequestStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "done"
  | "cancelled";

export type TaskStatus = "assigned" | "in_progress" | "done";

// Цветовые классы Tailwind для бейджей статусов (не зависят от языка).
export const REQUEST_STATUS_STYLES: Record<RequestStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  assigned: "bg-amber-100 text-amber-800",
  in_progress: "bg-purple-100 text-purple-800",
  done: "bg-green-100 text-green-800",
  cancelled: "bg-gray-200 text-gray-700",
};

// Порядок статусов задачи для исполнителя: принял → в работе → выполнено.
export const TASK_STATUS_FLOW: TaskStatus[] = ["assigned", "in_progress", "done"];

export const ALL_REQUEST_STATUSES: RequestStatus[] = [
  "new",
  "assigned",
  "in_progress",
  "done",
  "cancelled",
];

// Слаги услуг — стабильные идентификаторы. Подписи берутся из i18n по слагу.
export type ServiceSlug =
  | "assembly"
  | "moving"
  | "transport"
  | "mounting"
  | "cleaning"
  | "repair";

// Слаг + эмодзи (эмодзи тоже не зависит от языка).
export const SERVICE_CATEGORIES: { slug: ServiceSlug; emoji: string }[] = [
  { slug: "assembly", emoji: "🛠️" },
  { slug: "moving", emoji: "📦" },
  { slug: "transport", emoji: "🚚" },
  { slug: "mounting", emoji: "🖼️" },
  { slug: "cleaning", emoji: "🧹" },
  { slug: "repair", emoji: "🔧" },
];

export const SERVICE_SLUGS: ServiceSlug[] = SERVICE_CATEGORIES.map((c) => c.slug);

export function isServiceSlug(value: string): value is ServiceSlug {
  return (SERVICE_SLUGS as string[]).includes(value);
}
