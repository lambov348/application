import SiteHeader from "@/components/SiteHeader";
import { categoryBySlug } from "@/lib/constants";
import OrderForm from "./OrderForm";

// Страница оформления заявки. Категория может быть предвыбрана через ?category=slug.
export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const preselected = categoryBySlug(category)?.title;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">
          Оставить заявку
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Заполните форму — регистрация не нужна. После отправки вы получите
          номер заявки для отслеживания.
        </p>
        <OrderForm preselected={preselected} />
      </main>
    </div>
  );
}
