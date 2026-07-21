import type { CompareRow, SiteReport } from "../types";

// Прямое сравнение «вы против конкурента» по ключевым метрикам.
export function compareSites(
  competitor: SiteReport,
  you: SiteReport | null,
): CompareRow[] {
  if (!you || !you.ok) return [];
  const c = competitor.seo;
  const y = you.seo;
  if (!c || !y) return [];

  const rows: CompareRow[] = [];

  const push = (
    metric: string,
    youVal: string,
    compVal: string,
    verdict: CompareRow["verdict"],
  ) => rows.push({ metric, you: youVal, competitor: compVal, verdict });

  // Скорость ответа (меньше — лучше)
  push(
    "Время ответа, мс",
    String(you.responseMs ?? "—"),
    String(competitor.responseMs ?? "—"),
    verdictLess(you.responseMs, competitor.responseMs),
  );

  // Объём текста (больше — обычно лучше для SEO)
  push(
    "Объём текста, слов",
    String(y.wordCount),
    String(c.wordCount),
    verdictMore(y.wordCount, c.wordCount),
  );

  // Title
  push(
    "Title заполнен",
    yesNo(!!y.title),
    yesNo(!!c.title),
    verdictBool(!!y.title, !!c.title),
  );

  // Schema.org
  push(
    "Разметка Schema.org",
    String(y.structuredDataTypes.length),
    String(c.structuredDataTypes.length),
    verdictMore(y.structuredDataTypes.length, c.structuredDataTypes.length),
  );

  // Рекламные системы
  const yAds = you.tech.filter((t) => t.category === "advertising").length;
  const cAds = competitor.tech.filter((t) => t.category === "advertising").length;
  push("Рекламных пикселей", String(yAds), String(cAds), verdictMore(yAds, cAds));

  // Alt у картинок (доля с alt — больше лучше)
  push(
    "Картинок без alt",
    String(y.imagesWithoutAlt),
    String(c.imagesWithoutAlt),
    verdictLess(y.imagesWithoutAlt, c.imagesWithoutAlt),
  );

  return rows;
}

function yesNo(b: boolean) {
  return b ? "да" : "нет";
}
function verdictBool(you: boolean, comp: boolean): CompareRow["verdict"] {
  if (you === comp) return "tie";
  return you ? "you-win" : "competitor-wins";
}
function verdictMore(you?: number, comp?: number): CompareRow["verdict"] {
  if (you == null || comp == null) return "tie";
  if (you === comp) return "tie";
  return you > comp ? "you-win" : "competitor-wins";
}
function verdictLess(you?: number, comp?: number): CompareRow["verdict"] {
  if (you == null || comp == null) return "tie";
  if (you === comp) return "tie";
  return you < comp ? "you-win" : "competitor-wins";
}
