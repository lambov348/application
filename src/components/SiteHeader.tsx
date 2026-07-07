import Link from "next/link";
import { getI18n } from "@/lib/i18n.server";
import LanguageSwitcher from "./LanguageSwitcher";

// Шапка публичных страниц.
export default async function SiteHeader() {
  const { locale, t } = await getI18n();
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛋️</span>
          <span className="text-lg font-bold text-brand">MöbelStock24</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/track" className="text-gray-600 hover:text-gray-900">
            {t.nav.track}
          </Link>
          <Link href="/order" className="btn-primary">
            {t.nav.order}
          </Link>
          <Link href="/login" className="btn-secondary">
            {t.nav.staffLogin}
          </Link>
          <LanguageSwitcher current={locale} />
        </nav>
      </div>
    </header>
  );
}
