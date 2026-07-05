// Централизованные словари статусов и подписей — используются во всех ролях,
// чтобы статус отображался одинаково у клиента, админа и работника.

export type RequestStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "done"
  | "cancelled";

export type TaskStatus = "assigned" | "in_progress" | "done";

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: "Новая",
  assigned: "Назначена",
  in_progress: "В работе",
  done: "Выполнена",
  cancelled: "Отменена",
};

// Цветовые классы Tailwind для бейджей статусов.
export const REQUEST_STATUS_STYLES: Record<RequestStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  assigned: "bg-amber-100 text-amber-800",
  in_progress: "bg-purple-100 text-purple-800",
  done: "bg-green-100 text-green-800",
  cancelled: "bg-gray-200 text-gray-700",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  assigned: "Принять в работу",
  in_progress: "В работе",
  done: "Выполнено",
};

// Порядок статусов задачи для работника: Принял → В работе → Выполнено.
export const TASK_STATUS_FLOW: TaskStatus[] = ["assigned", "in_progress", "done"];

// Категории услуг в духе TaskRabbit: витрина на главной + выбор в форме заявки.
export type ServiceCategory = {
  slug: string;
  title: string;
  emoji: string;
  description: string;
};

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    slug: "assembly",
    title: "Сборка мебели",
    emoji: "🛠️",
    description: "Сборка и разборка шкафов, кроватей, кухонь и мебели IKEA.",
  },
  {
    slug: "moving",
    title: "Помощь с переездом",
    emoji: "📦",
    description: "Погрузка, разгрузка и переезд квартиры или офиса.",
  },
  {
    slug: "transport",
    title: "Перевозка и доставка",
    emoji: "🚚",
    description: "Доставка и перевозка мебели по городу с подъёмом на этаж.",
  },
  {
    slug: "mounting",
    title: "Монтаж на стену",
    emoji: "🖼️",
    description: "Навеска полок, картин, зеркал и телевизоров.",
  },
  {
    slug: "cleaning",
    title: "Уборка и вынос",
    emoji: "🧹",
    description: "Уборка после переезда и вынос старой мебели.",
  },
  {
    slug: "repair",
    title: "Мелкий ремонт",
    emoji: "🔧",
    description: "Небольшой домашний ремонт и мелкие бытовые работы.",
  },
];

// Плоский список названий услуг — используется в форме и валидации.
export const SERVICE_TYPES: string[] = SERVICE_CATEGORIES.map((c) => c.title);

export function categoryBySlug(slug?: string | null): ServiceCategory | undefined {
  if (!slug) return undefined;
  return SERVICE_CATEGORIES.find((c) => c.slug === slug);
}

export const ALL_REQUEST_STATUSES: RequestStatus[] = [
  "new",
  "assigned",
  "in_progress",
  "done",
  "cancelled",
];
