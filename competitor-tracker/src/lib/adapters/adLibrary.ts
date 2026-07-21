import type { AdCreative, PaidSection } from "../types";

// Рекламные креативы конкурента в Meta (Facebook/Instagram).
// Реальные данные — через Meta Ad Library API (токен META_AD_LIBRARY_TOKEN).
// Публичная песочница библиотеки объявлений: facebook.com/ads/library.
export async function getAdCreatives(
  brandOrDomain: string,
): Promise<PaidSection<AdCreative[]>> {
  const token = process.env.META_AD_LIBRARY_TOKEN;
  const hint =
    "Задайте META_AD_LIBRARY_TOKEN в .env (facebook.com/ads/library/api), чтобы подтянуть реальные объявления бренда. Без токена посмотреть креативы можно вручную в Meta Ad Library и Google Ads Transparency Center.";

  if (!token) return { configured: false, hint, data: null };

  try {
    const u = new URL("https://graph.facebook.com/v19.0/ads_archive");
    u.searchParams.set("search_terms", brandOrDomain);
    u.searchParams.set("ad_reached_countries", "['US','DE','RU']");
    u.searchParams.set("ad_active_status", "ALL");
    u.searchParams.set(
      "fields",
      "ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,ad_delivery_start_time,publisher_platforms",
    );
    u.searchParams.set("limit", "25");
    u.searchParams.set("access_token", token);

    const res = await fetch(u, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      return {
        configured: true,
        hint: `Meta Ad Library вернула ${res.status}. Проверьте токен и права.`,
        data: null,
      };
    }
    const json = (await res.json()) as {
      data?: Array<{
        ad_creative_link_titles?: string[];
        ad_creative_bodies?: string[];
        ad_snapshot_url?: string;
        ad_delivery_start_time?: string;
        publisher_platforms?: string[];
      }>;
    };
    const data: AdCreative[] = (json.data ?? []).map((a) => ({
      platform: (a.publisher_platforms ?? []).join(", ") || "meta",
      headline: a.ad_creative_link_titles?.[0] ?? null,
      body: a.ad_creative_bodies?.[0] ?? null,
      previewUrl: a.ad_snapshot_url ?? null,
      firstSeen: a.ad_delivery_start_time ?? null,
    }));
    return { configured: true, hint: "", data };
  } catch (e) {
    return {
      configured: true,
      hint: `Ошибка запроса к Meta Ad Library: ${e instanceof Error ? e.message : "unknown"}`,
      data: null,
    };
  }
}
