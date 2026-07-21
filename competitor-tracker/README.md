# Competitor Tracker — анализ конкурентов

Веб-приложение: вводите сайт конкурента (или тематику) и получаете полный
разбор — какие **рекламные и трекинг-системы** он использует, **SEO** страницы,
**техстек**, **сравнение с вашим сайтом** и готовый список **действий «как
сделать так же или лучше»**.

## Что умеет (работает сразу, без ключей)

- **Рекламные системы и пиксели ретаргетинга** — Google Ads, Meta Pixel,
  TikTok, VK, Яндекс.Директ, Bing/UET, LinkedIn, Pinterest, Snapchat, Criteo,
  AdSense, DoubleClick.
- **Аналитика** — GA4, Universal Analytics, Яндекс.Метрика, Hotjar, Clarity,
  Matomo, Plausible.
- **Менеджеры тегов** — Google Tag Manager.
- **Техстек** — CMS (WordPress, Tilda, Битрикс, Wix, Webflow, Shopify…),
  фреймворки (Next.js, React, Vue, jQuery, Bootstrap), CDN/хостинг, чаты/CRM.
- **SEO-разбор** — title, description, H1/H2, Schema.org (JSON-LD), Open Graph,
  Twitter Card, hreflang, alt у картинок, объём текста, HTTPS, robots.txt,
  sitemap.xml, вес и число скриптов.
- **Ключевые темы контента** — топ слов и фраз со страницы.
- **Сравнение «вы против конкурента»** — таблица метрик с вердиктом.
- **Рекомендации** — на каждый вывод конкретное действие для вас.

## Что требует ключей API (подключаемые модули)

Эти разделы честно помечены «нужен ключ» и наполняются реальными данными,
когда ключ задан в `.env` (см. `.env.example`):

| Раздел | Источник | Переменная |
|---|---|---|
| Позиции в поиске (SERP) | SerpApi | `SERPAPI_KEY` |
| Рекламные креативы | Meta Ad Library API | `META_AD_LIBRARY_TOKEN` |
| Оценка трафика | SimilarWeb/Semrush/Ahrefs | `TRAFFIC_API_KEY` |

> Точную сумму рекламного бюджета конкурента публично и бесплатно не даёт
> никто — любые такие цифры являются **оценкой**.

## Запуск

Нужен **Node.js 18+**.

```bash
cd competitor-tracker
npm install
cp .env.example .env   # ключи опциональны
npm run dev            # http://localhost:3005
```

Сборка production:

```bash
npm run build && npm start
```

## Как это работает

1. Приложение загружает главную страницу конкурента (`fetchSite`), а также
   проверяет `robots.txt` и `sitemap.xml`.
2. По базе сигнатур (`signatures.ts`) определяет технологии по коду страницы,
   адресам скриптов и заголовкам ответа (`detectTech`).
3. Разбирает SEO (`seoAudit`) и ключевые темы (`keywords`).
4. Сравнивает с вашим сайтом (`compare`) и формирует рекомендации
   (`recommendations`).
5. Дёргает подключаемые адаптеры платных данных (`adapters/*`), если заданы
   ключи.

## Структура

```
src/
  app/
    page.tsx              форма + вывод отчёта
    api/analyze/route.ts  POST — запуск анализа
  components/Report.tsx   рендер отчёта
  lib/
    types.ts              типы отчёта
    analyze/
      fetchSite.ts        загрузка страницы
      signatures.ts       база сигнатур технологий
      detectTech.ts       детекция систем
      seoAudit.ts         on-page SEO
      keywords.ts         ключевые темы
      compare.ts          сравнение с вами
      recommendations.ts  движок рекомендаций
      index.ts            оркестратор
    adapters/             платные источники (SERP, реклама, трафик)
```

## Этика и право

Инструмент анализирует **публично доступные** страницы, как это делает любой
браузер, и уважает таймауты. Не используйте его для обхода блокировок,
скачивания закрытых данных или нарушения условий использования сайтов.
