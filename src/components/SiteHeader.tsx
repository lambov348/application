import Link from "next/link";

// Шапка публичных страниц.
export default function SiteHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛋️</span>
          <span className="text-lg font-bold text-brand">MöbelStock24</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/track" className="text-gray-600 hover:text-gray-900">
            Отследить заявку
          </Link>
          <Link href="/order" className="btn-primary">
            Оставить заявку
          </Link>
          <Link href="/login" className="btn-secondary">
            Вход для сотрудников
          </Link>
        </nav>
      </div>
    </header>
  );
}
