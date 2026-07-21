import type { TechCategory } from "../types";

// База сигнатур: как распознать рекламные, аналитические и технические
// системы по коду страницы, адресам скриптов и заголовкам ответа.
//
// Каждая сигнатура проверяется по объединённому «полотну»:
//   HTML + src всех <script> + значения заголовков ответа (в нижнем регистре).
// evidence — человекочитаемое пояснение, что именно совпало.

export interface Signature {
  id: string;
  name: string;
  category: TechCategory;
  patterns: RegExp[];
  evidence: string;
}

export const SIGNATURES: Signature[] = [
  // ── Аналитика ───────────────────────────────────────────────
  {
    id: "ga4",
    name: "Google Analytics 4",
    category: "analytics",
    patterns: [/gtag\/js\?id=g-/i, /googletagmanager\.com\/gtag\/js/i, /\bg-[a-z0-9]{6,}\b/i],
    evidence: "тег gtag.js / идентификатор G-XXXX",
  },
  {
    id: "ua",
    name: "Google Universal Analytics (устар.)",
    category: "analytics",
    patterns: [/google-analytics\.com\/analytics\.js/i, /\bua-\d{4,}-\d+\b/i],
    evidence: "analytics.js / идентификатор UA-XXXX",
  },
  {
    id: "yandex-metrica",
    name: "Яндекс.Метрика",
    category: "analytics",
    patterns: [/mc\.yandex\.ru\/metrika/i, /ym\(\s*\d+/i, /yaCounter\d+/i],
    evidence: "счётчик mc.yandex.ru / ym()",
  },
  {
    id: "hotjar",
    name: "Hotjar",
    category: "analytics",
    patterns: [/static\.hotjar\.com/i, /\bhj\(/i],
    evidence: "hotjar.com / hj()",
  },
  {
    id: "clarity",
    name: "Microsoft Clarity",
    category: "analytics",
    patterns: [/clarity\.ms\/tag/i, /\bclarity\(/i],
    evidence: "clarity.ms",
  },
  {
    id: "plausible",
    name: "Plausible Analytics",
    category: "analytics",
    patterns: [/plausible\.io\/js/i],
    evidence: "plausible.io/js",
  },
  {
    id: "matomo",
    name: "Matomo / Piwik",
    category: "analytics",
    patterns: [/matomo\.js/i, /piwik\.js/i, /_paq\.push/i],
    evidence: "matomo.js / _paq",
  },

  // ── Реклама и пиксели ретаргетинга ──────────────────────────
  {
    id: "google-ads",
    name: "Google Ads (конверсии/ретаргетинг)",
    category: "advertising",
    patterns: [/googleadservices\.com/i, /googleads\.g\.doubleclick\.net/i, /\baw-\d{6,}\b/i, /gtag\('config',\s*'aw-/i],
    evidence: "googleadservices / тег AW-XXXX",
  },
  {
    id: "doubleclick",
    name: "Google DoubleClick / Display",
    category: "advertising",
    patterns: [/doubleclick\.net/i, /\bdc-\d{4,}\b/i],
    evidence: "doubleclick.net",
  },
  {
    id: "adsense",
    name: "Google AdSense",
    category: "advertising",
    patterns: [/pagead2\.googlesyndication\.com/i, /adsbygoogle/i],
    evidence: "googlesyndication / adsbygoogle",
  },
  {
    id: "meta-pixel",
    name: "Meta Pixel (Facebook/Instagram)",
    category: "advertising",
    patterns: [/connect\.facebook\.net\/[^"']*\/fbevents\.js/i, /\bfbq\(/i, /facebook\.com\/tr\?/i],
    evidence: "fbevents.js / fbq()",
  },
  {
    id: "tiktok-pixel",
    name: "TikTok Pixel",
    category: "advertising",
    patterns: [/analytics\.tiktok\.com/i, /\bttq\./i],
    evidence: "analytics.tiktok.com / ttq",
  },
  {
    id: "vk-pixel",
    name: "VK Pixel / Реклама ВКонтакте",
    category: "advertising",
    patterns: [/vk\.com\/rtrg/i, /top-fwz1\.mail\.ru/i, /VK\.Retargeting/i],
    evidence: "vk.com/rtrg / top-fwz1.mail.ru",
  },
  {
    id: "yandex-ads",
    name: "Яндекс.Директ (ретаргетинг)",
    category: "advertising",
    patterns: [/an\.yandex\.ru/i, /yandex_partner_id/i],
    evidence: "an.yandex.ru",
  },
  {
    id: "bing-ads",
    name: "Microsoft/Bing Ads (UET)",
    category: "advertising",
    patterns: [/bat\.bing\.com/i, /\buetq\b/i],
    evidence: "bat.bing.com / uetq",
  },
  {
    id: "linkedin-insight",
    name: "LinkedIn Insight Tag",
    category: "advertising",
    patterns: [/snap\.licdn\.com/i, /_linkedin_data_partner_id/i],
    evidence: "snap.licdn.com",
  },
  {
    id: "twitter-pixel",
    name: "X (Twitter) Pixel",
    category: "advertising",
    patterns: [/static\.ads-twitter\.com/i, /\btwq\(/i],
    evidence: "ads-twitter.com / twq()",
  },
  {
    id: "pinterest-tag",
    name: "Pinterest Tag",
    category: "advertising",
    patterns: [/ct\.pinterest\.com/i, /\bpintrk\(/i],
    evidence: "ct.pinterest.com / pintrk()",
  },
  {
    id: "snap-pixel",
    name: "Snapchat Pixel",
    category: "advertising",
    patterns: [/sc-static\.net\/scevent/i, /\bsnaptr\(/i],
    evidence: "scevent / snaptr()",
  },
  {
    id: "criteo",
    name: "Criteo",
    category: "advertising",
    patterns: [/static\.criteo\.net/i, /criteo_q/i],
    evidence: "criteo.net",
  },

  // ── Менеджеры тегов ─────────────────────────────────────────
  {
    id: "gtm",
    name: "Google Tag Manager",
    category: "tag-manager",
    patterns: [/googletagmanager\.com\/gtm\.js/i, /\bgtm-[a-z0-9]+\b/i],
    evidence: "gtm.js / контейнер GTM-XXXX",
  },

  // ── CMS ─────────────────────────────────────────────────────
  {
    id: "wordpress",
    name: "WordPress",
    category: "cms",
    patterns: [/wp-content\//i, /wp-includes\//i, /\/wp-json\//i],
    evidence: "wp-content / wp-json",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    category: "ecommerce",
    patterns: [/woocommerce/i],
    evidence: "woocommerce",
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "ecommerce",
    patterns: [/cdn\.shopify\.com/i, /shopify\.theme/i, /x-shopify/i],
    evidence: "cdn.shopify.com / x-shopify",
  },
  {
    id: "tilda",
    name: "Tilda",
    category: "cms",
    patterns: [/tilda\.ws/i, /tildacdn\.com/i, /t-records/i],
    evidence: "tildacdn.com",
  },
  {
    id: "bitrix",
    name: "1С-Битрикс",
    category: "cms",
    patterns: [/bitrix\//i, /\/bitrix\/js/i, /BX\.ready/i],
    evidence: "/bitrix/",
  },
  {
    id: "wix",
    name: "Wix",
    category: "cms",
    patterns: [/static\.wixstatic\.com/i, /wix\.com/i],
    evidence: "wixstatic.com",
  },
  {
    id: "webflow",
    name: "Webflow",
    category: "cms",
    patterns: [/assets\.website-files\.com/i, /webflow\.js/i, /data-wf-page/i],
    evidence: "website-files.com / webflow.js",
  },
  {
    id: "joomla",
    name: "Joomla",
    category: "cms",
    patterns: [/\/media\/jui\//i, /joomla/i],
    evidence: "joomla",
  },
  {
    id: "drupal",
    name: "Drupal",
    category: "cms",
    patterns: [/sites\/all\/(modules|themes)/i, /drupal\.js/i, /x-drupal/i],
    evidence: "drupal.js / x-drupal",
  },
  {
    id: "magento",
    name: "Magento",
    category: "ecommerce",
    patterns: [/mage\/cookies/i, /\/static\/version\d+/i, /magento/i],
    evidence: "magento",
  },

  // ── Фреймворки / библиотеки ─────────────────────────────────
  {
    id: "nextjs",
    name: "Next.js",
    category: "framework",
    patterns: [/\/_next\/static\//i, /__next_f/i],
    evidence: "/_next/static/",
  },
  {
    id: "react",
    name: "React",
    category: "framework",
    patterns: [/data-reactroot/i, /react(?:-dom)?(?:\.production)?\.min\.js/i],
    evidence: "react runtime",
  },
  {
    id: "vue",
    name: "Vue.js",
    category: "framework",
    patterns: [/vue(?:\.runtime)?(?:\.global)?(?:\.prod)?\.js/i, /data-v-[0-9a-f]{8}/i],
    evidence: "vue runtime",
  },
  {
    id: "jquery",
    name: "jQuery",
    category: "framework",
    patterns: [/jquery(?:-\d[\d.]*)?(?:\.min)?\.js/i],
    evidence: "jquery.js",
  },
  {
    id: "bootstrap",
    name: "Bootstrap",
    category: "framework",
    patterns: [/bootstrap(?:\.bundle)?(?:\.min)?\.(?:js|css)/i],
    evidence: "bootstrap",
  },

  // ── CDN / хостинг ───────────────────────────────────────────
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "cdn-hosting",
    patterns: [/cloudflare/i, /cf-ray/i, /__cf_bm/i],
    evidence: "заголовок cf-ray / cloudflare",
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "cdn-hosting",
    patterns: [/x-vercel/i, /vercel\.app/i],
    evidence: "заголовок x-vercel",
  },
  {
    id: "fastly",
    name: "Fastly",
    category: "cdn-hosting",
    patterns: [/x-served-by:.*cache/i, /fastly/i],
    evidence: "fastly",
  },
  {
    id: "amazon",
    name: "Amazon CloudFront / AWS",
    category: "cdn-hosting",
    patterns: [/cloudfront\.net/i, /x-amz-/i],
    evidence: "cloudfront.net / x-amz",
  },

  // ── Чаты / CRM / виджеты ────────────────────────────────────
  {
    id: "intercom",
    name: "Intercom",
    category: "chat-crm",
    patterns: [/widget\.intercom\.io/i, /intercomSettings/i],
    evidence: "intercom.io",
  },
  {
    id: "jivo",
    name: "JivoChat",
    category: "chat-crm",
    patterns: [/code\.jivosite\.com/i, /jivo_api/i],
    evidence: "jivosite.com",
  },
  {
    id: "tawk",
    name: "Tawk.to",
    category: "chat-crm",
    patterns: [/embed\.tawk\.to/i, /Tawk_API/i],
    evidence: "tawk.to",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "chat-crm",
    patterns: [/js\.hs-scripts\.com/i, /hubspot/i],
    evidence: "hs-scripts.com",
  },
  {
    id: "bitrix24",
    name: "Битрикс24 (виджет)",
    category: "chat-crm",
    patterns: [/cdn(?:-ru)?\.bitrix24/i, /b24Tracker/i],
    evidence: "bitrix24",
  },

  // ── Шрифты ──────────────────────────────────────────────────
  {
    id: "google-fonts",
    name: "Google Fonts",
    category: "fonts",
    patterns: [/fonts\.googleapis\.com/i, /fonts\.gstatic\.com/i],
    evidence: "fonts.googleapis.com",
  },
];
