"use client";

import { usePathname } from "next/navigation";
import { FloatingActions } from "./floating-actions";

export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const bare = pathname?.startsWith("/admin") || pathname?.startsWith("/tma");
  if (bare) return <>{children}</>;
  return (
    <>
      {header}
      <main className="flex-1">{children}</main>
      {footer}
      <FloatingActions />
    </>
  );
}
