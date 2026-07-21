import * as cheerio from "cheerio";
import { SIGNATURES } from "./signatures";
import type { DetectedTech } from "../types";

// Собираем «полотно» для поиска сигнатур: HTML + адреса всех скриптов/ссылок
// + заголовки ответа. Всё в нижнем регистре для регистронезависимого поиска.
function buildHaystack(html: string, headers: Record<string, string>): string {
  const $ = cheerio.load(html);
  const srcs: string[] = [];
  $("script[src]").each((_, el) => {
    srcs.push($(el).attr("src") ?? "");
  });
  $("link[href]").each((_, el) => {
    srcs.push($(el).attr("href") ?? "");
  });
  $("img[src]").each((_, el) => {
    srcs.push($(el).attr("src") ?? "");
  });
  const headerBlob = Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `${html}\n${srcs.join("\n")}\n${headerBlob}`.toLowerCase();
}

export function detectTech(
  html: string,
  headers: Record<string, string>,
): DetectedTech[] {
  const hay = buildHaystack(html, headers);
  const found: DetectedTech[] = [];
  const seen = new Set<string>();

  for (const sig of SIGNATURES) {
    if (seen.has(sig.id)) continue;
    if (sig.patterns.some((re) => re.test(hay))) {
      found.push({
        id: sig.id,
        name: sig.name,
        category: sig.category,
        evidence: sig.evidence,
      });
      seen.add(sig.id);
    }
  }
  return found;
}
