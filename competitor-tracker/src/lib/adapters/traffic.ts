import type { PaidSection, TrafficEstimate } from "../types";

// Оценка трафика и источников (SimilarWeb-подобные данные).
// Провайдер подключается через TRAFFIC_API_KEY. Точную сумму рекламного
// бюджета бесплатно и достоверно не даёт никто — это всегда оценка.
export async function getTraffic(
  _domain: string,
): Promise<PaidSection<TrafficEstimate>> {
  const key = process.env.TRAFFIC_API_KEY;
  const hint =
    "Задайте TRAFFIC_API_KEY в .env (SimilarWeb / Semrush / Ahrefs и т.п.), чтобы увидеть оценку месячного трафика, гео и источников. Важно: любые оценки бюджета — приблизительные, точных цифр расходов конкурента публично нет.";

  if (!key) return { configured: false, hint, data: null };

  // Точка интеграции: здесь вызывается выбранный вами провайдер и его ответ
  // приводится к TrafficEstimate. Оставлено как явный TODO под ключ клиента.
  return {
    configured: true,
    hint: "Ключ задан, но конкретный провайдер трафика ещё не подключён в traffic.ts — допишите вызов вашего API.",
    data: null,
  };
}
