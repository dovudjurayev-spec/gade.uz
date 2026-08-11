import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { formatPrice } from "@/lib/money";
import { ProductForm } from "./product-form";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditProduct({ params }: { params: Params }) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();
  const p = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!p) notFound();

  return (
    <div className="max-w-3xl">
      <div className="text-sm mb-2"><Link href="/admin/products" className="hover:underline">← Товары</Link></div>
      <h1 className="text-2xl mb-2">{p.name}</h1>
      <div className="text-sm text-neutral-500 mb-6">
        SKU {p.sku} · {formatPrice(p.priceTiyin)} · остаток {p.stock}
        <div className="mt-1 text-xs">Цена и остаток приходят из Billz — здесь не редактируются.</div>
      </div>

      <ProductForm
        product={{
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          ingredients: p.ingredients ?? "",
          usage: p.usage ?? "",
          hairType: p.hairType ?? "",
          skinType: p.skinType ?? "",
          images: p.images ?? [],
          isFeatured: p.isFeatured,
          isNew: p.isNew,
          isVisible: p.isVisible,
        }}
      />
    </div>
  );
}
