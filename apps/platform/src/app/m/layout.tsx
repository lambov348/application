import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

/**
 * Кабинет монтажника. Отдельная оболочка без бокового рельса: это телефон
 * в руке на объекте, а не монитор в офисе.
 */
export default async function MonteurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("MONTEUR", "INHABER", "DISPONENT");
  const t = await getTranslations("nav");

  return (
    <div className="mx-auto min-h-screen max-w-lg">
      <header className="border-linie bg-stahl sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3 text-white">
        <b className="text-[15px]">MöbelStock24</b>
        <span className="ml-auto text-[13px] text-[#9AA3A6]">{user.name}</span>
        <form action="/logout" method="post">
          <button type="submit" className="text-[13px] text-[#9AA3A6]">
            {t("logout")}
          </button>
        </form>
      </header>

      <main className="p-4">{children}</main>

      <footer className="flex justify-center p-4">
        <LocaleSwitcher />
      </footer>
    </div>
  );
}
