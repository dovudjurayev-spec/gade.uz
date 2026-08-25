import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AccountLoginPage() {
  const customer = await getCurrentCustomer();
  if (customer) redirect("/account");

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm border p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-sans">Вход в кабинет</h1>
          <p className="text-xs text-neutral-500 mt-1">Введите email и пароль</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
