import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { customers, sessions } from "@/db/schema";
import { env } from "./env";

const COOKIE_NAME = "gade_customer";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней

export async function findOrCreateCustomer(phone: string): Promise<{ id: number; phone: string; name: string | null }> {
  const existing = await db.query.customers.findFirst({ where: eq(customers.phone, phone) });
  if (existing) return { id: existing.id, phone: existing.phone, name: existing.name };
  const inserted = await db.insert(customers).values({ phone }).returning();
  const row = inserted[0];
  if (!row) throw new Error("Failed to create customer");
  return { id: row.id, phone: row.phone, name: row.name };
}

export async function createCustomerSession(customerId: number): Promise<void> {
  const id = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, customerId, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function destroyCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  const id = cookieStore.get(COOKIE_NAME)?.value;
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentCustomer(): Promise<{ id: number; phone: string; name: string | null; email: string | null } | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(COOKIE_NAME)?.value;
  if (!id) return null;
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())),
  });
  if (!session) return null;
  const c = await db.query.customers.findFirst({ where: eq(customers.id, session.customerId) });
  if (!c) return null;
  return { id: c.id, phone: c.phone, name: c.name, email: c.email };
}
