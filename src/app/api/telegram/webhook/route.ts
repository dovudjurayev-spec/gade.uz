import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderTelegramMessages } from "@/db/schema";
import { env } from "@/lib/env";
import {
  answerCallbackQuery,
  editMessageReplyMarkup,
  sendMessage,
  type InlineKeyboardButton,
} from "@/services/telegram/client";
import { acceptedKeyboard, finalKeyboard } from "@/services/telegram/format-order";

export const dynamic = "force-dynamic";

type CallbackUser = { id: number; first_name?: string; last_name?: string; username?: string };
type CallbackQuery = {
  id: string;
  from: CallbackUser;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
};
type IncomingMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: CallbackUser;
  text?: string;
};
type Update = { callback_query?: CallbackQuery; message?: IncomingMessage };

function miniAppUrl(): string | null {
  if (!env.TELEGRAM_TMA_BOT_USERNAME || !env.TELEGRAM_TMA_APP_SHORT_NAME) return null;
  return `https://t.me/${env.TELEGRAM_TMA_BOT_USERNAME}/${env.TELEGRAM_TMA_APP_SHORT_NAME}`;
}

function welcomeText(firstName?: string): string {
  const hello = firstName ? `Здравствуйте, ${firstName}!` : "Добро пожаловать!";
  return [
    `${hello} 👋`,
    "",
    "Это официальный магазин <b>GA-DE Cosmetics</b> в Узбекистане.",
    "Здесь — вся линейка бренда: макияж, уход за лицом и телом, парфюмерия и аксессуары. Только оригинальная продукция.",
    "",
    "Что можно сделать в мини-приложении:",
    "🛍  Собрать заказ из полного каталога",
    "💳  Оплатить онлайн через Payme",
    "🚚  Выбрать доставку по Ташкенту, в регион или самовывоз",
    "❤️  Сохранить любимые товары в «Избранное»",
    "📦  Отслеживать статус своих заказов",
    "",
    "Нажмите кнопку ниже, чтобы открыть магазин.",
    "",
    "По вопросам: +998 97 008 26 08 · @gade_uz",
  ].join("\n");
}

async function handleStart(msg: IncomingMessage): Promise<{ ok: true } | { ok: false; error: string; tokenTail?: string }> {
  const url = miniAppUrl();
  const buttons: InlineKeyboardButton[][] = url
    ? [[{ text: "🛍  Открыть магазин", url }]]
    : [];
  buttons.push([
    { text: "📞 Позвонить", url: "tel:+998970082608" },
    { text: "Instagram", url: "https://www.instagram.com/gade_uz" },
  ]);
  const token = env.TELEGRAM_TMA_BOT_TOKEN ?? env.TELEGRAM_BOT_TOKEN;
  const tokenTail = token ? token.slice(-6) : "(none)";
  try {
    await sendMessage(
      {
        chat_id: msg.chat.id,
        text: welcomeText(msg.from?.first_name),
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons },
      },
      token,
    );
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("telegram /start sendMessage failed", error, "tokenTail=", tokenTail);
    return { ok: false, error, tokenTail };
  }
}

function displayName(u: CallbackUser): string {
  if (u.username) return `@${u.username}`;
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || `#${u.id}`;
}

export async function POST(req: Request) {
  if (!env.TELEGRAM_TMA_BOT_TOKEN && !env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "bot not configured" }, { status: 401 });
  }
  // Если TELEGRAM_WEBHOOK_SECRET задан — сверяем заголовок; если не задан —
  // принимаем любой запрос (менее безопасно, но не блокирует бота).
  const expected = env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const secret = req.headers.get("x-telegram-bot-api-secret-token");
    if (secret !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const update = (await req.json()) as Update;

  const msg = update.message;
  if (msg?.text && /^\/start(\s|$|@)/i.test(msg.text)) {
    await handleStart(msg);
    return NextResponse.json({ ok: true });
  }

  const cq = update.callback_query;
  if (!cq || !cq.data || !cq.message) {
    return NextResponse.json({ ok: true });
  }

  const [action, idStr] = cq.data.split(":");
  const orderId = Number(idStr);
  if (!Number.isFinite(orderId) || !action || !["accept", "delivered", "cancel"].includes(action)) {
    await answerCallbackQuery({ callback_query_id: cq.id, text: "Неизвестное действие" });
    return NextResponse.json({ ok: true });
  }

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) {
    await answerCallbackQuery({ callback_query_id: cq.id, text: "Заказ не найден", show_alert: true });
    return NextResponse.json({ ok: true });
  }

  const manager = displayName(cq.from);
  const now = new Date();

  if (action === "accept") {
    if (order.acceptedByManager) {
      await answerCallbackQuery({
        callback_query_id: cq.id,
        text: `Уже в работе у ${order.acceptedByManager}`,
        show_alert: true,
      });
      return NextResponse.json({ ok: true });
    }
    await db
      .update(orders)
      .set({ acceptedByManager: manager, acceptedAt: now, status: "processing" })
      .where(eq(orders.id, orderId));
    await broadcast(orderId, acceptedKeyboard(orderId, order.customerPhone, env.APP_URL),
      `🟡 Заказ №${order.number} принял ${manager}`);
    await answerCallbackQuery({ callback_query_id: cq.id, text: "Принято" });
    return NextResponse.json({ ok: true });
  }

  if (order.status === "delivered" || order.status === "cancelled") {
    await answerCallbackQuery({
      callback_query_id: cq.id,
      text: `Заказ уже закрыт (${order.status})`,
      show_alert: true,
    });
    return NextResponse.json({ ok: true });
  }
  if (!order.acceptedByManager) {
    await answerCallbackQuery({
      callback_query_id: cq.id,
      text: "Сначала нажмите «Принять в работу»",
      show_alert: true,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "delivered") {
    await db
      .update(orders)
      .set({ status: "delivered", deliveredByManager: manager, deliveredAt: now })
      .where(eq(orders.id, orderId));
    await broadcast(orderId, finalKeyboard(orderId, order.customerPhone, env.APP_URL),
      `✅ Заказ №${order.number} доставлен — ${manager}`);
    await answerCallbackQuery({ callback_query_id: cq.id, text: "Отмечено доставленным" });
    return NextResponse.json({ ok: true });
  }

  // action === "cancel"
  await db
    .update(orders)
    .set({ status: "cancelled", deliveredByManager: manager, deliveredAt: now })
    .where(eq(orders.id, orderId));
  await broadcast(orderId, finalKeyboard(orderId, order.customerPhone, env.APP_URL),
    `❌ Заказ №${order.number} не доставлен — ${manager}`);
  await answerCallbackQuery({ callback_query_id: cq.id, text: "Отмечено как не доставлен" });
  return NextResponse.json({ ok: true });
}

async function broadcast(
  orderId: number,
  replyMarkup: { inline_keyboard: InlineKeyboardButton[][] },
  text: string,
): Promise<void> {
  const rows = await db.query.orderTelegramMessages.findMany({
    where: eq(orderTelegramMessages.orderId, orderId),
  });
  for (const row of rows) {
    try {
      await editMessageReplyMarkup({
        chat_id: row.chatId,
        message_id: row.messageId,
        reply_markup: replyMarkup,
      });
    } catch (e) {
      console.error(`[telegram] editMessageReplyMarkup chat ${row.chatId} msg ${row.messageId} failed:`, e);
    }
    try {
      await sendMessage({
        chat_id: row.chatId,
        text,
        reply_to_message_id: row.messageId,
      });
    } catch (e) {
      console.error(`[telegram] broadcast sendMessage to ${row.chatId} failed:`, e);
    }
  }
}
