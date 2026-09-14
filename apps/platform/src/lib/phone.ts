/**
 * Телефонные номера: нормализация для поиска и приведение к виду для показа.
 *
 * Один и тот же берлинский номер приходит в систему десятком написаний:
 * +49 176 79892037, 0049 176 79892037, 0176/79892037, 017679892037.
 * Поиск обязан находить клиента при любом из них, поэтому рядом с введённым
 * значением хранится нормализованная форма — только цифры в международном
 * виде без плюса.
 */

/** Код страны по умолчанию: фирма работает в Берлине и Бранденбурге. */
const DEFAULT_COUNTRY_CODE = "49";

/**
 * Приводит номер к цифрам в международном формате.
 * Возвращает null, если цифр слишком мало, чтобы считать это номером.
 *
 * Примеры:
 *   "+49 176 79892037"  → "4917679892037"
 *   "0176 / 79892037"   → "4917679892037"
 *   "0049 17679892037"  → "4917679892037"
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6) return null;

  // 00 в начале — международный префикс, принятый в Германии.
  if (digits.startsWith("00")) return digits.slice(2);

  // Одиночный 0 в начале — национальный префикс, заменяется кодом страны.
  if (digits.startsWith("0")) return DEFAULT_COUNTRY_CODE + digits.slice(1);

  // Плюс в исходной строке означает, что код страны уже указан.
  if (trimmed.startsWith("+")) return digits;

  // Номер уже начинается с кода страны.
  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) return digits;

  // Всё остальное считаем местным номером без префикса.
  return DEFAULT_COUNTRY_CODE + digits;
}

/**
 * Цифры из поискового запроса. В отличие от normalizePhone не достраивает
 * код страны: человек ищет по обрывку номера, а не по целому.
 */
export function phoneSearchDigits(query: string): string | null {
  const digits = query.replace(/\D/g, "");
  // Меньше трёх цифр — это не поиск по номеру, а случайные символы в имени.
  if (digits.length < 3) return null;

  // Ведущие 0 и 00 отбрасываем, иначе «0176» не найдёт «49176…».
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/**
 * Вид для показа: +49 176 79892037.
 * Если номер не распознан, возвращается то, что ввёл человек — терять
 * введённое нельзя.
 */
export function formatPhone(input: string | null | undefined): string {
  if (!input) return "";
  const normalized = normalizePhone(input);
  if (!normalized) return input;

  if (normalized.startsWith(DEFAULT_COUNTRY_CODE)) {
    const rest = normalized.slice(DEFAULT_COUNTRY_CODE.length);
    // Немецкие мобильные коды — три цифры (176, 151, 160), городские короче.
    const areaLength = rest.startsWith("1") ? 3 : 2;
    const area = rest.slice(0, areaLength);
    const number = rest.slice(areaLength);
    return `+${DEFAULT_COUNTRY_CODE} ${area} ${number}`.trim();
  }

  return `+${normalized}`;
}
