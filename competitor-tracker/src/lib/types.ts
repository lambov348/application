// Общие типы отчёта об анализе конкурента.

export type TechCategory =
  | "analytics" // системы аналитики (кто считает посетителей)
  | "advertising" // рекламные системы и пиксели ретаргетинга
  | "tag-manager" // менеджеры тегов
  | "cms" // система управления сайтом
  | "framework" // фронтенд-фреймворк / библиотека
  | "ecommerce" // движок магазина
  | "cdn-hosting" // CDN и хостинг
  | "chat-crm" // чаты, виджеты, CRM
  | "fonts"; // шрифтовые сервисы

export interface DetectedTech {
  id: string;
  name: string;
  category: TechCategory;
  // Что именно совпало — для прозрачности («почему так решили»).
  evidence: string;
}

export interface SeoAudit {
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  canonical: string | null;
  robotsMeta: string | null;
  lang: string | null;
  viewport: boolean;
  h1: string[];
  h2Count: number;
  wordCount: number;
  imagesTotal: number;
  imagesWithoutAlt: number;
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  structuredDataTypes: string[]; // типы из JSON-LD (@type)
  hreflang: string[];
  favicon: boolean;
  https: boolean;
  robotsTxt: boolean;
  sitemapXml: boolean;
  scriptCount: number;
  htmlBytes: number;
}

export interface KeywordHit {
  term: string;
  count: number;
}

export interface Insight {
  severity: "good" | "warn" | "bad";
  area: string; // раздел: SEO / Реклама / Скорость / ...
  message: string; // что обнаружено
  action: string; // что делать вам, чтобы было так же / лучше
}

// Разделы с платными данными — всегда присутствуют, но могут быть «не настроены».
export interface PaidSection<T> {
  configured: boolean;
  hint: string; // как включить, если не настроено
  data: T | null;
}

export interface SiteReport {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  ok: boolean;
  error?: string;
  statusCode?: number;
  responseMs?: number;
  server: string | null;
  tech: DetectedTech[];
  seo: SeoAudit | null;
  keywords: KeywordHit[];
}

export interface CompareRow {
  metric: string;
  you: string;
  competitor: string;
  verdict: "you-win" | "competitor-wins" | "tie";
}

export interface AnalysisResult {
  competitor: SiteReport;
  you: SiteReport | null;
  topic: string | null;
  comparison: CompareRow[];
  insights: Insight[];
  paid: {
    serpPositions: PaidSection<SerpPosition[]>;
    adCreatives: PaidSection<AdCreative[]>;
    traffic: PaidSection<TrafficEstimate>;
  };
}

export interface SerpPosition {
  keyword: string;
  position: number | null;
  url: string | null;
}

export interface AdCreative {
  platform: string;
  headline: string | null;
  body: string | null;
  previewUrl: string | null;
  firstSeen: string | null;
}

export interface TrafficEstimate {
  monthlyVisitsEstimate: number | null;
  topCountries: { country: string; share: number }[];
  topSources: { source: string; share: number }[];
}
