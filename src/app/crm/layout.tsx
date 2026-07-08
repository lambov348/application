import Link from "next/link";
import { requireUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

// Оболочка CRM: единая шапка с навигацией. Доступ — только авторизованным.
export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const nav = [
    { href: "/crm", label: "Воронка" },
    { href: "/crm/today", label: "Сегодня" },
    { href: "/crm/contacts", label: "Клиенты" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4">
          <Link href="/crm" className="flex items-center gap-2 font-bold text-brand">
            <span className="text-lg">🛠️</span>
            <span className="hidden sm:inline">MöbelStock24 CRM</span>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/crm/deals/new" className="btn-primary !py-1.5">
              + Сделка
            </Link>
            <span className="hidden text-sm text-gray-500 md:inline">{user.name}</span>
            <LogoutButton label="Выход" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-5">{children}</main>
    </div>
  );
}
