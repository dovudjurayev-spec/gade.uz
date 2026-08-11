import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { env } from "@/lib/env";
import { answerCallbackQuery, editMessageReplyMarkup, sendMessage } from "@/services/telegram/client";

export const dynamic = "force-dynamic";

type CallbackUser = { id: number; first_name?: string; last_name?: string; username?: string };
type CallbackQuery = {
  id: string;
  from: CallbackUser;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
};
type Update = { callback_query?: CallbackQuery };

function displayName(u: CallbackUser): string {
  if (u.username) return `@${u.username}`;
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || `#${u.id}`;
}

export async function POST(req: Request) {
  // Защита секретом в URL — Telegram отправит секрет в заголовке X-Telegram-Bot-Api-Secret-Token
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!env.TELEGRAM_BOT_TOKEN || secret !== env.CRON_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = (await req.json()) as Update;
  const cq = update.callback_query;
  if (!cq || !cq.data || !cq.message) {
    return NextResponse.json({ ok: true });
  }

  const [action, idStr] = cq.data.split(":");
  const orderId = Number(idStr);
  if (action !== "accept" || !Number.isFinite(orderId)) {
    await answerCallbackQuery({ callback_query_id: cq.id, text: "Неизвестное действие" });
    return NextResponse.json({ ok: true });
  }

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) {
    await answerCallbackQuery({ callback_query_id: cq.id, text: "Заказ не найден", show_alert: true });
    return NextResponse.json({ ok: true });
  }

  if (order.acceptedByManager) {
    await answerCallbackQuery({
      callback_query_id: cq.id,
      text: `Уже в работе у ${order.acceptedByManager}`,
      show_alert: true,
    });
    return NextResponse.json({ ok: true });
  }

  const manager = displayName(cq.from);
  await db
    .update(orders)
    .set({ acceptedByManager: manager, status: "processing" })
    .where(eq(orders.id, orderId));

  // Убираем кнопку «Принять в работу», оставляем «Позвонить» + ссылку в админку
  await editMessageReplyMarkup({
    chat_id: cq.message.chat.id,
    message_id: cq.message.message_id,
    reply_markup: {
      inline_keyboard: [
        [{ text: "Позвонить", url: `tel:${order.customerPhone}` }],
        [{ text: "В админке", url: `${env.APP_URL}/admin/orders/${orderId}` }],
      ],
    },
  });

  await sendMessage({
    chat_id: cq.message.chat.id,
    text: `✅ Заказ №${order.number} принял ${manager}`,
    reply_to_message_id: cq.message.message_id,
  });

  await answerCallbackQuery({ callback_query_id: cq.id, text: "Принято" });
  return NextResponse.json({ ok: true });
}
