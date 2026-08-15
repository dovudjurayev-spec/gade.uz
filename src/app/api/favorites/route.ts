import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { favorites } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ ids: [], authed: false });
  const rows = await db.query.favorites.findMany({
    where: eq(favorites.customerId, customer.id),
    columns: { productId: true },
  });
  return NextResponse.json({ ids: rows.map((r) => r.productId), authed: true });
}

export async function POST(req: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { productId?: number };
  const productId = Number(body.productId);
  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const existing = await db.query.favorites.findFirst({
    where: and(eq(favorites.customerId, customer.id), eq(favorites.productId, productId)),
  });

  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
    revalidatePath("/account/favorites");
    return NextResponse.json({ favorite: false });
  }

  await db.insert(favorites).values({ customerId: customer.id, productId });
  revalidatePath("/account/favorites");
  return NextResponse.json({ favorite: true });
}
