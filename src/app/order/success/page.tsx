import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { getI18n } from "@/lib/i18n.server";

// Экран «Заявка принята» с номером заявки.
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { t } = await getI18n();
  const { id } = await searchParams;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t.success.title}</h1>
        <p className="mt-2 text-gray-600">{t.success.text}</p>
        {id && (
          <div className="card mt-6 p-6">
            <p className="text-sm text-gray-500">{t.success.numberLabel}</p>
            <p className="mt-1 text-3xl font-extrabold text-brand">№ {id}</p>
            <p className="mt-2 text-sm text-gray-500">{t.success.saveHint}</p>
          </div>
        )}
        <div className="mt-8 flex justify-center gap-3">
          {id && (
            <Link href={`/track?id=${id}`} className="btn-primary">
              {t.success.trackBtn}
            </Link>
          )}
          <Link href="/" className="btn-secondary">
            {t.success.homeBtn}
          </Link>
        </div>
      </main>
    </div>
  );
}
