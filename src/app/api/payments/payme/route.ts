import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { handlePaymeRpc, type PaymeRpcRequest } from "@/services/payments/payme/handler";
import { PaymeError } from "@/services/payments/payme/errors";

export const dynamic = "force-dynamic";

// Basic auth: header "Basic base64(Paycom:MERCHANT_KEY)"
function verifyBasic(req: Request): boolean {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Basic ")) return false;
  if (!env.PAYME_MERCHANT_KEY) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const [login, pass] = decoded.split(":");
  return login === "Paycom" && pass === env.PAYME_MERCHANT_KEY;
}

export async function POST(req: Request) {
  const body = (await req.json()) as PaymeRpcRequest;

  if (!verifyBasic(req)) {
    return NextResponse.json({
      id: body?.id ?? 0,
      error: { code: PaymeError.Unauthorized.code, message: PaymeError.Unauthorized.message },
    });
  }

  const result = await handlePaymeRpc(body);
  return NextResponse.json({ id: body.id, ...result });
}
