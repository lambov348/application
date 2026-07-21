// Загрузка страницы конкурента: HTML, заголовки, время ответа,
// плюс проверка robots.txt и sitemap.xml.

export interface FetchedPage {
  ok: boolean;
  error?: string;
  finalUrl: string;
  statusCode?: number;
  responseMs: number;
  html: string;
  headers: Record<string, string>;
  server: string | null;
  robotsTxt: boolean;
  sitemapXml: boolean;
}

const UA =
  "Mozilla/5.0 (compatible; CompetitorTracker/0.1; +https://example.local/bot)";

// Приводим ввод пользователя к корректному URL (добавляем https:// при отсутствии).
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, ms: number, method = "GET") {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function exists(url: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url, 6000, "GET");
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSite(url: string): Promise<FetchedPage> {
  const started = Date.now();
  try {
    const res = await fetchWithTimeout(url, 12000);
    const html = await res.text();
    const responseMs = Date.now() - started;

    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k] = v));

    const origin = new URL(res.url).origin;
    const [robotsTxt, sitemapXml] = await Promise.all([
      exists(`${origin}/robots.txt`),
      exists(`${origin}/sitemap.xml`),
    ]);

    return {
      ok: res.ok,
      finalUrl: res.url,
      statusCode: res.status,
      responseMs,
      html,
      headers,
      server: headers["server"] ?? null,
      robotsTxt,
      sitemapXml,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "network error",
      finalUrl: url,
      responseMs: Date.now() - started,
      html: "",
      headers: {},
      server: null,
      robotsTxt: false,
      sitemapXml: false,
    };
  }
}
