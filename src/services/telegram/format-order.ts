import type { InferSelectModel } from "drizzle-orm";
import type { orders, orderItems } from "@/db/schema";
import { formatPrice } from "@/lib/money";
import { formatPhoneUz } from "@/lib/phone";

type Order = InferSelectModel<typeof orders>;
type OrderItem = InferSelectModel<typeof orderItems>;

const DELIVERY_LABEL: Record<string, string> = {
  courier_tashkent: "курьер по Ташкенту",
  region_shipping: "отправка в регион",
  pickup: "самовывоз",
};

const PAYMENT_LABEL: Record<string, string> = {
  payme: "Payme",
  click: "Click",
  card_on_delivery: "картой при получении",
  cash_on_delivery: "наличными при получении",
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatOrderMessage(order: Order, items: OrderItem[]): string {
  const sep = "────────────────────";
  const lines: string[] = [];
  lines.push(`🛒 <b>Новый заказ №${order.number}</b>`);
  lines.push(sep);
  lines.push(`👤 ${escapeHtml(order.customerName)}`);
  lines.push(`📞 ${formatPhoneUz(order.customerPhone)}`);
  lines.push(sep);

  items.forEach((it, idx) => {
    lines.push(
      `${idx + 1}. ${escapeHtml(it.productName)} — ${it.quantity} шт × ${formatPrice(it.priceTiyin)} = ${formatPrice(it.totalTiyin)}`,
    );
  });
  lines.push(sep);

  lines.push(`Доставка: ${DELIVERY_LABEL[order.deliveryMethod] ?? order.deliveryMethod}, ${formatPrice(order.deliveryCostTiyin)}`);
  if (order.deliveryAddress) {
    lines.push(`Адрес: ${escapeHtml(order.deliveryAddress)}`);
  }
  const paid = order.status === "paid" ? " ✅" : "";
  lines.push(`Оплата: ${PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}${paid}`);
  if (order.comment) {
    lines.push(`Комментарий: ${escapeHtml(order.comment)}`);
  }
  lines.push(sep);

  lines.push(`💰 <b>Итого: ${formatPrice(order.totalTiyin)}</b>`);
  const dt = new Date(order.createdAt);
  lines.push(`🕐 ${dt.toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`);

  return lines.join("\n");
}

export function orderKeyboard(orderId: number, phone: string, appUrl: string) {
  return {
    inline_keyboard: [
      [
        { text: "Принять в работу", callback_data: `accept:${orderId}` },
      ],
      [
        { text: "Позвонить", url: `tel:${phone}` },
        { text: "В админке", url: `${appUrl}/admin/orders/${orderId}` },
      ],
    ],
  };
}
