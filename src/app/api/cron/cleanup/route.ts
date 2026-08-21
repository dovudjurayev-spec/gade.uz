import { lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { otpCodes, sessions } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "");
  const headerToken = req.headers.get("x-cron-token") ?? "";
  const queryToken = new URL(req.url).searchParams.get("token") ?? "";
  const token = bearer || headerToken || queryToken;
  if (!process.env.CRON_TOKEN || token !== process.env.CRON_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startedAt = Date.now();

  const [deletedOtp, deletedSessions] = await Promise.all([
    db.delete(otpCodes).where(lt(otpCodes.expiresAt, now)).returning({ id: otpCodes.id }),
    db.delete(sessions).where(lt(sessions.expiresAt, now)).returning({ id: sessions.id }),
  ]);

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    otpDeleted: deletedOtp.length,
    sessionsDeleted: deletedSessions.length,
  });
}

export const POST = GET;
