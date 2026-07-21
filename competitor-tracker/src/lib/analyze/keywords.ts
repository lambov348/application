import * as cheerio from "cheerio";
import type { KeywordHit } from "../types";

// Стоп-слова (RU + EN + DE) — предлоги, союзы, местоимения и прочий «шум»,
// который не несёт тематической ценности.
const STOP = new Set(
  (
    "и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех про " +
    "the a an and or but of to in on for with at by from as is are was were be been being this that these those it its his her their our your my we you they he she i " +
    "der die das und oder aber von zu in auf für mit bei durch als ist sind war ein eine einen dem den des im am zum zur"
  ).split(/\s+/),
);

// Топ ключевых слов и биграмм по видимому тексту страницы — грубая оценка
// того, вокруг каких тем построен контент конкурента.
export function extractKeywords(html: string, limit = 20): KeywordHit[] {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const text = $("body").text().toLowerCase();

  const words = (text.match(/[a-zа-яё0-9-]{3,}/gi) || []).filter(
    (w) => !STOP.has(w) && !/^\d+$/.test(w),
  );

  const counts = new Map<string, number>();
  const bump = (term: string) => counts.set(term, (counts.get(term) ?? 0) + 1);

  for (let i = 0; i < words.length; i++) {
    bump(words[i]);
    if (i + 1 < words.length) {
      const next = words[i + 1];
      if (!STOP.has(next)) bump(`${words[i]} ${next}`);
    }
  }

  return [...counts.entries()]
    .filter(([term, c]) => c > 1 && term.length > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}
