import { ForgotForm } from "./forgot-form";

export const dynamic = "force-dynamic";

export default function ForgotPage() {
  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm border p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-sans">Сброс пароля</h1>
          <p className="text-xs text-neutral-500 mt-1">Пришлём ссылку для сброса на email</p>
        </div>
        <ForgotForm />
      </div>
    </div>
  );
}
