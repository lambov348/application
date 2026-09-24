import { createI18n } from 'vue-i18n';

// Locale tags for Intl formatting: 1.480,00 € (DE), €1,480.00 (EN), 1 480,00 € (RU)
const INTL = { de: 'de-DE', en: 'en-US', ru: 'ru-RU' };

export const i18n = createI18n({
    legacy: false,
    locale: 'de',
    fallbackLocale: 'de',
    messages: {},
    missingWarn: false,
    fallbackWarn: false,
});

/** Load the translations sent by the server for the current page. */
export function syncI18n(page) {
    const { locale, translations } = page.props;
    if (!i18n.global.availableLocales.includes(locale) || i18n.global.locale.value !== locale) {
        i18n.global.setLocaleMessage(locale, translations);
        i18n.global.locale.value = locale;
        document.documentElement.lang = locale;
    }
}

function intl() {
    return INTL[i18n.global.locale.value] ?? 'de-DE';
}

export function formatMoney(cents) {
    if (cents === null || cents === undefined) return '';
    return new Intl.NumberFormat(intl(), { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** "2026-09-23" (calendar date, no timezone shift) → 23.09.2026 */
export function formatDate(ymd, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
    if (!ymd) return '';
    const [y, m, d] = ymd.split('-').map(Number);
    return new Intl.DateTimeFormat(intl(), { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** ISO timestamp (UTC) → date and time in the company timezone. */
export function formatDateTime(iso, timeZone = 'Europe/Berlin') {
    if (!iso) return '';
    return new Intl.DateTimeFormat(intl(), { dateStyle: 'short', timeStyle: 'short', timeZone }).format(new Date(iso));
}

export function formatTimeRange(start, end) {
    if (!start) return '';
    return end ? `${start}–${end}` : start;
}

/** "23.09.2026 · 09:00–15:00", or just the date when no time is set. */
export function formatTermin(ymd, start, end, options) {
    return [formatDate(ymd, options), formatTimeRange(start, end)].filter(Boolean).join(' · ');
}

/** Seconds → "3 h 42 min" in the current language. */
export function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(seconds / 60));
    return i18n.global.t('hours.format', { h: Math.floor(total / 60), m: total % 60 });
}

/** "08:52" in the company timezone. */
export function formatTime(iso, timeZone = 'Europe/Berlin') {
    if (!iso) return '';
    return new Intl.DateTimeFormat(intl(), { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(iso));
}

/** "2026-09" → "September 2026" */
export function formatMonth(ym, options = { month: 'long', year: 'numeric' }) {
    const [y, m] = ym.split('-').map(Number);
    return new Intl.DateTimeFormat(intl(), { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Shift a "YYYY-MM" month by n. */
export function addMonths(ym, n) {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
