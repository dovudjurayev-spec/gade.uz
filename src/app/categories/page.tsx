import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listCategories } from "@/repositories/products";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-12">
      <div className="mb-8">
        <span className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">Магазин</span>
        <h1 className="mt-2 text-3xl md:text-5xl font-light tracking-tight">Все категории</h1>
        <p className="mt-3 text-sm text-neutral-500 max-w-lg">
          Выберите направление ухода — от очищения до восстановления.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="border border-dashed border-neutral-300 py-24 text-center text-sm text-neutral-500">
          Категории пока не добавлены.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/catalog?category=${c.slug}`}
              className="group relative aspect-[4/3] overflow-hidden bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="text-lg md:text-xl font-medium text-neutral-900">
                  {c.name}
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-neutral-500 group-hover:text-neutral-900 transition-colors">
                  Смотреть товары
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
