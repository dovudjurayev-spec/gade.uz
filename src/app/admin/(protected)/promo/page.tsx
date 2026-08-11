import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { promoCodes } from "@/db/schema";
import { formatPrice } from "@/lib/money";
import { PromoRow, PromoNewRow } from "./promo-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Промокоды · Админка" };

export default async function PromoPage() {
  const rows = await db.select().from(promoCodes).orderBy(desc(promoCodes.id)).limit(200);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl mb-6">Промокоды</h1>

      <div className="bg-white border mb-6">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-left">
            <tr>
              <th className="px-3 py-2">Код</th>
              <th className="px-3 py-2">Скидка</th>
              <th className="px-3 py-2">Мин. заказ</th>
              <th className="px-3 py-2">Лимит</th>
              <th className="px-3 py-2">Активен</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <PromoNewRow />
            {rows.map((p) => (
              <PromoRow
                key={p.id}
                promo={{
                  id: p.id,
                  code: p.code,
                  discountPercent: p.discountPercent,
                  discountTiyin: p.discountTiyin,
                  minOrderTiyin: p.minOrderTiyin,
                  usageLimit: p.usageLimit,
                  usageCount: p.usageCount,
                  isActive: p.isActive,
                }}
                formattedMin={formatPrice(p.minOrderTiyin)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
