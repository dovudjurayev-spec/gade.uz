import { env } from "@/lib/env";

const API = "https://api.telegram.org";

type TgResponse<T> = { ok: true; result: T } | { ok: false; description: string };

async function call<T>(method: string, body: unknown, botToken?: string): Promise<T> {
  const token = botToken ?? env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  const res = await fetch(`${API}/bot${token}/${method}`, {
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

export function sendMessage(
  params: {
    chat_id: string | number;
    text: string;
    parse_mode?: "HTML" | "MarkdownV2";
    reply_markup?: { inline_keyboard: InlineKeyboardButton[][] };
    reply_to_message_id?: number;
  },
  botToken?: string,
): Promise<SendMessageResult> {
  return call<SendMessageResult>("sendMessage", params, botToken);
}

export function sendLocation(
  params: {
    chat_id: string | number;
    latitude: number;
    longitude: number;
    reply_to_message_id?: number;
  },
  botToken?: string,
): Promise<SendMessageResult> {
  return call<SendMessageResult>("sendLocation", params, botToken);
}

export function editMessageReplyMarkup(
  params: {
    chat_id: string | number;
    message_id: number;
    reply_markup?: { inline_keyboard: InlineKeyboardButton[][] };
  },
  botToken?: string,
): Promise<unknown> {
  return call("editMessageReplyMarkup", params, botToken);
}

export function answerCallbackQuery(
  params: {
    callback_query_id: string;
    text?: string;
    show_alert?: boolean;
  },
  botToken?: string,
): Promise<unknown> {
  return call("answerCallbackQuery", params, botToken);
}
