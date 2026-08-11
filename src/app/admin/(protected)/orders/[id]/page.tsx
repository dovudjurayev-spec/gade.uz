import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderItems } from "@/db/schema";
import { formatPrice } from "@/lib/money";
import { formatPhoneUz } from "@/lib/phone";
import { DELIVERY_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/order-labels";
import { StatusForm } from "./status-form";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function OrderDetail({ params }: { params: Params }) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId)) notFound();

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) notFound();
  const items = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, orderId) });

  return (
    <div className="max-w-4xl">
      <div className="text-sm text-neutral-500 mb-2">
        <Link href="/admin/orders" className="hover:underline">← Заказы</Link>
      </div>
      <h1 className="text-2xl mb-6">Заказ №{order.number}</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card title="Клиент">
          <div>{order.customerName}</div>
          <div><a href={`tel:${order.customerPhone}`} className="text-blue-700">{formatPhoneUz(order.customerPhone)}</a></div>
        </Card>
        <Card title="Доставка">
          <div>{DELIVERY_LABEL[order.deliveryMethod]}</div>
          {order.deliveryAddress && <div className="text-neutral-600">{order.deliveryAddress}</div>}
          <div>{formatPrice(order.deliveryCostTiyin)}</div>
        </Card>
        <Card title="Оплата">
          <div>{PAYMENT_LABEL[order.paymentMethod]}</div>
          <div className="text-neutral-600">Статус: {ORDER_STATUS_LABEL[order.status]}</div>
          {order.acceptedByManager && <div className="text-neutral-600">Менеджер: {order.acceptedByManager}</div>}
        </Card>
      </div>

      <div className="bg-white border mb-6">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-left">
            <tr>
              <th className="px-3 py-2">Товар</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2 text-right">Кол-во</th>
              <th className="px-3 py-2 text-right">Цена</th>
              <th className="px-3 py-2 text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="px-3 py-2">{it.productName}</td>
                <td className="px-3 py-2 text-neutral-500">{it.sku}</td>
                <td className="px-3 py-2 text-right">{it.quantity}</td>
                <td className="px-3 py-2 text-right">{formatPrice(it.priceTiyin)}</td>
                <td className="px-3 py-2 text-right">{formatPrice(it.totalTiyin)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td colSpan={4} className="px-3 py-2 text-right text-neutral-600">Товары</td>
              <td className="px-3 py-2 text-right">{formatPrice(order.subtotalTiyin)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="px-3 py-2 text-right text-neutral-600">Доставка</td>
              <td className="px-3 py-2 text-right">{formatPrice(order.deliveryCostTiyin)}</td>
            </tr>
            <tr className="border-t font-semibold">
              <td colSpan={4} className="px-3 py-2 text-right">Итого</td>
              <td className="px-3 py-2 text-right">{formatPrice(order.totalTiyin)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {order.comment && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 mb-6 text-sm">
          <div className="font-medium mb-1">Комментарий клиента:</div>
          {order.comment}
        </div>
      )}

      <StatusForm orderId={order.id} currentStatus={order.status} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border p-4 text-sm">
      <div className="text-xs uppercase text-neutral-500 mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
