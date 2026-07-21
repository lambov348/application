import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeCompetitor } from "@/lib/analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  competitorUrl: z.string().min(3, "Укажите сайт конкурента"),
  yourUrl: z.string().optional(),
  topic: z.string().optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса." }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы." },
      { status: 400 },
    );
  }

  const { result, error } = await analyzeCompetitor(parsed.data);
  if (error) return NextResponse.json({ error }, { status: 422 });
  return NextResponse.json({ result });
}
