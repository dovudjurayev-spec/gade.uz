import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { verifyOrderToken } from "@/lib/order-token";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const t = new URL(req.url).searchParams.get("t");
  const order = await db.query.orders.findFirst({ where: eq(orders.number, number) });
  if (!order) return NextResponse.json({ ok: false }, { status: 404 });

  const current = await getCurrentCustomer();
  const isOwner = current?.id === order.customerId;
  if (!isOwner && !verifyOrderToken(order.number, t)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  return NextResponse.json({ ok: true, status: order.status });
}
