import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCustomerSession,
  findCustomerByEmail,
  normalizeEmail,
  verifyPassword,
} from "@/lib/customer-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "too_many_requests", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  const emailRl = rateLimit(`login:email:${email}`, 5, 15 * 60 * 1000);
  if (!emailRl.ok) {
    return NextResponse.json(
      { ok: false, error: "too_many_requests", retryAfterSec: emailRl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(emailRl.retryAfterSec) } },
    );
  }

  const customer = await findCustomerByEmail(email);
  if (!customer || !customer.passwordHash || !verifyPassword(parsed.data.password, customer.passwordHash)) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }
  await createCustomerSession(customer.id);
  return NextResponse.json({ ok: true });
}
