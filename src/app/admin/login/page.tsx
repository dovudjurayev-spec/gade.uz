import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Вход в админку" };

type SP = Promise<{ next?: string; error?: string }>;

export default async function AdminLoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const session = await getAdminSession();
  if (session) redirect(sp.next ?? "/admin");

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm bg-white border p-8">
        <div className="text-lg font-semibold tracking-widest mb-6 text-center">GADE · ADMIN</div>
        <LoginForm nextUrl={sp.next ?? "/admin"} initialError={sp.error} />
      </div>
    </div>
  );
}
