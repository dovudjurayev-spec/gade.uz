"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Package, MapPin, Heart } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/account", label: "Обзор", icon: LayoutGrid },
  { href: "/account/orders", label: "Заказы", icon: Package },
  { href: "/account/addresses", label: "Адреса", icon: MapPin },
  { href: "/account/favorites", label: "Избранное", icon: Heart },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const Icon = it.icon;
        const active =
          it.href === "/account" ? pathname === "/account" : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
