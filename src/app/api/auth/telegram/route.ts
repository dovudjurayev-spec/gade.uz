import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { customers } from "@/db/schema";
import { createCustomerSession } from "@/lib/customer-auth";
import { originAllowed } from "@/lib/csrf";
import { env } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { validateInitData } from "@/lib/telegram-auth";

export const runtime = "nodejs";

const schema = z.object({ initData: z.string().min(1).max(4096) });

// TEMP debug: GET returns which bot the env token belongs to. Remove after diagnosis.
export async function GET() {
  const token = env.TELEGRAM_TMA_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: "no_token" });
  const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = (await r.json().catch(() => null)) as { ok?: boolean; result?: { username?: string; id?: number } } | null;
  return NextResponse.json({
    ok: data?.ok ?? false,
    username: data?.result?.username ?? null,
    id: data?.result?.id ?? null,
    tokenLen: token.length,
  });
}

export async function POST(req: Request) {
  // Origin — свой домен или один из доменов Telegram Web. Заголовок обязателен.
  if (!originAllowed(req, true)) {
    return NextResponse.json({ ok: false, error: "forbidden_origin" }, { status: 403 });
  }

  const ip = clientIp(req);
  const rlIp = rateLimit(`tg_login_ip:${ip}`, 20, 15 * 60 * 1000);
  if (!rlIp.ok) {
    return NextResponse.json(
      { ok: false, error: "too_many_requests", retryAfterSec: rlIp.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rlIp.retryAfterSec) } },
    );
  }

  const botToken = env.TELEGRAM_TMA_BOT_TOKEN;
  if (!botToken) {
    console.error("[tg-auth] TELEGRAM_TMA_BOT_TOKEN is not set");
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const check = validateInitData(parsed.data.initData, botToken, 3600);
  if (!check.ok) {
    // Лог без раскрытия initData и без токена; в ответе — общая ошибка.
    console.warn(`[tg-auth] initData rejected: ${check.reason}`);
    return NextResponse.json({ ok: false, error: "invalid_init_data" }, { status: 401 });
  }

  const tgId = check.user.id;
  const rlUid = rateLimit(`tg_login_uid:${tgId}`, 20, 15 * 60 * 1000);
  if (!rlUid.ok) {
    return NextResponse.json(
      { ok: false, error: "too_many_requests", retryAfterSec: rlUid.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rlUid.retryAfterSec) } },
    );
  }

  const fullName = [check.user.first_name, check.user.last_name].filter(Boolean).join(" ").trim();

  const existing = await db.query.customers.findFirst({ where: eq(customers.telegramId, tgId) });
  let customerId: number;

  if (existing) {
    customerId = existing.id;
    const patch: Record<string, unknown> = {};
    if (check.user.username !== undefined && check.user.username !== existing.telegramUsername) {
      patch.telegramUsername = check.user.username;
    }
    if (check.user.photo_url !== undefined && check.user.photo_url !== existing.telegramPhotoUrl) {
      patch.telegramPhotoUrl = check.user.photo_url;
    }
    // Имя не перезатираем, если пользователь уже задавал своё — только заполняем пустое.
    if (!existing.name && fullName) {
      patch.name = fullName;
    }
    if (Object.keys(patch).length > 0) {
      await db.update(customers).set(patch).where(eq(customers.id, existing.id));
    }
  } else {
    const inserted = await db
      .insert(customers)
      .values({
        telegramId: tgId,
        telegramUsername: check.user.username ?? null,
        telegramPhotoUrl: check.user.photo_url ?? null,
        name: fullName || null,
      })
      .returning({ id: customers.id });
    const row = inserted[0];
    if (!row) {
      console.error("[tg-auth] failed to insert customer for tg id");
      return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
    }
    customerId = row.id;
  }

  const { sessionToken } = await createCustomerSession(customerId, { crossSite: true });
  return NextResponse.json({ ok: true, sessionToken });
}
