import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

// Layout кабинета админа. requireAdmin гарантирует доступ только роли admin
// (серверная проверка, помимо middleware).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-xl">🛋️</span>
              <span className="font-bold text-brand">MöbelStock24</span>
              <span className="rounded bg-brand-light px-2 py-0.5 text-xs font-medium text-brand">
                Админ
              </span>
            </Link>
            <nav className="hidden gap-4 text-sm sm:flex">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                Заявки
              </Link>
              <Link
                href="/admin/workers"
                className="text-gray-600 hover:text-gray-900"
              >
                Исполнители
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:inline">
              {user.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
