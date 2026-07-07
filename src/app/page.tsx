import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { getI18n } from "@/lib/i18n.server";

// Публичная главная — витрина услуг в духе TaskRabbit.
export default async function HomePage() {
  const { t } = await getI18n();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-brand-light">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            {t.home.heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            {t.home.heroSubtitle}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/order" className="btn-primary px-6 py-3 text-base">
              {t.home.ctaOrder}
            </Link>
            <Link href="/track" className="btn-secondary px-6 py-3 text-base">
              {t.home.ctaTrack}
            </Link>
          </div>
        </div>
      </section>

      {/* Категории услуг */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          {t.home.servicesTitle}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/order?category=${cat.slug}`}
              className="card group p-5 transition hover:border-brand hover:shadow-md"
            >
              <div className="mb-3 text-3xl">{cat.emoji}</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-brand">
                {t.services[cat.slug].title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {t.services[cat.slug].description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Как это работает */}
      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-8 text-2xl font-bold text-gray-900">
            {t.home.howTitle}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {t.home.steps.map((step, i) => (
              <div key={i} className="card p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900">{step.t}</h3>
                <p className="mt-1 text-sm text-gray-600">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Доверие */}
      <section className="border-t border-gray-200 bg-brand-light">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-12 sm:grid-cols-3">
          {t.home.trust.map((item) => (
            <div key={item.t}>
              <h3 className="font-semibold text-gray-900">✓ {item.t}</h3>
              <p className="mt-1 text-sm text-gray-600">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-500">
          © {new Date().getFullYear()} {t.home.footerSuffix}
        </div>
      </footer>
    </div>
  );
}
