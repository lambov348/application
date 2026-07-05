import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

// Экран «Заявка принята» с номером заявки.
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Заявка принята!</h1>
        <p className="mt-2 text-gray-600">
          Мы получили вашу заявку и скоро назначим исполнителя.
        </p>
        {id && (
          <div className="card mt-6 p-6">
            <p className="text-sm text-gray-500">Номер вашей заявки</p>
            <p className="mt-1 text-3xl font-extrabold text-brand">№ {id}</p>
            <p className="mt-2 text-sm text-gray-500">
              Сохраните номер — по нему можно отслеживать статус.
            </p>
          </div>
        )}
        <div className="mt-8 flex justify-center gap-3">
          {id && (
            <Link href={`/track?id=${id}`} className="btn-primary">
              Отследить заявку
            </Link>
          )}
          <Link href="/" className="btn-secondary">
            На главную
          </Link>
        </div>
      </main>
    </div>
  );
}
