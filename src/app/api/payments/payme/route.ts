import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { handlePaymeRpc, type PaymeRpcRequest } from "@/services/payments/payme/handler";
import { PaymeError } from "@/services/payments/payme/errors";
import { getStoredPaymePassword } from "@/services/payments/payme/password-store";

export const dynamic = "force-dynamic";

// Basic auth: header "Basic base64(Paycom:MERCHANT_KEY)"
// Если в БД сохранён пароль (после ChangePassword) — принимаем только его.
// Иначе — fallback на env-ключи.
function mask(s: string | null | undefined): string {
  if (!s) return "<empty>";
  if (s.length <= 6) return `len=${s.length}`;
  return `${s.slice(0, 3)}…${s.slice(-3)} (len=${s.length})`;
}

async function verifyBasic(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Basic ")) {
    console.log("[payme-auth] missing/invalid header:", header?.slice(0, 20));
    return false;
  }
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const [login, pass] = decoded.split(":");
  if (login !== "Paycom" || !pass) {
    console.log("[payme-auth] bad login:", login);
    return false;
  }
  const stored = await getStoredPaymePassword();
  const ok = stored
    ? pass === stored
    : pass === env.PAYME_MERCHANT_KEY || pass === env.PAYME_TEST_KEY;
  console.log("[payme-auth]", {
    ok,
    got: mask(pass),
    stored: mask(stored),
    envKey: mask(env.PAYME_MERCHANT_KEY),
    envTest: mask(env.PAYME_TEST_KEY),
  });
  return ok;
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
