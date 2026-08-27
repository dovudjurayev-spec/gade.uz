"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, ArrowUpRight, Phone, Mail, Instagram } from "lucide-react";

type MobileLeaf = { href: string; label: string };
type MobileSub = { href: string; label: string; children?: MobileLeaf[] };
export type MobileSection = {
  href: string;
  label: string;
  children?: MobileSub[];
};

export function MobileMenu({ sections }: { sections: MobileSection[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setOpen(false);
    setExpanded(null);
    setExpandedSub(null);
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
                  {hasChildren ? (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => {
                        setExpanded(isOpen ? null : s.href);
                        setExpandedSub(null);
                      }}
                      className="group w-full flex items-center gap-3 px-6 py-3.5 text-left text-[15px] text-neutral-900 hover:bg-neutral-50 transition-colors"
                    >
                      <span className="h-px w-3 bg-neutral-300 transition-all duration-200 group-hover:w-6 group-hover:bg-neutral-900" />
                      <span className="flex-1">{s.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-neutral-400 transition-transform duration-300 ${
                          isOpen ? "rotate-180 text-neutral-900" : ""
                        }`}
                        strokeWidth={1.5}
                      />
                    </button>
                  ) : (
                    <Link
                      href={s.href}
                      className="group flex items-center gap-3 px-6 py-3.5 text-[15px] text-neutral-900 hover:bg-neutral-50 transition-colors"
                    >
                      <span className="h-px w-3 bg-neutral-300 transition-all duration-200 group-hover:w-6 group-hover:bg-neutral-900" />
                      <span className="flex-1">{s.label}</span>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 text-neutral-400 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                        strokeWidth={1.5}
                      />
                    </Link>
                  )}
                  {hasChildren && (
                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="bg-neutral-50/70 border-t border-neutral-100">
                          <ul className="py-2">
                            {s.children!.map((c, idx) => {
                              const subHasLeaves = !!c.children && c.children.length > 0;
                              const isSubOpen = expandedSub === c.href;
                              const isViewAll = idx === 0;
                              if (isViewAll) {
                                return (
                                  <li key={c.href}>
                                    <Link
                                      href={c.href}
                                      className="group/all flex items-center justify-between gap-3 pl-10 pr-6 py-3 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-900 hover:bg-white transition-colors"
                                    >
                                      <span className="flex items-center gap-2.5">
                                        <span className="h-px w-4 bg-neutral-900 transition-all duration-200 group-hover/all:w-6" />
                                        {c.label}
                                      </span>
                                      <ArrowUpRight
                                        className="h-3.5 w-3.5 transition-transform duration-200 group-hover/all:translate-x-0.5 group-hover/all:-translate-y-0.5"
                                        strokeWidth={1.5}
                                      />
                                    </Link>
                                  </li>
                                );
                              }
                              return (
                                <li key={c.href}>
                                  {subHasLeaves ? (
                                    <button
                                      type="button"
                                      aria-expanded={isSubOpen}
                                      onClick={() => setExpandedSub(isSubOpen ? null : c.href)}
                                      className="group/sub w-full flex items-center gap-3 pl-10 pr-6 py-2.5 text-left text-[13px] text-neutral-700 hover:text-neutral-900 hover:bg-white transition-colors"
                                    >
                                      <span className="h-px w-2 bg-neutral-300 transition-all duration-200 group-hover/sub:w-4 group-hover/sub:bg-neutral-900" />
                                      <span className="flex-1">{c.label}</span>
                                      <ChevronDown
                                        className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-300 ${
                                          isSubOpen ? "rotate-180 text-neutral-900" : ""
                                        }`}
                                        strokeWidth={1.5}
                                      />
                                    </button>
                                  ) : (
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
                                  )}
                                  {subHasLeaves && (
                                    <div
                                      className={`grid transition-all duration-300 ease-out ${
                                        isSubOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                      }`}
                                    >
                                      <div className="overflow-hidden">
                                        <ul className="pb-2">
                                          <li>
                                            <Link
                                              href={c.href}
                                              className="group/all flex items-center justify-between gap-3 pl-14 pr-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-900 hover:bg-white transition-colors"
                                            >
                                              <span className="flex items-center gap-2.5">
                                                <span className="h-px w-3 bg-neutral-900 transition-all duration-200 group-hover/all:w-5" />
                                                Все — {c.label}
                                              </span>
                                              <ArrowUpRight
                                                className="h-3.5 w-3.5 transition-transform duration-200 group-hover/all:translate-x-0.5 group-hover/all:-translate-y-0.5"
                                                strokeWidth={1.5}
                                              />
                                            </Link>
                                          </li>
                                          {c.children!.map((leaf) => (
                                            <li key={leaf.href}>
                                              <Link
                                                href={leaf.href}
                                                className="group/leaf flex items-center gap-3 pl-14 pr-6 py-2 text-[13px] text-neutral-700 hover:text-neutral-900 hover:bg-white transition-colors"
                                              >
                                                <span className="h-px w-2 bg-neutral-300 transition-all duration-200 group-hover/leaf:w-4 group-hover/leaf:bg-neutral-900" />
                                                <span className="flex-1">{leaf.label}</span>
                                                <ArrowUpRight
                                                  className="h-3 w-3 text-neutral-400 opacity-0 -translate-x-1 transition-all duration-200 group-hover/leaf:opacity-100 group-hover/leaf:translate-x-0"
                                                  strokeWidth={1.5}
                                                />
                                              </Link>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
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
        <div className="bg-neutral-900 text-white px-6 py-5">
          <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">
            Контакты
          </div>
          <div className="mt-2.5 space-y-2">
            <a
              href="tel:+998000000000"
              className="group flex items-center gap-2.5 text-[13px] text-neutral-100 hover:text-white transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-neutral-400 group-hover:text-white" strokeWidth={1.5} />
              +998 00 000 00 00
            </a>
            <a
              href="mailto:hello@gade.uz"
              className="group flex items-center gap-2.5 text-[13px] text-neutral-100 hover:text-white transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-neutral-400 group-hover:text-white" strokeWidth={1.5} />
              hello@gade.uz
            </a>
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 text-[13px] text-neutral-100 hover:text-white transition-colors"
            >
              <Instagram className="h-3.5 w-3.5 text-neutral-400 group-hover:text-white" strokeWidth={1.5} />
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
