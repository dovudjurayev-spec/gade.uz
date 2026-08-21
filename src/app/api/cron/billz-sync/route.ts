import { NextResponse } from "next/server";
import { syncBillzCatalog } from "@/lib/billz/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "") || new URL(req.url).searchParams.get("token") || "";
  if (!process.env.CRON_TOKEN || token !== process.env.CRON_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const result = await syncBillzCatalog();
    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startedAt,
      ...result,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message, durationMs: Date.now() - startedAt },
      { status: 500 },
    );
  }
}

export const POST = GET;
