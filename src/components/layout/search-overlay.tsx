"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/money";

type ProductHit = {
  id: number;
  slug: string;
  name: string;
  image: string | null;
  imageFit: "contain" | "cover";
  priceTiyin: number;
  brandLine: string | null;
};
type CategoryHit = { slug: string; name: string };
type Results = { products: ProductHit[]; categories: CategoryHit[] };

export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>({ products: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const flatList = [
    ...results.categories.map((c) => ({ type: "category" as const, href: `/catalog?category=${c.slug}`, label: c.name })),
    ...results.products.map((p) => ({ type: "product" as const, href: `/catalog/${p.slug}`, label: p.name })),
  ];

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setResults({ products: [], categories: [] });
    setCursor(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults({ products: [], categories: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: Results) => {
          setResults(data);
          setCursor(-1);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (cursor >= 0 && flatList[cursor]) {
      router.push(flatList[cursor]!.href);
      close();
      return;
    }
    const term = q.trim();
    if (!term) return;
    router.push(`/catalog?q=${encodeURIComponent(term)}`);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, flatList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, -1));
    }
  }

  const hasQuery = q.trim().length >= 2;
  const hasResults = results.products.length > 0 || results.categories.length > 0;

  return (
    <>
      <button
        type="button"
        aria-label="Поиск"
        onClick={() => setOpen(true)}
        className="p-2 -ml-2 text-neutral-700 hover:text-brand-accent transition-colors cursor-pointer"
      >
        <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in-up"
          onClick={close}
        >
          <div
            className="bg-white w-full border-b border-neutral-100 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={submit}
              className="mx-auto max-w-3xl px-4 md:px-8 pt-6 pb-4 flex items-center gap-3"
            >
              <Search className={`h-5 w-5 shrink-0 ${loading ? "text-brand-accent animate-pulse" : "text-neutral-400"}`} strokeWidth={1.5} />
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Найти товар, категорию или бренд-линию…"
                className="flex-1 bg-transparent border-b border-neutral-200 focus:border-brand-accent outline-none py-2 text-base transition-colors"
              />
              <button
                type="button"
                onClick={close}
                aria-label="Закрыть"
                className="p-2 text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </form>

            <div className="mx-auto max-w-3xl px-4 md:px-8 pb-8 max-h-[70vh] overflow-y-auto">
              {hasQuery && !loading && !hasResults && (
                <div className="text-center py-12 text-neutral-500 text-sm">
                  Ничего не найдено по запросу «{q}»
                </div>
              )}

              {hasResults && (
                <div className="space-y-6">
                  {results.categories.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 mb-2">
                        Категории
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {results.categories.map((c, i) => {
                          const idx = i;
                          const active = cursor === idx;
                          return (
                            <Link
                              key={c.slug}
                              href={`/catalog?category=${c.slug}`}
                              onClick={close}
                              onMouseEnter={() => setCursor(idx)}
                              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm transition-colors ${
                                active
                                  ? "border-brand-accent text-brand-accent bg-brand-accent-soft"
                                  : "border-neutral-200 text-neutral-700"
                              }`}
                            >
                              {c.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {results.products.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 mb-2">
                        Товары
                      </div>
                      <ul className="divide-y divide-neutral-100">
                        {results.products.map((p, i) => {
                          const idx = results.categories.length + i;
                          const active = cursor === idx;
                          return (
                            <li key={p.id}>
                              <Link
                                href={`/catalog/${p.slug}`}
                                onClick={close}
                                onMouseEnter={() => setCursor(idx)}
                                className={`flex items-center gap-3 py-3 -mx-2 px-2 transition-colors ${
                                  active ? "bg-brand-accent-soft" : "hover:bg-neutral-50"
                                }`}
                              >
                                <div className="h-12 w-12 shrink-0 bg-white overflow-hidden">
                                  {p.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.image} alt={p.name} className={p.imageFit === "cover" ? "h-full w-full object-cover" : "h-full w-full object-contain p-1"} />
                                  ) : (
                                    <div className="grid place-items-center h-full text-[10px] text-neutral-400">GADE</div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {p.brandLine && (
                                    <div className="text-[10px] uppercase tracking-widest text-neutral-500 truncate">
                                      {p.brandLine}
                                    </div>
                                  )}
                                  <div className="text-sm text-neutral-900 truncate">{p.name}</div>
                                </div>
                                <div className="text-sm font-medium text-neutral-900 shrink-0">
                                  {formatPrice(p.priceTiyin)}
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>

                      <Link
                        href={`/catalog?q=${encodeURIComponent(q.trim())}`}
                        onClick={close}
                        className="group mt-3 inline-flex items-center gap-2 text-sm text-brand-accent hover:text-brand-accent-hover transition-colors"
                      >
                        Показать все результаты
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
