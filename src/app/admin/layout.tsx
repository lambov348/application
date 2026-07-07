import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n.server";
import LogoutButton from "@/components/LogoutButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Layout кабинета админа. requireAdmin гарантирует доступ только роли admin.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const { locale, t } = await getI18n();

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-xl">🛋️</span>
              <span className="font-bold text-brand">MöbelStock24</span>
              <span className="rounded bg-brand-light px-2 py-0.5 text-xs font-medium text-brand">
                {t.admin.badge}
              </span>
            </Link>
            <nav className="hidden gap-4 text-sm sm:flex">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                {t.admin.navRequests}
              </Link>
              <Link
                href="/admin/workers"
                className="text-gray-600 hover:text-gray-900"
              >
                {t.admin.navWorkers}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher current={locale} />
            <span className="hidden text-sm text-gray-600 sm:inline">
              {user.name}
            </span>
            <LogoutButton label={t.common.logout} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
