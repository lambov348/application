import type { PaidSection, SerpPosition } from "../types";

// Позиции сайта в поиске по ключевым словам.
// Реальные данные — через SerpApi (ключ в SERPAPI_KEY). Без ключа
// возвращаем структурированную заглушку с инструкцией по подключению.
export async function getSerpPositions(
  domain: string,
  keywords: string[],
): Promise<PaidSection<SerpPosition[]>> {
  const key = process.env.SERPAPI_KEY;
  const hint =
    "Задайте SERPAPI_KEY в .env (регистрация на serpapi.com, есть бесплатный лимит), чтобы видеть реальные позиции конкурента по ключевым запросам.";

  if (!key) return { configured: false, hint, data: null };

  try {
    const targets = keywords.slice(0, 5);
    const results: SerpPosition[] = [];
    for (const kw of targets) {
      const u = new URL("https://serpapi.com/search.json");
      u.searchParams.set("engine", "google");
      u.searchParams.set("q", kw);
      u.searchParams.set("num", "50");
      u.searchParams.set("api_key", key);
      const res = await fetch(u, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        results.push({ keyword: kw, position: null, url: null });
        continue;
      }
      const json: unknown = await res.json();
      const organic =
        (json as { organic_results?: { link?: string }[] }).organic_results ?? [];
      const idx = organic.findIndex((r) =>
        (r.link ?? "").toLowerCase().includes(domain.toLowerCase()),
      );
      results.push({
        keyword: kw,
        position: idx >= 0 ? idx + 1 : null,
        url: idx >= 0 ? organic[idx].link ?? null : null,
      });
    }
    return { configured: true, hint: "", data: results };
  } catch (e) {
    return {
      configured: true,
      hint: `Ошибка запроса к SerpApi: ${e instanceof Error ? e.message : "unknown"}`,
      data: null,
    };
  }
}
