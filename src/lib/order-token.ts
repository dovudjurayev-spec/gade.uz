import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

// Derive a secret: prefer ORDER_TOKEN_SECRET, fall back to ADMIN_SESSION_SECRET.
// Both are validated as min(32) in env schema.
function getSecret(): string | null {
  return env.ORDER_TOKEN_SECRET || env.ADMIN_SESSION_SECRET || null;
}

export function signOrderNumber(number: string): string {
  const secret = getSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(number).digest("base64url").slice(0, 24);
}

export function verifyOrderToken(number: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = signOrderNumber(number);
  if (!expected || expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}
