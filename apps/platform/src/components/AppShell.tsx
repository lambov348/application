import { getTranslations } from "next-intl/server";
import type { Role } from "@prisma/client";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { cn } from "@/lib/utils";

/**
 * Боковой рельс и шапка по mockup_mobelstock24.html.
 *
 * Пункты меню скрыты по роли, но это только удобство: настоящая защита —
 * в middleware (маршруты) и в guards.ts (данные). Спрятанная ссылка защитой
 * не является.
 */
type NavItem = {
  href: string;
  icon: string;
  labelKey: string;
  roles: Role[];
  /** Раздел следующих этапов — показываем неактивным, как в макете. */
  upcoming?: boolean;
};

const NAV: NavItem[] = [
  { href: "/heute", icon: "◧", labelKey: "heute", roles: ["INHABER", "DISPONENT"] },
  { href: "/anfragen", icon: "▤", labelKey: "anfragen", roles: ["INHABER", "DISPONENT"], upcoming: true },
  { href: "/einsatzplan", icon: "▦", labelKey: "einsatzplan", roles: ["INHABER", "DISPONENT"], upcoming: true },
  { href: "/angebote", icon: "€", labelKey: "angebote", roles: ["INHABER", "DISPONENT"], upcoming: true },
  { href: "/kunden", icon: "☷", labelKey: "kunden", roles: ["INHABER", "DISPONENT"], upcoming: true },
  { href: "/m", icon: "▣", labelKey: "monteur", roles: ["INHABER", "DISPONENT", "MONTEUR"] },
  { href: "/einstellungen/benutzer", icon: "⚙", labelKey: "benutzer", roles: ["INHABER"] },
];

export async function AppShell({
  user,
  pathname,
  title,
  children,
}: {
  user: { name: string; role: Role };
  pathname: string;
  title: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("nav");
  const items = NAV.filter((i) => i.roles.includes(user.role));

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex min-h-screen">
      <aside className="bg-stahl sticky top-0 flex h-screen w-[198px] shrink-0 flex-col text-[#C6CCCE]">
        <div className="border-b border-[#343B3F] px-4 pt-[18px] pb-4">
          <b className="block text-[17px] tracking-tight text-white">
            MöbelStock24
          </b>
          <small className="text-[12px] text-[#7D878B]">
            {t("tagline")}
          </small>
        </div>

        <nav className="flex-1 overflow-auto px-2 py-2.5">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <a
                key={item.href}
                href={item.upcoming ? undefined : item.href}
                aria-disabled={item.upcoming || undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "mb-px flex items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-sm",
                  active && "text-stahl bg-white font-semibold",
                  !active && !item.upcoming && "hover:bg-stahl-2 hover:text-white",
                  item.upcoming && "cursor-default opacity-40",
                )}
              >
                <span className="w-[17px] text-center text-sm">{item.icon}</span>
                {t(item.labelKey)}
                {item.upcoming && (
                  <span className="ml-auto text-[10px] uppercase">
                    {t("soon")}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 border-t border-[#343B3F] px-4 py-3">
          <span className="bg-gelb text-stahl grid h-[27px] w-[27px] place-items-center rounded-full text-xs font-semibold">
            {initials}
          </span>
          <span className="min-w-0">
            <b className="block truncate text-[13px] font-semibold text-white">
              {user.name}
            </b>
            <small className="text-[11px] text-[#7D878B]">
              {t(`roles.${user.role}`)}
            </small>
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-linie bg-blatt sticky top-0 z-10 flex h-[54px] items-center gap-4 border-b px-[22px]">
          <h1 className="text-[19px] font-semibold tracking-tight">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <LocaleSwitcher />
            <form action="/logout" method="post">
              <button
                type="submit"
                className="text-text-2 hover:text-stahl text-[13px]"
              >
                {t("logout")}
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-[22px]">{children}</main>
      </div>
    </div>
  );
}
