import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderItems } from "@/db/schema";
import { env } from "@/lib/env";
import { sendMessage } from "./client";
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
