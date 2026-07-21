import * as cheerio from "cheerio";
import type { SeoAudit } from "../types";
import type { FetchedPage } from "./fetchSite";

// Полный on-page SEO-разбор страницы: мета-теги, заголовки, разметка,
// соцкарточки, структурированные данные и технические сигналы.
export function seoAudit(page: FetchedPage): SeoAudit {
  const $ = cheerio.load(page.html);

  const title = $("head > title").first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || null;
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;
  const robotsMeta = $('meta[name="robots"]').attr("content")?.trim() || null;
  const lang = $("html").attr("lang")?.trim() || null;
  const viewport = $('meta[name="viewport"]').length > 0;

  const h1: string[] = [];
  $("h1").each((_, el) => {
    const t = $(el).text().trim();
    if (t) h1.push(t);
  });
  const h2Count = $("h2").length;

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;

  let imagesTotal = 0;
  let imagesWithoutAlt = 0;
  $("img").each((_, el) => {
    imagesTotal++;
    const alt = $(el).attr("alt");
    if (!alt || !alt.trim()) imagesWithoutAlt++;
  });

  const openGraph: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const p = $(el).attr("property");
    const c = $(el).attr("content");
    if (p && c) openGraph[p] = c;
  });

  const twitterCard: Record<string, string> = {};
  $('meta[name^="twitter:"]').each((_, el) => {
    const n = $(el).attr("name");
    const c = $(el).attr("content");
    if (n && c) twitterCard[n] = c;
  });

  const structuredDataTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).contents().text());
      const collect = (node: unknown) => {
        if (!node) return;
        if (Array.isArray(node)) return node.forEach(collect);
        if (typeof node === "object") {
          const t = (node as Record<string, unknown>)["@type"];
          if (typeof t === "string") structuredDataTypes.push(t);
          else if (Array.isArray(t))
            t.forEach((x) => typeof x === "string" && structuredDataTypes.push(x));
        }
      };
      collect(json);
    } catch {
      /* битый JSON-LD — пропускаем */
    }
  });

  const hreflang: string[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const h = $(el).attr("hreflang");
    if (h) hreflang.push(h);
  });

  const favicon =
    $('link[rel~="icon"]').length > 0 ||
    $('link[rel="shortcut icon"]').length > 0;

  return {
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    canonical,
    robotsMeta,
    lang,
    viewport,
    h1,
    h2Count,
    wordCount,
    imagesTotal,
    imagesWithoutAlt,
    openGraph,
    twitterCard,
    structuredDataTypes: [...new Set(structuredDataTypes)],
    hreflang,
    favicon,
    https: page.finalUrl.startsWith("https://"),
    robotsTxt: page.robotsTxt,
    sitemapXml: page.sitemapXml,
    scriptCount: $("script").length,
    htmlBytes: Buffer.byteLength(page.html, "utf8"),
  };
}
