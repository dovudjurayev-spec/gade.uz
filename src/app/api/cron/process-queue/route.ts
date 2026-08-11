import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { processQueue } from "@/services/queue/processor";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const started = Date.now();
  const result = await processQueue();
  return NextResponse.json({ ...result, durationMs: Date.now() - started });
}
