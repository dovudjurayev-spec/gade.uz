"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/catalog?q=${encodeURIComponent(term)}`);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Поиск"
        onClick={() => setOpen(true)}
        className="p-2 -ml-2 text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
      >
        <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={submit}
              className="mx-auto max-w-3xl px-4 md:px-8 py-6 flex items-center gap-3"
            >
              <Search className="h-5 w-5 text-neutral-400" strokeWidth={1.5} />
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Найти товар…"
                className="flex-1 bg-transparent border-b border-neutral-200 focus:border-neutral-900 outline-none py-2 text-base"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="p-2 text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
