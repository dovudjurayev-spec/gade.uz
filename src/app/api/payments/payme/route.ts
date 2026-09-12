import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { handlePaymeRpc, type PaymeRpcRequest } from "@/services/payments/payme/handler";
import { PaymeError } from "@/services/payments/payme/errors";
import { getStoredPaymePassword } from "@/services/payments/payme/password-store";

export const dynamic = "force-dynamic";

// Basic auth: header "Basic base64(Paycom:MERCHANT_KEY)"
// Если в БД сохранён пароль (после ChangePassword) — принимаем только его.
// Иначе — fallback на env-ключи.
async function verifyBasic(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const [login, pass] = decoded.split(":");
  if (login !== "Paycom" || !pass) return false;
  const stored = await getStoredPaymePassword();
  if (stored) return pass === stored;
  return pass === env.PAYME_MERCHANT_KEY || pass === env.PAYME_TEST_KEY;
}

export async function POST(req: Request) {
  let body: PaymeRpcRequest | null = null;
  try {
    body = (await req.json()) as PaymeRpcRequest;
  } catch {
    body = null;
  }

  if (!(await verifyBasic(req))) {
    return NextResponse.json({
      id: body?.id ?? 0,
      error: {
        code: PaymeError.Unauthorized.code,
        message: PaymeError.Unauthorized.message,
        data: "authorization",
      },
    });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({
      id: 0,
      error: {
        code: PaymeError.Unauthorized.code,
        message: PaymeError.Unauthorized.message,
        data: "body",
      },
    });
  }

  const result = await handlePaymeRpc(body);
  return NextResponse.json({ id: body.id, ...result });
}
