import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { otpCodes } from "@/db/schema";
import { env } from "@/lib/env";
import { sendSms } from "@/services/sms/eskiz";

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string, phone: string): string {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export type OtpRequestResult =
  | { ok: true; cooldownSec: number; devCode?: string }
  | { ok: false; error: "cooldown"; retryAfterSec: number }
  | { ok: false; error: "send_failed" };

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  const recent = await db.query.otpCodes.findFirst({
    where: eq(otpCodes.phone, phone),
    orderBy: [desc(otpCodes.createdAt)],
  });
  if (recent) {
    const age = Date.now() - new Date(recent.createdAt).getTime();
    if (age < RESEND_COOLDOWN_MS && !recent.usedAt) {
      return { ok: false, error: "cooldown", retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - age) / 1000) };
    }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await db.insert(otpCodes).values({
    phone,
    codeHash: hashCode(code, phone),
    expiresAt,
  });

  try {
    await sendSms(phone, `GADE.uz: ваш код подтверждения ${code}. Никому не сообщайте.`);
  } catch (err) {
    console.error("[otp] sms failed:", err);
    return { ok: false, error: "send_failed" };
  }

  const devMode = env.NODE_ENV !== "production" && (!env.ESKIZ_EMAIL || !env.ESKIZ_PASSWORD);
  return { ok: true, cooldownSec: RESEND_COOLDOWN_MS / 1000, ...(devMode ? { devCode: code } : {}) };
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; error: "no_code" | "expired" | "invalid" | "too_many_attempts" };

export async function verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
  const row = await db.query.otpCodes.findFirst({
    where: and(eq(otpCodes.phone, phone), isNull(otpCodes.usedAt), gt(otpCodes.expiresAt, new Date())),
    orderBy: [desc(otpCodes.createdAt)],
  });
  if (!row) return { ok: false, error: "no_code" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "too_many_attempts" };

  const expected = hashCode(code, phone);
  if (row.codeHash !== expected) {
    await db.update(otpCodes).set({ attempts: sql`${otpCodes.attempts} + 1` }).where(eq(otpCodes.id, row.id));
    return { ok: false, error: "invalid" };
  }

  await db.update(otpCodes).set({ usedAt: new Date() }).where(eq(otpCodes.id, row.id));
  return { ok: true };
}
