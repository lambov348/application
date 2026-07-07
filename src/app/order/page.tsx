import SiteHeader from "@/components/SiteHeader";
import { SERVICE_CATEGORIES, isServiceSlug } from "@/lib/constants";
import { getI18n } from "@/lib/i18n.server";
import OrderForm from "./OrderForm";

// Страница оформления заявки. Категория может быть предвыбрана через ?category=slug.
export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { t } = await getI18n();
  const { category } = await searchParams;
  const preselected = category && isServiceSlug(category) ? category : undefined;

  const services = SERVICE_CATEGORIES.map((c) => ({
    slug: c.slug,
    title: t.services[c.slug].title,
  }));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">{t.order.title}</h1>
        <p className="mb-6 text-sm text-gray-600">{t.order.subtitle}</p>
        <OrderForm
          labels={t.order}
          services={services}
          preselected={preselected}
          backHome={t.common.backHome}
        />
      </main>
    </div>
  );
}
