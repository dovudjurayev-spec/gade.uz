import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

const nav = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/orders", label: "Заказы" },
  { href: "/admin/products", label: "Товары" },
  { href: "/admin/promo", label: "Промокоды" },
  { href: "/admin/settings", label: "Настройки" },
  { href: "/admin/sync-log", label: "Журнал синхронизации" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] bg-neutral-50">
      <aside className="bg-white border-r flex flex-col">
        <div className="p-6 text-lg font-semibold tracking-widest border-b">GADE · ADMIN</div>
        <nav className="flex-1 p-4 space-y-1 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded hover:bg-neutral-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="p-4 border-t">
          <div className="text-xs text-neutral-500 mb-2">{session.login}</div>
          <button className="text-sm text-red-600 hover:underline">Выйти</button>
        </form>
      </aside>
      <main className="p-8 overflow-x-auto">{children}</main>
    </div>
  );
}
