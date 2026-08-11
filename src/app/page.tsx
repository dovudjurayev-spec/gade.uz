import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="bg-neutral-100">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-20 md:py-32 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-sm uppercase tracking-widest text-brand-accent mb-3">
              Профессиональный уход
            </p>
            <h1 className="text-4xl md:text-6xl font-semibold leading-tight mb-6">
              GADE Cosmetics в Узбекистане
            </h1>
            <p className="text-lg text-neutral-700 mb-8 max-w-lg">
              Профессиональная косметика, которой пользуются лучшие салоны Ташкента.
              Теперь напрямую вам, с доставкой на дом.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center rounded-none bg-brand text-white px-8 py-4 text-sm uppercase tracking-widest hover:bg-brand-accent transition-colors"
            >
              В каталог
            </Link>
          </div>
          <div className="aspect-square bg-neutral-200 rounded-sm" aria-hidden />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-8 py-16">
        <div className="grid gap-4 md:grid-cols-4 text-sm">
          {[
            "Только оригинал",
            "Доставка по Ташкенту",
            "Возврат 14 дней",
            "Гарантия качества",
          ].map((title) => (
            <div key={title} className="border p-6 text-center">
              <div className="font-medium">{title}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
