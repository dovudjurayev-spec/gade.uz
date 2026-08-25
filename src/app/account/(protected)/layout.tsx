import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatPhoneUz } from "@/lib/phone";
import { logoutAction } from "../actions";
import { AccountNav } from "./account-nav";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");

  const displayName = customer.name || customer.email || (customer.phone ? formatPhoneUz(customer.phone) : "Аккаунт");
  const initial = (customer.name?.trim()?.[0] || customer.email?.[0] || customer.phone?.slice(-2, -1) || "G").toUpperCase();

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-10 md:py-14 md:flex md:items-start md:gap-10">
      <aside className="mb-8 md:mb-0 md:w-60 md:shrink-0 md:sticky md:top-32 md:self-start">
        <div className="flex items-center gap-3 pb-5 mb-5 border-b border-neutral-200">
          <div className="h-11 w-11 rounded-full bg-neutral-900 text-white grid place-items-center text-sm font-medium">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Аккаунт</div>
            <div className="text-sm font-medium truncate">{displayName}</div>
          </div>
        </div>

        <AccountNav />

        <form action={logoutAction} className="mt-5 pt-5 border-t border-neutral-200">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-500 hover:bg-neutral-100 hover:text-red-600 w-full transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            Выйти
          </button>
        </form>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
