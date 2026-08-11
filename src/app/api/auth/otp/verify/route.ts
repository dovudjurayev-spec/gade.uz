import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhoneUz } from "@/lib/phone";
import { verifyOtp } from "@/services/auth/otp";
import { createCustomerSession, findOrCreateCustomer } from "@/lib/customer-auth";

export const runtime = "nodejs";

const schema = z.object({
  phone: z.string().min(9).max(20),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const phone = normalizePhoneUz(parsed.data.phone);
  if (!phone) return NextResponse.json({ ok: false, error: "invalid_phone" }, { status: 400 });

  const result = await verifyOtp(phone, parsed.data.code);
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  const customer = await findOrCreateCustomer(phone);
  await createCustomerSession(customer.id);
  return NextResponse.json({ ok: true });
}
