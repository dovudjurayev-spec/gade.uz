import { and, asc, desc, eq, gt, gte, ilike, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { brandLines, categories, products } from "@/db/schema";
import type { CategoryNode, ProductDetail, ProductFilters, ProductListItem } from "./types";

function firstImage(images: string[] | null | undefined): string | null {
  if (!images || images.length === 0) return null;
  return images[0] ?? null;
}

export async function listProducts(filters: ProductFilters = {}): Promise<ProductListItem[]> {
  const conditions = [eq(products.isVisible, true), isNull(products.deletedAt)];

  if (filters.categorySlug) {
    const cat = await db.query.categories.findFirst({
      where: eq(categories.slug, filters.categorySlug),
      columns: { id: true },
    });
    if (!cat) return [];
    conditions.push(eq(products.categoryId, cat.id));
  }

  if (filters.brandLineSlug) {
    const line = await db.query.brandLines.findFirst({
      where: eq(brandLines.slug, filters.brandLineSlug),
      columns: { id: true },
    });
    if (!line) return [];
    conditions.push(eq(products.brandLineId, line.id));
  }

  if (filters.inStock) conditions.push(gt(products.stock, 0));
  if (filters.onSale) conditions.push(isNotNull(products.oldPriceTiyin));
  if (typeof filters.minTiyin === "number") conditions.push(gte(products.priceTiyin, filters.minTiyin));
  if (typeof filters.maxTiyin === "number") conditions.push(lte(products.priceTiyin, filters.maxTiyin));
  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`;
    const qCond = or(ilike(products.name, term), ilike(products.sku, term));
    if (qCond) conditions.push(qCond);
  }

  const groupByCategory =
    (filters.sort === "popular" || !filters.sort) && !filters.categorySlug;

  const orderBy = (() => {
    switch (filters.sort) {
      case "price_asc": return [asc(products.priceTiyin)];
      case "price_desc": return [desc(products.priceTiyin)];
      case "new": return [desc(products.createdAt)];
      case "popular":
      default:
        return groupByCategory
          ? [asc(categories.sortOrder), asc(categories.name), desc(products.isFeatured), asc(products.name)]
          : [desc(products.isFeatured)];
    }
  })();

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      sku: products.sku,
      name: products.name,
      volume: products.volume,
      priceTiyin: products.priceTiyin,
      oldPriceTiyin: products.oldPriceTiyin,
      stock: products.stock,
      isNew: products.isNew,
      isFeatured: products.isFeatured,
      images: products.images,
      imageFit: products.imageFit,
      description: products.description,
      brandLine: brandLines.name,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .leftJoin(brandLines, eq(products.brandLineId, brandLines.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(filters.limit ?? 48)
    .offset(filters.offset ?? 0);

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    sku: r.sku,
    name: r.name,
    volume: r.volume,
    priceTiyin: r.priceTiyin,
    oldPriceTiyin: r.oldPriceTiyin,
    stock: r.stock,
    isNew: r.isNew,
    isFeatured: r.isFeatured,
    image: firstImage(r.images),
    imageFit: (r.imageFit === "cover" ? "cover" : "contain"),
    brandLine: r.brandLine,
    shortDescription: shortenDescription(r.description),
    categoryName: r.categoryName,
    categorySlug: r.categorySlug,
  }));
}

function shortenDescription(text: string | null | undefined, max = 90): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const row = await db
    .select({
      id: products.id,
      slug: products.slug,
      sku: products.sku,
      name: products.name,
      volume: products.volume,
      description: products.description,
      ingredients: products.ingredients,
      usage: products.usage,
      hairType: products.hairType,
      skinType: products.skinType,
      priceTiyin: products.priceTiyin,
      oldPriceTiyin: products.oldPriceTiyin,
      stock: products.stock,
      isNew: products.isNew,
      isFeatured: products.isFeatured,
      images: products.images,
      imageFit: products.imageFit,
      categoryName: categories.name,
      categorySlug: categories.slug,
      brandLineSlug: brandLines.slug,
      brandLine: brandLines.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brandLines, eq(products.brandLineId, brandLines.id))
    .where(and(eq(products.slug, slug), eq(products.isVisible, true), isNull(products.deletedAt)))
    .limit(1);

  const p = row[0];
  if (!p) return null;

  return {
    ...p,
    image: firstImage(p.images),
    imageFit: (p.imageFit === "cover" ? "cover" : "contain"),
    images: p.images ?? [],
    shortDescription: shortenDescription(p.description),
  };
}

export async function getFeaturedProducts(limit = 8): Promise<ProductListItem[]> {
  return listProducts({ sort: "popular", limit });
}

export async function getAllProductSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: products.slug })
    .from(products)
    .where(and(eq(products.isVisible, true), isNull(products.deletedAt)));
  return rows.map((r) => r.slug);
}

export async function countProducts(filters: ProductFilters = {}): Promise<number> {
  const conditions = [eq(products.isVisible, true), isNull(products.deletedAt)];

  if (filters.categorySlug) {
    const cat = await db.query.categories.findFirst({
      where: eq(categories.slug, filters.categorySlug),
      columns: { id: true },
    });
    if (!cat) return 0;
    conditions.push(eq(products.categoryId, cat.id));
  }

  if (filters.brandLineSlug) {
    const line = await db.query.brandLines.findFirst({
      where: eq(brandLines.slug, filters.brandLineSlug),
      columns: { id: true },
    });
    if (!line) return 0;
    conditions.push(eq(products.brandLineId, line.id));
  }

  if (filters.inStock) conditions.push(gt(products.stock, 0));
  if (filters.onSale) conditions.push(isNotNull(products.oldPriceTiyin));
  if (typeof filters.minTiyin === "number") conditions.push(gte(products.priceTiyin, filters.minTiyin));
  if (typeof filters.maxTiyin === "number") conditions.push(lte(products.priceTiyin, filters.maxTiyin));
  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`;
    const qCond = or(ilike(products.name, term), ilike(products.sku, term));
    if (qCond) conditions.push(qCond);
  }

  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(and(...conditions));
  return row?.n ?? 0;
}

export async function listCategories(): Promise<CategoryNode[]> {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(eq(categories.isVisible, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows;
}

export async function listCategoriesWithProducts(): Promise<CategoryNode[]> {
  const rows = await db
    .selectDistinct({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      parentId: categories.parentId,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .innerJoin(products, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(categories.isVisible, true),
        eq(products.isVisible, true),
        isNull(products.deletedAt),
      ),
    )
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows.map(({ id, slug, name, parentId }) => ({ id, slug, name, parentId }));
}
