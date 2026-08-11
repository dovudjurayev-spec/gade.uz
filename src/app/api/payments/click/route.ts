import { NextResponse } from "next/server";
import { handleClickCallback, type ClickCallback } from "@/services/payments/click/handler";

export const dynamic = "force-dynamic";

// Click отправляет x-www-form-urlencoded
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  let payload: Record<string, string> = {};

  if (contentType.includes("application/json")) {
    payload = (await req.json()) as Record<string, string>;
  } else {
    const form = await req.formData();
    for (const [k, v] of form.entries()) payload[k] = String(v);
  }

  const response = await handleClickCallback(payload as unknown as ClickCallback);
  return NextResponse.json(response);
}
