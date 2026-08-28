import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
};

export type ValidateInitDataResult =
  | { ok: true; user: TelegramUser; authDate: Date }
  | { ok: false; reason: "bad_format" | "bad_hash" | "expired" | "no_user" };

/**
 * Проверяет initData из Telegram Mini App по алгоритму из документации:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * user из initData НЕ используется и НЕ парсится, пока подпись не проверена.
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSec: number,
): ValidateInitDataResult {
  if (typeof initData !== "string" || initData.length === 0) {
    return { ok: false, reason: "bad_format" };
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, reason: "bad_format" };
  }

  const hash = params.get("hash");
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
    return { ok: false, reason: "bad_hash" };
  }

  // signature — новое поле, тоже исключаем из data_check_string
  params.delete("hash");
  params.delete("signature");

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHex = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const expected = Buffer.from(hash.toLowerCase(), "hex");
  const actual = Buffer.from(computedHex, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, reason: "bad_hash" };
  }

  const authDateStr = params.get("auth_date");
  const authDateNum = authDateStr ? Number(authDateStr) : NaN;
  if (!Number.isFinite(authDateNum) || authDateNum <= 0) {
    return { ok: false, reason: "bad_format" };
  }
  const authDate = new Date(authDateNum * 1000);
  const ageSec = Math.floor((Date.now() - authDate.getTime()) / 1000);
  if (ageSec > maxAgeSec) {
    return { ok: false, reason: "expired" };
  }

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, reason: "no_user" };
  let userParsed: unknown;
  try {
    userParsed = JSON.parse(userRaw);
  } catch {
    return { ok: false, reason: "no_user" };
  }
  if (!userParsed || typeof userParsed !== "object") {
    return { ok: false, reason: "no_user" };
  }
  const u = userParsed as Record<string, unknown>;
  const id = typeof u.id === "number" ? u.id : NaN;
  const firstName = typeof u.first_name === "string" ? u.first_name : "";
  if (!Number.isFinite(id) || id <= 0 || firstName.length === 0) {
    return { ok: false, reason: "no_user" };
  }

  const user: TelegramUser = {
    id,
    first_name: firstName,
    last_name: typeof u.last_name === "string" ? u.last_name : undefined,
    username: typeof u.username === "string" ? u.username : undefined,
    photo_url: typeof u.photo_url === "string" ? u.photo_url : undefined,
    language_code: typeof u.language_code === "string" ? u.language_code : undefined,
  };

  return { ok: true, user, authDate };
}
