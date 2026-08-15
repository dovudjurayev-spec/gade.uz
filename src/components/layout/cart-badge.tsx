"use client";

import { useEffect, useState } from "react";
import { useCart, cartCount } from "@/stores/cart";

export function CartBadge() {
  const items = useCart((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const count = cartCount(items);
  if (!mounted || count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-neutral-900 text-white text-[10px] font-medium grid place-items-center">
      {count > 99 ? "99+" : count}
    </span>
  );
}
