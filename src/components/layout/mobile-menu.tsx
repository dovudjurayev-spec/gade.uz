"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, ArrowUpRight, Phone, Mail, Instagram } from "lucide-react";

export type MobileSection = {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
};

export function MobileMenu({ sections }: { sections: MobileSection[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setOpen(false);
    setExpanded(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const overlay = (
    <>
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={`md:hidden fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        role="dialog"
        aria-label="Меню"
        aria-modal="true"
        className={`md:hidden fixed inset-y-0 left-0 z-[101] w-[88%] max-w-[380px] bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="relative flex items-start justify-between px-6 pt-6 pb-5 border-b border-neutral-100">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">
              Меню
            </div>
            <Link href="/" aria-label="GADE — на главную" className="mt-2 inline-flex items-center">
              <Image
                src="/logo.png"
                alt="GA-DE"
                width={144}
                height={40}
                priority
                className="h-5 w-auto"
              />
            </Link>
          </div>
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
            className="p-2 -mr-2 -mt-1 text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Sections */}
        <nav className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-2 text-[10px] uppercase tracking-[0.25em] text-neutral-400">
            Разделы
          </div>
          <ul>
            {sections.map((s) => {
              const hasChildren = !!s.children && s.children.length > 0;
              const isOpen = expanded === s.href;
              return (
                <li key={s.href} className="border-t border-neutral-50 first:border-t-0">
                  <div className="flex items-stretch group">
                    <Link
                      href={s.href}
                      className="flex-1 flex items-center gap-3 px-6 py-3.5 text-[15px] text-neutral-900 hover:bg-neutral-50 transition-colors"
                    >
                      <span className="h-px w-3 bg-neutral-300 transition-all duration-200 group-hover:w-6 group-hover:bg-neutral-900" />
                      <span className="flex-1">{s.label}</span>
                      {!hasChildren && (
                        <ArrowUpRight
                          className="h-3.5 w-3.5 text-neutral-400 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                          strokeWidth={1.5}
                        />
                      )}
                    </Link>
                    {hasChildren && (
                      <button
                        type="button"
                        aria-label={isOpen ? "Свернуть" : "Раскрыть"}
                        aria-expanded={isOpen}
                        onClick={() => setExpanded(isOpen ? null : s.href)}
                        className="px-5 flex items-center justify-center text-neutral-400 hover:text-neutral-900 border-l border-neutral-50 transition-colors"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-300 ${
                            isOpen ? "rotate-180 text-neutral-900" : ""
                          }`}
                          strokeWidth={1.5}
                        />
                      </button>
                    )}
                  </div>
                  {hasChildren && (
                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="bg-neutral-50/70 border-t border-neutral-100">
                          <ul className="py-2">
                            {s.children!.map((c) => (
                              <li key={c.href}>
                                <Link
                                  href={c.href}
                                  className="group/sub flex items-center gap-3 pl-10 pr-6 py-2.5 text-[13px] text-neutral-700 hover:text-neutral-900 hover:bg-white transition-colors"
                                >
                                  <span className="h-px w-2 bg-neutral-300 transition-all duration-200 group-hover/sub:w-4 group-hover/sub:bg-neutral-900" />
                                  <span className="flex-1">{c.label}</span>
                                  <ArrowUpRight
                                    className="h-3 w-3 text-neutral-400 opacity-0 -translate-x-1 transition-all duration-200 group-hover/sub:opacity-100 group-hover/sub:translate-x-0"
                                    strokeWidth={1.5}
                                  />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

        </nav>

        {/* Footer — контакты */}
        <div className="border-t border-neutral-100 px-6 py-4">
          <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">
            Контакты
          </div>
          <div className="mt-2 space-y-2">
            <a
              href="tel:+998000000000"
              className="group flex items-center gap-2.5 text-[13px] text-neutral-800 hover:text-neutral-900 transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-neutral-500 group-hover:text-neutral-900" strokeWidth={1.5} />
              +998 00 000 00 00
            </a>
            <a
              href="mailto:hello@gade.uz"
              className="group flex items-center gap-2.5 text-[13px] text-neutral-800 hover:text-neutral-900 transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-neutral-500 group-hover:text-neutral-900" strokeWidth={1.5} />
              hello@gade.uz
            </a>
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 text-[13px] text-neutral-800 hover:text-neutral-900 transition-colors"
            >
              <Instagram className="h-3.5 w-3.5 text-neutral-500 group-hover:text-neutral-900" strokeWidth={1.5} />
              @gade.uz
            </a>
          </div>
        </div>
      </aside>
    </>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Открыть меню"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="md:hidden p-2 text-neutral-700 hover:text-neutral-900 transition-colors"
      >
        <Menu className="h-5 w-5" strokeWidth={1.5} />
      </button>
      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
