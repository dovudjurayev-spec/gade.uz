import { NextResponse } from "next/server";
import { assertMutatingCsrfOk, destroyCustomerSession } from "@/lib/customer-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const csrf = await assertMutatingCsrfOk(req);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: "forbidden_origin" }, { status: 403 });
  await destroyCustomerSession();
  return NextResponse.json({ ok: true });
}
