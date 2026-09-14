/**
 * Даты и время.
 *
 * Хранение всегда в UTC, показ всегда в Europe/Berlin. Германия дважды в год
 * переводит часы, и «09:00 у клиента» в марте и в ноябре — это разное время
 * по UTC. Если хранить местное время, выезды на границе перевода сдвинутся
 * на час, и бригада приедет не тогда.
 */

export const DISPLAY_TIMEZONE = process.env.DISPLAY_TIMEZONE ?? "Europe/Berlin";

type Locale = "de" | "ru";

const LOCALE_TAGS: Record<Locale, string> = { de: "de-DE", ru: "ru-RU" };

export function formatDate(date: Date, locale: Locale = "de"): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    dateStyle: "short",
    timeZone: DISPLAY_TIMEZONE,
  }).format(date);
}

export function formatTime(date: Date, locale: Locale = "de"): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    timeStyle: "short",
    timeZone: DISPLAY_TIMEZONE,
  }).format(date);
}

export function formatDateTime(date: Date, locale: Locale = "de"): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: DISPLAY_TIMEZONE,
  }).format(date);
}

/**
 * Значение для поля <input type="datetime-local">.
 *
 * Поле работает с местным временем без указания пояса, поэтому дату надо
 * перевести в берлинское и отдать без буквы Z. Через toISOString() здесь
 * нельзя: он вернёт UTC, и диспетчер увидит время на час-два раньше.
 */
export function toLocalInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Обратный ход: «2026-10-01T09:00» из формы — это берлинское время, которое
 * надо превратить в момент по UTC.
 *
 * Смещение вычисляется для самой этой даты, а не для сегодняшнего дня:
 * зимой у Берлина +01:00, летом +02:00.
 */
export function fromLocalInputValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, y, mo, d, h, mi] = match.map(Number) as unknown as number[];

  // Первое приближение: считаем введённое время за UTC.
  const guess = new Date(Date.UTC(y!, mo! - 1, d!, h!, mi!));

  // Насколько берлинское представление этого момента отличается от введённого.
  const offset = berlinOffsetMinutes(guess);
  const corrected = new Date(guess.getTime() - offset * 60_000);

  // Рядом с переводом часов смещение могло измениться — уточняем один раз.
  const offsetAfter = berlinOffsetMinutes(corrected);
  if (offsetAfter !== offset) {
    return new Date(guess.getTime() - offsetAfter * 60_000);
  }
  return corrected;
}

/** Смещение Берлина от UTC в минутах для заданного момента. */
function berlinOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return (asUtc - date.getTime()) / 60_000;
}

/** Сколько времени прошло: «15 Min.», «2 Std.», «3 Tage». */
export function elapsedSince(date: Date, locale: Locale = "de"): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE_TAGS[locale], {
    numeric: "auto",
    style: "short",
  });

  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (minutes < 60 * 24) return rtf.format(-Math.floor(minutes / 60), "hour");
  return rtf.format(-Math.floor(minutes / (60 * 24)), "day");
}
