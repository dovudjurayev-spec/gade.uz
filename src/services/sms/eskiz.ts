import { env } from "@/lib/env";

type TokenCache = { token: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;

const BASE = "https://notify.eskiz.uz/api";

async function getToken(): Promise<string | null> {
  if (!env.ESKIZ_EMAIL || !env.ESKIZ_PASSWORD) return null;
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: env.ESKIZ_EMAIL, password: env.ESKIZ_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Eskiz auth failed: ${res.status}`);
  const json = (await res.json()) as { data?: { token?: string } };
  const token = json.data?.token;
  if (!token) throw new Error("Eskiz auth: no token in response");
  tokenCache = { token, expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000 }; // 25 дней
  return token;
}

export async function sendSms(phone: string, text: string): Promise<void> {
  const digits = phone.replace(/\D/g, "");
  const token = await getToken();
  if (!token) {
    console.log(`[SMS-DEV] → ${digits}: ${text}`);
    return;
  }
  const res = await fetch(`${BASE}/message/sms/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
    body: new URLSearchParams({
      mobile_phone: digits,
      message: text,
      from: env.ESKIZ_FROM || "4546",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Eskiz send failed: ${res.status} ${body}`);
  }
}
