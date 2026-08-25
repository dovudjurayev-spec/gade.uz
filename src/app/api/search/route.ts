import { NextResponse } from "next/server";
import { listProducts, listCategories } from "@/repositories/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ products: [], categories: [] });
  }

  const [products, cats] = await Promise.all([
    listProducts({ q, limit: 5 }),
    listCategories(),
  ]);

  const term = q.toLowerCase();
  const categories = cats
    .filter((c) => c.name.toLowerCase().includes(term))
    .slice(0, 3);

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      image: p.image,
      imageFit: p.imageFit,
      priceTiyin: p.priceTiyin,
      brandLine: p.brandLine,
    })),
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
  });
}
