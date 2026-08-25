import { NextResponse } from "next/server";
import { z } from "zod";
import { createPasswordResetToken, findCustomerByEmail, normalizeEmail } from "@/lib/customer-auth";
import { env } from "@/lib/env";
import { sendPasswordResetEmail } from "@/services/email/resend";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  const customer = await findCustomerByEmail(email);
  // Always respond ok — не палим существование email
  if (customer) {
    const token = await createPasswordResetToken(customer.id);
    const url = `${env.APP_URL.replace(/\/$/, "")}/account/password/reset?token=${encodeURIComponent(token)}`;
    const result = await sendPasswordResetEmail(email, url);
    if (!result.ok) console.error("[password-reset] send failed:", result.error);
  }
  return NextResponse.json({ ok: true });
}
