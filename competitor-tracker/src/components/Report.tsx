"use client";

import type {
  AnalysisResult,
  DetectedTech,
  Insight,
  SiteReport,
  TechCategory,
} from "@/lib/types";

const CATEGORY_LABEL: Record<TechCategory, string> = {
  analytics: "Аналитика",
  advertising: "Реклама и пиксели",
  "tag-manager": "Менеджеры тегов",
  cms: "CMS",
  framework: "Фреймворки",
  ecommerce: "E-commerce",
  "cdn-hosting": "CDN / хостинг",
  "chat-crm": "Чаты / CRM",
  fonts: "Шрифты",
};

const CATEGORY_ORDER: TechCategory[] = [
  "advertising",
  "analytics",
  "tag-manager",
  "ecommerce",
  "cms",
  "framework",
  "chat-crm",
  "cdn-hosting",
  "fonts",
];

function Card({
  title,
  children,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-edge bg-panel/70 p-5 shadow-lg">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function TechBlock({ report }: { report: SiteReport }) {
  const byCat = new Map<TechCategory, DetectedTech[]>();
  for (const t of report.tech) {
    byCat.set(t.category, [...(byCat.get(t.category) ?? []), t]);
  }
  if (report.tech.length === 0)
    return <p className="text-slate-400">Ничего не обнаружено на главной странице.</p>;

  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.filter((c) => byCat.has(c)).map((cat) => (
        <div key={cat}>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-accent">
            {CATEGORY_LABEL[cat]}
          </h3>
          <div className="flex flex-wrap gap-2">
            {byCat.get(cat)!.map((t) => (
              <span
                key={t.id}
                title={t.evidence}
                className="rounded-lg border border-edge bg-ink/60 px-3 py-1.5 text-sm"
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightRow({ ins }: { ins: Insight }) {
  const color =
    ins.severity === "bad"
      ? "border-red-500/40 bg-red-500/5"
      : ins.severity === "warn"
        ? "border-amber-500/40 bg-amber-500/5"
        : "border-emerald-500/40 bg-emerald-500/5";
  const dot =
    ins.severity === "bad"
      ? "bg-red-400"
      : ins.severity === "warn"
        ? "bg-amber-400"
        : "bg-emerald-400";
  return (
    <div className={`rounded-lg border ${color} p-4`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {ins.area}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-200">{ins.message}</p>
      <p className="mt-1 text-sm text-accent">→ {ins.action}</p>
    </div>
  );
}

function SeoGrid({ report }: { report: SiteReport }) {
  const s = report.seo;
  if (!s) return null;
  const items: [string, string][] = [
    ["Title", s.title ? `${s.title.slice(0, 60)} (${s.titleLength})` : "— нет"],
    [
      "Description",
      s.metaDescription ? `есть (${s.metaDescriptionLength} симв.)` : "— нет",
    ],
    ["H1", s.h1.length ? s.h1.join(" · ").slice(0, 80) : "— нет"],
    ["H2", String(s.h2Count)],
    ["Слов на странице", String(s.wordCount)],
    ["Картинок (без alt)", `${s.imagesTotal} (${s.imagesWithoutAlt})`],
    ["Schema.org", s.structuredDataTypes.join(", ") || "— нет"],
    ["Open Graph", Object.keys(s.openGraph).length ? "есть" : "— нет"],
    ["hreflang", s.hreflang.join(", ") || "— нет"],
    ["HTTPS", s.https ? "да" : "нет"],
    ["robots.txt", s.robotsTxt ? "да" : "нет"],
    ["sitemap.xml", s.sitemapXml ? "да" : "нет"],
    ["Скриптов", String(s.scriptCount)],
    ["Вес HTML", `${(s.htmlBytes / 1024).toFixed(0)} КБ`],
  ];
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-b border-edge/60 py-1.5 text-sm">
          <span className="text-slate-400">{k}</span>
          <span className="text-right text-slate-200">{v}</span>
        </div>
      ))}
    </div>
  );
}

export default function Report({ result }: { result: AnalysisResult }) {
  const { competitor, you, comparison, insights, paid } = result;
  const host = safeHost(competitor.finalUrl);

  return (
    <div className="space-y-5">
      {/* Обзор */}
      <Card title={`Обзор — ${host}`} subtitle={competitor.finalUrl}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ответ, мс" value={String(competitor.responseMs ?? "—")} />
          <Stat label="HTTP" value={String(competitor.statusCode ?? "—")} />
          <Stat label="Технологий" value={String(competitor.tech.length)} />
          <Stat
            label="Рекл. пикселей"
            value={String(
              competitor.tech.filter((t) => t.category === "advertising").length,
            )}
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Проверено {new Date(competitor.fetchedAt).toLocaleString("ru-RU")}. Сервер:{" "}
          {competitor.server ?? "не сообщён"}.
        </p>
      </Card>

      {/* Рекомендации — самое важное сверху */}
      <Card
        title="Что делать вам"
        subtitle="Выводы из анализа и конкретные шаги, чтобы сделать так же или лучше"
      >
        <div className="space-y-2">
          {insights.map((ins, i) => (
            <InsightRow key={i} ins={ins} />
          ))}
        </div>
      </Card>

      {/* Технологии / реклама */}
      <Card
        title="Рекламные, трекинг- и технические системы"
        subtitle="Наведите на плашку — покажет, по какому признаку определено"
      >
        <TechBlock report={competitor} />
      </Card>

      {/* SEO */}
      <Card title="SEO-разбор страницы">
        <SeoGrid report={competitor} />
      </Card>

      {/* Ключевые слова */}
      <Card title="Ключевые темы контента" subtitle="Топ слов и фраз со страницы конкурента">
        <div className="flex flex-wrap gap-2">
          {competitor.keywords.map((k) => (
            <span
              key={k.term}
              className="rounded-lg border border-edge bg-ink/60 px-2.5 py-1 text-sm"
            >
              {k.term}
              <span className="ml-1.5 text-xs text-slate-500">{k.count}</span>
            </span>
          ))}
          {competitor.keywords.length === 0 && (
            <span className="text-slate-400">Недостаточно текста для анализа.</span>
          )}
        </div>
      </Card>

      {/* Сравнение */}
      {you && comparison.length > 0 && (
        <Card title="Вы против конкурента" subtitle={`Ваш сайт: ${safeHost(you.finalUrl)}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="py-2 pr-4">Метрика</th>
                  <th className="py-2 pr-4">Вы</th>
                  <th className="py-2 pr-4">Конкурент</th>
                  <th className="py-2">Итог</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.metric} className="border-t border-edge/60">
                    <td className="py-2 pr-4 text-slate-300">{row.metric}</td>
                    <td className="py-2 pr-4">{row.you}</td>
                    <td className="py-2 pr-4">{row.competitor}</td>
                    <td className="py-2">
                      {row.verdict === "you-win" ? (
                        <span className="text-emerald-400">вы впереди</span>
                      ) : row.verdict === "competitor-wins" ? (
                        <span className="text-red-400">отстаёте</span>
                      ) : (
                        <span className="text-slate-500">поровну</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Платные разделы */}
      <Card
        title="Позиции, креативы и трафик"
        subtitle="Данные из внешних источников — включаются ключами API"
      >
        <div className="space-y-4">
          <PaidBlock
            title="Позиции в поиске (SERP)"
            configured={paid.serpPositions.configured}
            hint={paid.serpPositions.hint}
          >
            {paid.serpPositions.data && (
              <ul className="space-y-1 text-sm">
                {paid.serpPositions.data.map((p) => (
                  <li key={p.keyword} className="flex justify-between border-b border-edge/60 py-1">
                    <span className="text-slate-300">{p.keyword}</span>
                    <span>{p.position ? `#${p.position}` : "вне ТОП-50"}</span>
                  </li>
                ))}
              </ul>
            )}
          </PaidBlock>

          <PaidBlock
            title="Рекламные креативы (Meta Ad Library)"
            configured={paid.adCreatives.configured}
            hint={paid.adCreatives.hint}
          >
            {paid.adCreatives.data && (
              <div className="space-y-2">
                {paid.adCreatives.data.length === 0 && (
                  <p className="text-sm text-slate-400">Активных объявлений не найдено.</p>
                )}
                {paid.adCreatives.data.map((a, i) => (
                  <div key={i} className="rounded-lg border border-edge bg-ink/60 p-3 text-sm">
                    <div className="text-xs text-slate-500">{a.platform}</div>
                    {a.headline && <div className="font-medium">{a.headline}</div>}
                    {a.body && <div className="text-slate-300">{a.body}</div>}
                    {a.previewUrl && (
                      <a
                        href={a.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent underline"
                      >
                        открыть объявление
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </PaidBlock>

          <PaidBlock
            title="Оценка трафика"
            configured={paid.traffic.configured}
            hint={paid.traffic.hint}
          />
        </div>
      </Card>
    </div>
  );
}

function PaidBlock({
  title,
  configured,
  hint,
  children,
}: {
  title: string;
  configured: boolean;
  hint: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-edge bg-ink/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-white">{title}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            configured
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-slate-500/15 text-slate-400"
          }`}
        >
          {configured ? "подключено" : "нужен ключ"}
        </span>
      </div>
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-edge bg-ink/50 p-3">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
