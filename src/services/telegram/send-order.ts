import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderItems } from "@/db/schema";
import { env } from "@/lib/env";
import { sendLocation, sendMessage } from "./client";
import { formatOrderMessage, orderKeyboard } from "./format-order";

export async function sendOrderToManagers(orderId: number): Promise<number | null> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ORDERS_CHAT_ID) {
    console.warn("Telegram not configured, skipping order notification");
    return null;
  }

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) throw new Error(`Order ${orderId} not found`);

  const items = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, orderId) });

  const text = formatOrderMessage(order, items);
  const kb = orderKeyboard(orderId, order.customerPhone, env.APP_URL);

  const res = await sendMessage({
    chat_id: env.TELEGRAM_ORDERS_CHAT_ID,
    text,
    parse_mode: "HTML",
    reply_markup: kb,
  });

  await db
    .update(orders)
    .set({ telegramMessageId: res.message_id })
    .where(eq(orders.id, orderId));

  // Прикрепляем точку на карте отдельным сообщением-ответом,
  // чтобы менеджер мог открыть её нативно в Telegram/Яндекс/Google.
  if (order.deliveryLat && order.deliveryLng) {
    const lat = Number(order.deliveryLat);
    const lng = Number(order.deliveryLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      try {
        await sendLocation({
          chat_id: env.TELEGRAM_ORDERS_CHAT_ID,
          latitude: lat,
          longitude: lng,
          reply_to_message_id: res.message_id,
        });
      } catch (e) {
        console.error("[telegram] sendLocation failed:", e);
      }
    }
  }

  return res.message_id;
}

export async function notifyTech(text: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_TECH_CHAT_ID) return;
  try {
    await sendMessage({
      chat_id: env.TELEGRAM_TECH_CHAT_ID,
      text: `⚠️ ${text}`,
    });
  } catch (e) {
    console.error("Failed to notify tech chat:", e);
  }
}
