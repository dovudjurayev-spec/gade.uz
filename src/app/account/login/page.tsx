import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

function safeNext(raw: string | string[] | undefined): string {
  const val = Array.isArray(raw) ? raw[0] : raw;
  if (!val) return "/account";
  if (!val.startsWith("/") || val.startsWith("//")) return "/account";
  return val;
}

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const target = safeNext(next);
  const customer = await getCurrentCustomer();
  if (customer) redirect(target);

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm border p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-sans">Вход в кабинет</h1>
          <p className="text-xs text-neutral-500 mt-1">Введите email и пароль</p>
        </div>
        <LoginForm redirectTo={target} />
      </div>
    </div>
  );
}
