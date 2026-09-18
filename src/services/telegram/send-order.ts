import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderItems, orderTelegramMessages } from "@/db/schema";
import { env } from "@/lib/env";
import { sendLocation, sendMessage } from "./client";
import { formatOrderMessage, orderKeyboard } from "./format-order";

function parseChatIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function sendOrderToManagers(orderId: number): Promise<number | null> {
  const chatIds = parseChatIds(env.TELEGRAM_ORDERS_CHAT_ID);
  if (!env.TELEGRAM_BOT_TOKEN || chatIds.length === 0) {
    console.warn("Telegram not configured, skipping order notification");
    return null;
  }

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) throw new Error(`Order ${orderId} not found`);

  const items = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, orderId) });

  const text = formatOrderMessage(order, items);
  const kb = orderKeyboard(orderId, order.customerPhone, env.APP_URL);

  let firstMessageId: number | null = null;
  const lat = order.deliveryLat ? Number(order.deliveryLat) : NaN;
  const lng = order.deliveryLng ? Number(order.deliveryLng) : NaN;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  for (const chatId of chatIds) {
    try {
      const res = await sendMessage({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: kb,
      });
      if (firstMessageId === null) firstMessageId = res.message_id;

      try {
        await db
          .insert(orderTelegramMessages)
          .values({ orderId, chatId, messageId: res.message_id })
          .onConflictDoNothing();
      } catch (e) {
        console.error(`[telegram] failed to record message for chat ${chatId}:`, e);
      }

      if (hasCoords) {
        try {
          await sendLocation({
            chat_id: chatId,
            latitude: lat,
            longitude: lng,
            reply_to_message_id: res.message_id,
          });
        } catch (e) {
          console.error(`[telegram] sendLocation to ${chatId} failed:`, e);
        }
      }
    } catch (e) {
      console.error(`[telegram] sendMessage to ${chatId} failed:`, e);
    }
  }

  if (firstMessageId !== null) {
    await db
      .update(orders)
      .set({ telegramMessageId: firstMessageId })
      .where(eq(orders.id, orderId));
  }

  return firstMessageId;
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
