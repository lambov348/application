import type { DetectedTech, Insight, SeoAudit, SiteReport } from "../types";

// Движок рекомендаций: превращает находки в конкретные действия
// «как сделать у себя так же или лучше». Сравнивает конкурента с вами,
// когда ваш сайт тоже передан.

function techByCategory(tech: DetectedTech[], cat: DetectedTech["category"]) {
  return tech.filter((t) => t.category === cat);
}

export function buildInsights(
  competitor: SiteReport,
  you: SiteReport | null,
): Insight[] {
  const out: Insight[] = [];
  const seo = competitor.seo;
  const yourTechIds = new Set((you?.tech ?? []).map((t) => t.id));

  // ── Реклама: что конкурент использует, а вы — нет ──────────
  const compAds = techByCategory(competitor.tech, "advertising");
  for (const ad of compAds) {
    const youHave = yourTechIds.has(ad.id);
    out.push({
      severity: youHave ? "good" : "warn",
      area: "Реклама",
      message: `Конкурент использует «${ad.name}» (${ad.evidence}).`,
      action: youHave
        ? `У вас это тоже подключено — держите кампании активными и сравнивайте креативы.`
        : `Заведите кабинет и установите пиксель «${ad.name}», чтобы собирать аудиторию для ретаргетинга так же, как конкурент.`,
    });
  }
  if (compAds.length === 0) {
    out.push({
      severity: "good",
      area: "Реклама",
      message: "На странице не найдено рекламных пикселей ретаргетинга.",
      action:
        "Похоже, конкурент не догоняет посетителей рекламой. Это ваша возможность — настройте ретаргетинг раньше него.",
    });
  }

  // ── Аналитика ──────────────────────────────────────────────
  const compAnalytics = techByCategory(competitor.tech, "analytics");
  if (compAnalytics.length && you) {
    const missing = compAnalytics.filter((t) => !yourTechIds.has(t.id));
    if (missing.length) {
      out.push({
        severity: "warn",
        area: "Аналитика",
        message: `Конкурент считает поведение через ${compAnalytics
          .map((t) => t.name)
          .join(", ")}.`,
        action: `Подключите как минимум одну систему аналитики (${missing[0].name} или GA4), иначе вы принимаете решения вслепую.`,
      });
    }
  }

  if (!seo) return out;

  // ── SEO on-page ────────────────────────────────────────────
  seoInsights(seo, out);

  // ── Скорость / вес страницы ────────────────────────────────
  if (competitor.responseMs && competitor.responseMs > 1500) {
    out.push({
      severity: "good",
      area: "Скорость",
      message: `Страница конкурента отвечает медленно (${competitor.responseMs} мс).`,
      action:
        "Сделайте свой сайт быстрее (CDN, кэш, сжатие изображений) — скорость даёт и позиции, и конверсию.",
    });
  }

  return out;
}

function seoInsights(seo: SeoAudit, out: Insight[]) {
  // Title
  if (!seo.title) {
    out.push(mk("bad", "SEO", "У конкурента нет тега <title>.", "Обязательно задайте уникальный title 50–60 символов на каждой странице — у вас будет преимущество."));
  } else if (seo.titleLength > 65) {
    out.push(mk("warn", "SEO", `Title конкурента длинный (${seo.titleLength} симв.) и обрежется в выдаче.`, "Держите свой title в пределах 50–60 символов, вынося главный запрос в начало."));
  } else {
    out.push(mk("good", "SEO", `Title заполнен корректно (${seo.titleLength} симв.).`, "Сделайте у себя так же: один чёткий title с ключевым запросом в начале."));
  }

  // Description
  if (!seo.metaDescription) {
    out.push(mk("good", "SEO", "У конкурента нет meta description.", "Заполните свой description (140–160 симв.) с призывом — вы получите более кликабельный сниппет."));
  } else {
    out.push(mk("good", "SEO", `Description задан (${seo.metaDescriptionLength} симв.).`, "Напишите свой description убедительнее конкурента — это влияет на CTR в выдаче."));
  }

  // H1
  if (seo.h1.length === 0) {
    out.push(mk("good", "SEO", "У конкурента отсутствует H1.", "Добавьте ровно один H1 с главным запросом — конкурент этого не сделал."));
  } else if (seo.h1.length > 1) {
    out.push(mk("warn", "SEO", `У конкурента ${seo.h1.length} тегов H1.`, "Используйте только один H1 — так поисковику понятнее тема страницы."));
  }

  // Структурированные данные
  if (seo.structuredDataTypes.length) {
    out.push(mk("warn", "SEO", `Конкурент размечает Schema.org: ${seo.structuredDataTypes.join(", ")}.`, "Добавьте такую же разметку (JSON-LD) — это даёт расширенные сниппеты (звёзды, цена, FAQ) в выдаче."));
  } else {
    out.push(mk("good", "SEO", "У конкурента нет разметки Schema.org.", "Внедрите JSON-LD (Organization, Product, FAQ) — получите расширенные сниппеты раньше конкурента."));
  }

  // Open Graph
  if (Object.keys(seo.openGraph).length === 0) {
    out.push(mk("good", "SEO", "Нет Open Graph — ссылки конкурента некрасиво выглядят в соцсетях.", "Добавьте og:title, og:description, og:image — ваши ссылки будут выделяться при репостах."));
  }

  // Технические сигналы
  if (!seo.https) out.push(mk("good", "Технич.", "Сайт конкурента без HTTPS.", "У вас должен быть HTTPS — это фактор доверия и ранжирования."));
  if (!seo.sitemapXml) out.push(mk("good", "Технич.", "У конкурента не найден sitemap.xml.", "Сгенерируйте sitemap.xml и добавьте в Search Console — индексация пойдёт полнее."));
  if (seo.imagesTotal > 0 && seo.imagesWithoutAlt / seo.imagesTotal > 0.5) {
    out.push(mk("good", "SEO", `У конкурента ${seo.imagesWithoutAlt} из ${seo.imagesTotal} картинок без alt.`, "Прописывайте alt всем изображениям — это трафик из картинок и доступность."));
  }
  if (seo.wordCount < 300) {
    out.push(mk("good", "Контент", `На странице конкурента мало текста (~${seo.wordCount} слов).`, "Сделайте более развёрнутый контент (500+ слов по теме) — обгоните по релевантности."));
  }
}

function mk(
  severity: Insight["severity"],
  area: string,
  message: string,
  action: string,
): Insight {
  return { severity, area, message, action };
}
