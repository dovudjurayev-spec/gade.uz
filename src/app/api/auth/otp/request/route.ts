import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhoneUz } from "@/lib/phone";
import { requestOtp } from "@/services/auth/otp";

export const runtime = "nodejs";

const schema = z.object({ phone: z.string().min(9).max(20) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const phone = normalizePhoneUz(parsed.data.phone);
  if (!phone) return NextResponse.json({ ok: false, error: "invalid_phone" }, { status: 400 });

  const result = await requestOtp(phone);
  if (!result.ok) {
    const status = result.error === "cooldown" ? 429 : 502;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
