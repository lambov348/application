import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { SERVICE_CATEGORIES } from "@/lib/constants";

// Публичная главная — витрина услуг в духе TaskRabbit.
export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-brand-light">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Проверенные исполнители для мебели и переезда
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Сборка, перевозка, монтаж и уборка. Оставьте заявку — мы подберём
            исполнителя и доведём задачу до результата.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/order" className="btn-primary px-6 py-3 text-base">
              Оставить заявку
            </Link>
            <Link href="/track" className="btn-secondary px-6 py-3 text-base">
              Отследить заявку
            </Link>
          </div>
        </div>
      </section>

      {/* Категории услуг */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Какая услуга вам нужна?
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
                {cat.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Как это работает */}
      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-8 text-2xl font-bold text-gray-900">
            Как это работает
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Опишите задачу",
                d: "Заполните короткую форму: что нужно, где и когда. Регистрация не требуется.",
              },
              {
                n: "2",
                t: "Мы назначим исполнителя",
                d: "Администратор подберёт проверенного исполнителя и передаст ему заявку.",
              },
              {
                n: "3",
                t: "Задача выполнена",
                d: "Отслеживайте статус по номеру заявки — от поступления до выполнения.",
              },
            ].map((step) => (
              <div key={step.n} className="card p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
                  {step.n}
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
          {[
            { t: "Проверенные исполнители", d: "Каждый исполнитель добавляется вручную администратором." },
            { t: "Прозрачный статус", d: "Видно, на каком этапе ваша заявка в любой момент." },
            { t: "Быстрый отклик", d: "Заявка попадает к администратору сразу после отправки." },
          ].map((item) => (
            <div key={item.t}>
              <h3 className="font-semibold text-gray-900">✓ {item.t}</h3>
              <p className="mt-1 text-sm text-gray-600">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-500">
          © {new Date().getFullYear()} MöbelStock24 — перевозка, сборка и монтаж
          мебели.
        </div>
      </footer>
    </div>
  );
}
