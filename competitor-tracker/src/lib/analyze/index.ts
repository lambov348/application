import type { AnalysisResult, SiteReport } from "../types";
import { fetchSite, normalizeUrl } from "./fetchSite";
import { detectTech } from "./detectTech";
import { seoAudit } from "./seoAudit";
import { extractKeywords } from "./keywords";
import { buildInsights } from "./recommendations";
import { compareSites } from "./compare";
import { getSerpPositions } from "../adapters/serp";
import { getAdCreatives } from "../adapters/adLibrary";
import { getTraffic } from "../adapters/traffic";

// Анализ одного сайта → структурированный отчёт.
export async function analyzeSite(url: string): Promise<SiteReport> {
  const page = await fetchSite(url);
  const base: SiteReport = {
    url,
    finalUrl: page.finalUrl,
    fetchedAt: new Date().toISOString(),
    ok: page.ok,
    statusCode: page.statusCode,
    responseMs: page.responseMs,
    server: page.server,
    tech: [],
    seo: null,
    keywords: [],
  };
  if (!page.ok) {
    return { ...base, error: page.error ?? `HTTP ${page.statusCode ?? "?"}` };
  }
  return {
    ...base,
    tech: detectTech(page.html, page.headers),
    seo: seoAudit(page),
    keywords: extractKeywords(page.html),
  };
}

// Полный анализ: конкурент (+ опционально ваш сайт, тематика) и платные разделы.
export async function analyzeCompetitor(input: {
  competitorUrl: string;
  yourUrl?: string;
  topic?: string;
}): Promise<{ result?: AnalysisResult; error?: string }> {
  const competitorUrl = normalizeUrl(input.competitorUrl);
  if (!competitorUrl) return { error: "Некорректный адрес сайта конкурента." };
  const yourUrl = input.yourUrl ? normalizeUrl(input.yourUrl) : null;

  const [competitor, you] = await Promise.all([
    analyzeSite(competitorUrl),
    yourUrl ? analyzeSite(yourUrl) : Promise.resolve(null),
  ]);

  if (!competitor.ok) {
    return {
      error: `Не удалось загрузить сайт конкурента: ${competitor.error ?? "ошибка"}.`,
    };
  }

  const domain = new URL(competitor.finalUrl).hostname.replace(/^www\./, "");
  const keywords = competitor.keywords.map((k) => k.term);

  const [serpPositions, adCreatives, traffic] = await Promise.all([
    getSerpPositions(domain, keywords),
    getAdCreatives(input.topic?.trim() || domain),
    getTraffic(domain),
  ]);

  const result: AnalysisResult = {
    competitor,
    you,
    topic: input.topic?.trim() || null,
    comparison: compareSites(competitor, you),
    insights: buildInsights(competitor, you),
    paid: { serpPositions, adCreatives, traffic },
  };
  return { result };
}
