import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE_NAME = "gade_admin";
const MAX_AGE_SEC = 60 * 60 * 8; // 8ч

// Формат hash: scrypt$<salt_hex>$<hash_hex>
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

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// Cookie: base64url(payload).signature, payload = login:expiresAt
export async function createAdminSession(login: string): Promise<void> {
  if (!env.ADMIN_SESSION_SECRET) throw new Error("ADMIN_SESSION_SECRET is not set");
  const expiresAt = Date.now() + MAX_AGE_SEC * 1000;
  const payload = Buffer.from(`${login}:${expiresAt}`).toString("base64url");
  const sig = sign(payload, env.ADMIN_SESSION_SECRET);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<{ login: string } | null> {
  if (!env.ADMIN_SESSION_SECRET) return null;
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload, env.ADMIN_SESSION_SECRET);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  const [login, expiresStr] = decoded.split(":");
  if (!login || !expiresStr) return null;
  if (Number(expiresStr) < Date.now()) return null;
  return { login };
}

export async function requireAdmin(): Promise<{ login: string }> {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
