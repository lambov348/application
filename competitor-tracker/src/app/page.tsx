"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import Report from "@/components/Report";

export default function Home() {
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [yourUrl, setYourUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorUrl, yourUrl, topic }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Не удалось выполнить анализ.");
      } else {
        setResult(json.result as AnalysisResult);
      }
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Competitor Tracker</h1>
        <p className="mt-2 text-slate-400">
          Введите сайт конкурента — получите разбор его рекламы и трекинга, SEO,
          технологий и готовый список действий «как сделать так же или лучше».
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="mb-8 space-y-4 rounded-xl border border-edge bg-panel/70 p-5 shadow-lg"
      >
        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Сайт конкурента <span className="text-red-400">*</span>
          </label>
          <input
            value={competitorUrl}
            onChange={(e) => setCompetitorUrl(e.target.value)}
            placeholder="например, competitor.com"
            required
            className="w-full rounded-lg border border-edge bg-ink/60 px-3 py-2 outline-none focus:border-accent"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              Ваш сайт (для сравнения, опционально)
            </label>
            <input
              value={yourUrl}
              onChange={(e) => setYourUrl(e.target.value)}
              placeholder="ваш-сайт.ru"
              className="w-full rounded-lg border border-edge bg-ink/60 px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              Тематика / бренд (для поиска рекламы)
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="напр. доставка цветов"
              className="w-full rounded-lg border border-edge bg-ink/60 px-3 py-2 outline-none focus:border-accent"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent px-5 py-2.5 font-medium text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Анализирую…" : "Анализировать"}
        </button>

        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </form>

      {loading && (
        <div className="rounded-xl border border-edge bg-panel/70 p-8 text-center text-slate-400">
          Загружаю страницу конкурента и разбираю её…
        </div>
      )}

      {result && <Report result={result} />}

      {!result && !loading && (
        <p className="text-center text-sm text-slate-500">
          Ядро работает без ключей. Разделы с позициями в поиске, рекламными
          креативами и трафиком включаются добавлением API-ключей в <code>.env</code>.
        </p>
      )}
    </main>
  );
}
