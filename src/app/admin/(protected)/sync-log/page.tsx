import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { syncLog } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Журнал синхронизации · Админка" };

export default async function SyncLogPage() {
  const rows = await db.select().from(syncLog).orderBy(desc(syncLog.createdAt)).limit(200);

  return (
    <div>
      <h1 className="text-2xl mb-6">Журнал синхронизации</h1>
      <div className="bg-white border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-left">
            <tr>
              <th className="px-3 py-2">Время</th>
              <th className="px-3 py-2">Направление</th>
              <th className="px-3 py-2">Сущность</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Длительность</th>
              <th className="px-3 py-2">Ошибка</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-neutral-500">Пусто</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}
                </td>
                <td className="px-3 py-2 text-neutral-600">{r.direction}</td>
                <td className="px-3 py-2">{r.entity}</td>
                <td className={`px-3 py-2 ${r.status === "error" ? "text-red-600" : r.status === "ok" ? "text-green-700" : "text-yellow-700"}`}>
                  {r.status}
                </td>
                <td className="px-3 py-2 text-neutral-500">{r.durationMs != null ? `${r.durationMs} мс` : "—"}</td>
                <td className="px-3 py-2 text-red-600 max-w-md whitespace-pre-wrap">{r.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
