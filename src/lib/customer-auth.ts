import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { customers, passwordResetTokens, sessions } from "@/db/schema";
import { env } from "./env";
import { originAllowed } from "./csrf";

const COOKIE_NAME = "gade_customer";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 час

export type Customer = {
  id: number;
  phone: string | null;
  name: string | null;
  email: string | null;
  telegramId: number | null;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function findCustomerByEmail(email: string) {
  return db.query.customers.findFirst({ where: eq(customers.email, email) });
}

export async function createCustomerWithPassword(email: string, password: string, name?: string) {
  const inserted = await db
    .insert(customers)
    .values({ email, passwordHash: hashPassword(password), name: name ?? null })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("Failed to create customer");
  return row;
}

/**
 * Создаёт сессию. Возвращает sessionToken — тот же id, который лежит в куке;
 * для мини-аппа отдаётся клиенту в теле ответа и шлётся заголовком Authorization.
 *
 * crossSite=true — сессия создана из TMA (webview / iframe telegram-web):
 *   - кука ставится с SameSite=None, Secure, Partitioned (CHIPS);
 *   - в БД сохраняется флаг для последующей Origin-проверки в мутирующих запросах.
 */
export async function createCustomerSession(
  customerId: number,
  opts: { crossSite?: boolean } = {},
): Promise<{ sessionToken: string }> {
  const id = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const crossSite = opts.crossSite === true;
  await db.insert(sessions).values({ id, customerId, expiresAt, crossSite });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: crossSite ? "none" : "lax",
    secure: crossSite || env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    // Chrome CHIPS — без этого атрибута кука SameSite=None не долетит в iframe web.telegram.org.
    ...(crossSite ? { partitioned: true } : {}),
  });
  return { sessionToken: id };
}

async function readSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (fromCookie) return fromCookie;
  const hdrs = await headers();
  const auth = hdrs.get("authorization");
  if (!auth) return null;
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return m ? m[1]!.trim() : null;
}

export async function destroyCustomerSession(): Promise<void> {
  const id = await readSessionId();
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

async function loadSessionAndCustomer(
  sessionId: string,
): Promise<{ session: typeof sessions.$inferSelect; customer: typeof customers.$inferSelect } | null> {
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())),
  });
  if (!session) return null;
  const c = await db.query.customers.findFirst({ where: eq(customers.id, session.customerId) });
  if (!c) return null;
  return { session, customer: c };
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  const id = await readSessionId();
  if (!id) return null;
  const pair = await loadSessionAndCustomer(id);
  if (!pair) return null;
  const c = pair.customer;
  return { id: c.id, phone: c.phone, name: c.name, email: c.email, telegramId: c.telegramId };
}

/**
 * CSRF-контроль для мутирующих запросов.
 * Если текущая сессия — кросс-сайтовая (создана в TMA), заголовок Origin обязан
 * попадать в allowlist (свой домен + домены Telegram). Иначе — 403.
 * Для обычных SameSite=Lax сессий проверка no-op: браузер уже режет кросс-сайт куки.
 * Bearer-запросы автоматически безопасны — кука не отправляется автоматически.
 */
export async function assertMutatingCsrfOk(req: Request): Promise<{ ok: true } | { ok: false; reason: "origin" }> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionId) return { ok: true };
  const pair = await loadSessionAndCustomer(sessionId);
  if (!pair) return { ok: true };
  if (!pair.session.crossSite) return { ok: true };
  return originAllowed(req, true) ? { ok: true } : { ok: false, reason: "origin" };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(customerId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResetTokens).values({
    customerId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  return token;
}

export async function consumePasswordResetToken(token: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: "invalid" | "expired" }> {
  const row = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, hashToken(token)),
      isNull(passwordResetTokens.usedAt),
    ),
  });
  if (!row) return { ok: false, error: "invalid" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, error: "expired" };

  await db.transaction(async (tx) => {
    await tx.update(customers).set({ passwordHash: hashPassword(newPassword) }).where(eq(customers.id, row.customerId));
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  });
  return { ok: true };
}
