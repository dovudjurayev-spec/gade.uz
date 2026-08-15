import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, User, Heart } from "lucide-react";
import { CartBadge } from "./cart-badge";
import { SearchOverlay } from "./search-overlay";

type Section = { href: string; label: string; accent?: boolean };

const sections: Section[] = [
  { href: "/catalog?sort=new", label: "Новинки" },
  { href: "/catalog?sort=popular", label: "Хиты продаж" },
  { href: "/catalog?category=makeup", label: "Макияж" },
  { href: "/catalog?category=skincare", label: "Уход" },
  { href: "/catalog?category=fragrances", label: "Ароматы" },
  { href: "/catalog?category=sets", label: "Наборы" },
  { href: "/catalog?sale=1", label: "Аутлет", accent: true },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white">
      {/* Announcement */}
      <div className="bg-neutral-900 text-[11px] text-white">
        <div className="mx-auto flex h-7 max-w-7xl items-center justify-center px-4 md:px-8 tracking-wide">
          Бесплатная доставка по Ташкенту от 500 000 сум
        </div>
      </div>

      {/* Main row */}
      <div className="border-b border-neutral-100">
        <div className="mx-auto grid h-12 max-w-7xl grid-cols-3 items-center px-4 md:px-8">
          <div className="flex items-center">
            <SearchOverlay />
          </div>

          <div className="flex justify-center">
            <Link href="/" aria-label="GADE — на главную" className="flex items-center">
              <Image
                src="/logo.png"
                alt="GA-DE"
                width={144}
                height={40}
                priority
                className="h-4 md:h-5 w-auto"
              />
            </Link>
          </div>

          <div className="flex items-center justify-end gap-2 md:gap-4">
            <Link
              aria-label="Избранное"
              href="/account/favorites"
              className="p-2 text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              <Heart className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </Link>

            <Link
              aria-label="Личный кабинет"
              href="/account"
              className="p-2 text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              <User className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </Link>

            <Link
              aria-label="Корзина"
              href="/cart"
              className="relative p-2 -mr-2 text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} />
              <CartBadge />
            </Link>
          </div>
        </div>
      </div>

      {/* Sections nav */}
      <nav className="hidden md:block">
        <ul className="mx-auto flex max-w-7xl items-center justify-center gap-8 lg:gap-12 px-4 md:px-8 h-9 text-[13px] font-normal">
          {sections.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className={`transition-colors ${
                  s.accent
                    ? "text-red-600 hover:text-red-700"
                    : "text-neutral-800 hover:text-neutral-900"
                }`}
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
