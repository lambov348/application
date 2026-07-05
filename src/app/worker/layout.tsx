import Link from "next/link";
import { requireWorker } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

// Layout кабинета исполнителя. requireWorker пускает только роль worker.
export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireWorker();

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/worker" className="flex items-center gap-2">
            <span className="text-xl">🛋️</span>
            <span className="font-bold text-brand">MöbelStock24</span>
            <span className="rounded bg-brand-light px-2 py-0.5 text-xs font-medium text-brand">
              Исполнитель
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:inline">
              {user.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
