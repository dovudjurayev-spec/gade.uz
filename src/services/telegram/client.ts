import { env } from "@/lib/env";

const API = "https://api.telegram.org";

type TgResponse<T> = { ok: true; result: T } | { ok: false; description: string };

async function call<T>(method: string, body: unknown): Promise<T> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  const res = await fetch(`${API}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // No caching for API calls
    cache: "no-store",
  });
  const json = (await res.json()) as TgResponse<T>;
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description}`);
  return json.result;
}

export type InlineKeyboardButton =
  | { text: string; url: string }
  | { text: string; callback_data: string };

export type SendMessageResult = { message_id: number };

export function sendMessage(params: {
  chat_id: string | number;
  text: string;
  parse_mode?: "HTML" | "MarkdownV2";
  reply_markup?: { inline_keyboard: InlineKeyboardButton[][] };
  reply_to_message_id?: number;
}): Promise<SendMessageResult> {
  return call<SendMessageResult>("sendMessage", params);
}

export function editMessageReplyMarkup(params: {
  chat_id: string | number;
  message_id: number;
  reply_markup?: { inline_keyboard: InlineKeyboardButton[][] };
}): Promise<unknown> {
  return call("editMessageReplyMarkup", params);
}

export function answerCallbackQuery(params: {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
}): Promise<unknown> {
  return call("answerCallbackQuery", params);
}
