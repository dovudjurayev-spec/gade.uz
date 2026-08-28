"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function FloatingActions() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Наверх"
      className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-neutral-900 text-white shadow-lg ring-1 ring-black/5 hover:bg-neutral-700 hover:scale-105 transition-all ${
        showTop ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
      }`}
    >
      <ArrowUp className="h-5 w-5" strokeWidth={1.8} />
    </button>
  );
}
