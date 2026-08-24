import { MonitorSmartphone } from "lucide-react";

export const metadata = { title: "Админка недоступна" };

export default function AdminBlockedPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 px-6">
      <div className="max-w-sm w-full bg-white border p-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 grid place-items-center rounded-full bg-neutral-900 text-white">
          <MonitorSmartphone className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <h1 className="text-lg font-semibold">Админка доступна только с компьютера</h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Для работы с админ-панелью откройте сайт на ноутбуке или десктопе — интерфейс не рассчитан на мобильные устройства.
        </p>
      </div>
    </div>
  );
}
