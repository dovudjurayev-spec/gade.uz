import Link from "next/link";
import { Heart, ShoppingBag, Search } from "lucide-react";
import { CartBadge } from "./cart-badge";

const nav = [
  { href: "/catalog", label: "Каталог" },
  { href: "/quiz", label: "Подбор" },
  { href: "/about", label: "О компании" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="text-xl font-semibold tracking-widest">
          GADE
        </Link>
        <nav className="hidden md:flex gap-8 text-sm">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-brand-accent transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <button aria-label="Поиск" className="p-2 hover:text-brand-accent">
            <Search className="h-5 w-5" />
          </button>
          <Link aria-label="Избранное" href="/favorites" className="p-2 hover:text-brand-accent">
            <Heart className="h-5 w-5" />
          </Link>
          <Link aria-label="Корзина" href="/cart" className="relative p-2 hover:text-brand-accent">
            <ShoppingBag className="h-5 w-5" />
            <CartBadge />
          </Link>
        </div>
      </div>
    </header>
  );
}
