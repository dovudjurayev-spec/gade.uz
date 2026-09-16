"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ScrollRestore() {
  const router = useRouter();

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    let lockedY: number | null = null;
    let lockUntil = 0;

    const enforce = () => {
      if (lockedY == null) return;
      if (performance.now() > lockUntil) {
        lockedY = null;
        return;
      }
      if (Math.abs(window.scrollY - lockedY) > 1) {
        window.scrollTo(0, lockedY);
      }
      requestAnimationFrame(enforce);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const link = target?.closest?.("[data-load-more]") as HTMLAnchorElement | null;
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();
      const href = link.getAttribute("href") ?? link.href;
      lockedY = window.scrollY;
      lockUntil = performance.now() + 2000;
      requestAnimationFrame(enforce);
      router.push(href, { scroll: false });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);
  return null;
}
