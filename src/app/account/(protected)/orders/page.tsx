import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatPrice } from "@/lib/money";
import { PayOrderButton } from "./pay-order-button";

const STATUS: Record<string, string> = {
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  processing: "В обработке",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
  refunded: "Возврат",
};

export default async function OrdersPage() {
  const customer = (await getCurrentCustomer())!;
  const list = await db.query.orders.findMany({
    where: eq(orders.customerId, customer.id),
    orderBy: [desc(orders.createdAt)],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-sans">Мои заказы</h1>
      {list.length === 0 ? (
        <p className="text-sm text-neutral-500">Заказов пока нет.</p>
      ) : (
        <div className="border divide-y">
          {list.map((o) => {
            const canPay = o.status === "pending_payment" && o.paymentMethod === "payme";
            return (
              <div key={o.id} className="flex items-center justify-between gap-4 p-4 hover:bg-neutral-50">
                <Link href={`/account/orders/${o.number}`} className="flex-1 min-w-0">
                  <div className="text-sm font-medium">№ {o.number}</div>
                  <div className="text-xs text-neutral-500">{new Date(o.createdAt).toLocaleString("ru-RU")} · {STATUS[o.status] ?? o.status}</div>
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-sm">{formatPrice(o.totalTiyin)}</div>
                  {canPay && (
                    <PayOrderButton
                      orderNumber={o.number}
                      label="Оплатить"
                      className="inline-flex items-center justify-center bg-neutral-900 text-white text-xs px-3 py-2 hover:bg-neutral-800 disabled:opacity-60 transition-colors"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
