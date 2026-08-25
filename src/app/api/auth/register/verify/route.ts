import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { customers, emailVerifications } from "@/db/schema";
import { createCustomerSession, findCustomerByEmail, normalizeEmail } from "@/lib/customer-auth";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

function hashCode(code: string, email: string): string {
  return createHash("sha256").update(`${email}:${code}`).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);

  const row = await db.query.emailVerifications.findFirst({
    where: and(
      eq(emailVerifications.email, email),
      isNull(emailVerifications.usedAt),
      gt(emailVerifications.expiresAt, new Date()),
    ),
    orderBy: [desc(emailVerifications.createdAt)],
  });
  if (!row) return NextResponse.json({ ok: false, error: "no_code" }, { status: 400 });
  if (row.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 400 });
  }

  if (row.codeHash !== hashCode(parsed.data.code, email)) {
    await db
      .update(emailVerifications)
      .set({ attempts: sql`${emailVerifications.attempts} + 1` })
      .where(eq(emailVerifications.id, row.id));
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  // race protection: email might have been registered in another tab meanwhile
  const existing = await findCustomerByEmail(email);
  if (existing) {
    await db.update(emailVerifications).set({ usedAt: new Date() }).where(eq(emailVerifications.id, row.id));
    return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });
  }

  const inserted = await db
    .insert(customers)
    .values({ email, passwordHash: row.passwordHash, name: row.name })
    .returning({ id: customers.id });
  const customer = inserted[0];
  if (!customer) return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });

  await db.update(emailVerifications).set({ usedAt: new Date() }).where(eq(emailVerifications.id, row.id));

  await createCustomerSession(customer.id);
  return NextResponse.json({ ok: true });
}
