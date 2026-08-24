import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Ticket,
  Settings,
  RefreshCw,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getAdminSession } from "@/lib/admin-auth";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

const nav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Обзор", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Заказы", icon: ShoppingBag },
  { href: "/admin/products", label: "Товары", icon: Package },
  { href: "/admin/promo", label: "Промокоды", icon: Ticket },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
  { href: "/admin/sync-log", label: "Журнал синхронизации", icon: RefreshCw },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] bg-neutral-50">
      <aside className="bg-white border-r flex flex-col sticky top-0 h-screen">
        <div className="p-6 text-lg font-semibold tracking-widest border-b">GADE · ADMIN</div>
        <nav className="flex-1 p-3 space-y-0.5 text-sm">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="p-4 border-t">
          <div className="text-xs text-neutral-500 mb-2 truncate">{session.login}</div>
          <button className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            Выйти
          </button>
        </form>
      </aside>
      <main className="p-8 overflow-x-auto">{children}</main>
    </div>
  );
}
