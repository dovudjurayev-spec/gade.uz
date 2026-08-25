import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { emailVerifications } from "@/db/schema";
import {
  findCustomerByEmail,
  hashPassword,
  normalizeEmail,
} from "@/lib/customer-auth";
import { env } from "@/lib/env";
import { sendVerificationCodeEmail } from "@/services/email/resend";

export const runtime = "nodejs";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(200),
});

function hashCode(code: string, email: string): string {
  return createHash("sha256").update(`${email}:${code}`).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);

  const existing = await findCustomerByEmail(email);
  if (existing) return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });

  const recent = await db.query.emailVerifications.findFirst({
    where: eq(emailVerifications.email, email),
    orderBy: [desc(emailVerifications.createdAt)],
  });
  if (recent && !recent.usedAt) {
    const age = Date.now() - new Date(recent.createdAt).getTime();
    if (age < RESEND_COOLDOWN_MS) {
      return NextResponse.json(
        { ok: false, error: "cooldown", retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - age) / 1000) },
        { status: 429 },
      );
    }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(emailVerifications).values({
    email,
    codeHash: hashCode(code, email),
    name: parsed.data.name,
    passwordHash: hashPassword(parsed.data.password),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  const result = await sendVerificationCodeEmail(email, code);
  if (!result.ok) {
    console.error("[register] send failed:", result.error);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }

  const devCode = env.NODE_ENV !== "production" && !env.RESEND_API_KEY ? code : undefined;
  return NextResponse.json({ ok: true, cooldownSec: RESEND_COOLDOWN_MS / 1000, ...(devCode ? { devCode } : {}) });
}
