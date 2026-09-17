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

// ─── Границы суток и недели в берлинском поясе ──────────────────────────────

/**
 * Дата вида 2026-10-05 в берлинском поясе — тот же формат, что у <input
 * type="date">. Берётся из Intl, а не из методов Date: методы Date работают
 * в поясе сервера, а сервер стоит в UTC.
 */
export function berlinDateIso(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DISPLAY_TIMEZONE }).format(
    date,
  );
}

/**
 * Момент по UTC, соответствующий берлинской полуночи указанного дня.
 *
 * Нужен календарю: сетка строится по берлинским суткам, а в базе всё лежит
 * в UTC. Зимой это 23:00 предыдущего дня по UTC, летом 22:00.
 */
export function berlinDayStart(dateIso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  if (!match) throw new Error(`Ожидалась дата вида ГГГГ-ММ-ДД, получено ${dateIso}`);
  const [, y, m, d] = match.map(Number) as unknown as number[];

  const asUtc = new Date(Date.UTC(y!, m! - 1, d!, 0, 0));
  const offset = berlinOffsetMinutes(asUtc);
  const corrected = new Date(asUtc.getTime() - offset * 60_000);

  // Рядом с переводом часов смещение могло измениться — уточняем один раз.
  const offsetAfter = berlinOffsetMinutes(corrected);
  if (offsetAfter !== offset) {
    return new Date(asUtc.getTime() - offsetAfter * 60_000);
  }
  return corrected;
}

/** Понедельник недели, в которую попадает дата. Неделя начинается с понедельника. */
export function berlinWeekStart(dateIso: string): Date {
  const dayStart = berlinDayStart(dateIso);

  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIMEZONE,
    weekday: "short",
  }).format(dayStart);

  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const index = order.indexOf(weekdayShort);
  if (index < 0) throw new Error(`Неизвестный день недели: ${weekdayShort}`);

  // Вычитаем дни через календарную дату, а не через миллисекунды: в неделю
  // с переводом часов сутки длятся 23 или 25 часов.
  const targetIso = berlinDateIso(
    new Date(dayStart.getTime() - index * 24 * 60 * 60_000 + 12 * 60 * 60_000),
  );
  return berlinDayStart(targetIso);
}

/** Следующие n берлинских суток начиная с указанного дня. */
export function berlinDays(startIso: string, count: number): Date[] {
  const days: Date[] = [];
  let iso = startIso;
  for (let i = 0; i < count; i++) {
    const start = berlinDayStart(iso);
    days.push(start);
    // Полдень следующих суток гарантированно попадает в нужный день даже
    // в ночь перевода часов.
    iso = berlinDateIso(new Date(start.getTime() + 36 * 60 * 60_000));
  }
  return days;
}
