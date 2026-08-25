import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCustomerSession,
  findCustomerByEmail,
  normalizeEmail,
  verifyPassword,
} from "@/lib/customer-auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  const customer = await findCustomerByEmail(email);
  if (!customer || !customer.passwordHash || !verifyPassword(parsed.data.password, customer.passwordHash)) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }
  await createCustomerSession(customer.id);
  return NextResponse.json({ ok: true });
}
