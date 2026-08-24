import { getSettings } from "@/services/settings";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Настройки · Админка" };

export default async function SettingsPage() {
  const s = await getSettings().catch(() => null);
  return (
    <div className="w-full">
      <h1 className="text-2xl mb-6">Настройки</h1>
      {s && <SettingsForm initial={s} />}
    </div>
  );
}
