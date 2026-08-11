import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatPhoneUz } from "@/lib/phone";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

const nav = [
  { href: "/account", label: "Обзор" },
  { href: "/account/orders", label: "Заказы" },
  { href: "/account/addresses", label: "Адреса" },
  { href: "/account/favorites", label: "Избранное" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 grid gap-8 md:grid-cols-[220px_1fr]">
      <aside className="space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-500">Аккаунт</div>
          <div className="text-sm">{customer.name || formatPhoneUz(customer.phone)}</div>
        </div>
        <nav className="text-sm space-y-1">
          {nav.map((it) => (
            <Link key={it.href} href={it.href} className="block px-3 py-2 rounded hover:bg-neutral-100">
              {it.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction}>
          <button className="text-xs text-neutral-500 hover:text-red-600 px-3">Выйти</button>
        </form>
      </aside>
      <main>{children}</main>
    </div>
  );
}
