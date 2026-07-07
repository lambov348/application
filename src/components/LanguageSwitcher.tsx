"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { LOCALES, LOCALE_NAMES, Locale } from "@/lib/i18n";

// Переключатель языка: ссылки на /locale?l=xx&next=<текущий путь>.
// Текущий язык подсвечен. Куку ставит route-handler /locale.
export default function LanguageSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const qs = params.toString();
  const next = encodeURIComponent(qs ? `${pathname}?${qs}` : pathname);

  return (
    <div className="flex items-center gap-1 text-xs">
      {LOCALES.map((l: Locale) => (
        <a
          key={l}
          href={`/locale?l=${l}&next=${next}`}
          className={`rounded px-1.5 py-0.5 uppercase ${
            l === current
              ? "bg-brand text-white"
              : "text-gray-500 hover:bg-gray-100"
          }`}
          title={LOCALE_NAMES[l]}
        >
          {l}
        </a>
      ))}
    </div>
  );
}
