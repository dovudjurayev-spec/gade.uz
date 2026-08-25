import { ResetForm } from "./reset-form";

export const dynamic = "force-dynamic";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm border p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-sans">Новый пароль</h1>
          <p className="text-xs text-neutral-500 mt-1">Задайте новый пароль (мин. 8 символов)</p>
        </div>
        {token ? <ResetForm token={token} /> : <p className="text-sm text-red-600">Ссылка недействительна</p>}
      </div>
    </div>
  );
}
