import { and, asc, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { brandLines, categories, products } from "@/db/schema";
import type { CategoryNode, ProductDetail, ProductFilters, ProductListItem } from "./types";

function firstImage(images: string[] | null | undefined): string | null {
  if (!images || images.length === 0) return null;
  return images[0] ?? null;
}

async function resolveCategoryIds(slug: string): Promise<number[]> {
  const cat = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
    columns: { id: true },
  });
  if (!cat) return [];
  // Рекурсивно собираем всё поддерево категории (L2 и L3).
  const all = await db
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories);
  const childrenOf = new Map<number, number[]>();
  for (const c of all) {
    if (c.parentId != null) {
      const arr = childrenOf.get(c.parentId) ?? [];
      arr.push(c.id);
      childrenOf.set(c.parentId, arr);
    }
  }
  const result: number[] = [];
  const stack = [cat.id];
  while (stack.length) {
    const id = stack.pop()!;
    result.push(id);
    for (const child of childrenOf.get(id) ?? []) stack.push(child);
  }
  return result;
}

export async function listProducts(filters: ProductFilters = {}): Promise<ProductListItem[]> {
  const conditions = [eq(products.isVisible, true), isNull(products.deletedAt)];

  if (filters.categorySlug) {
    const ids = await resolveCategoryIds(filters.categorySlug);
    if (ids.length === 0) return [];
    conditions.push(inArray(products.categoryId, ids));
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
      case "random": return [sql`RANDOM()`];
      case "popular":
      default:
        return groupByCategory
          ? [
              sql`COALESCE(parent_categories.sort_order, categories.sort_order) ASC`,
              sql`COALESCE(parent_categories.name, categories.name) ASC`,
              asc(categories.sortOrder),
              asc(categories.name),
              asc(products.name),
            ]
          : [asc(categories.sortOrder), asc(categories.name), asc(products.name)];
    }
  })();

  // rootCategoryName/Slug — используем для группировки в каталоге, чтобы
  // подкатегории (Кисти/Спонжи/…) сворачивались под корень (Аксессуары).
  const parentCategories = alias(categories, "parent_categories");
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
      categoryId: products.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      rootCategoryName: parentCategories.name,
      rootCategorySlug: parentCategories.slug,
    })
    .from(products)
    .leftJoin(brandLines, eq(products.brandLineId, brandLines.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(parentCategories, eq(categories.parentId, parentCategories.id))
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
    categoryName: r.rootCategoryName ?? r.categoryName,
    categorySlug: r.rootCategorySlug ?? r.categorySlug,
    leafCategoryName: r.categoryName,
    leafCategorySlug: r.categorySlug,
    categoryId: r.categoryId,
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
  return listProducts({ sort: "random", limit });
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
    const ids = await resolveCategoryIds(filters.categorySlug);
    if (ids.length === 0) return 0;
    conditions.push(inArray(products.categoryId, ids));
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

export async function listCategories(options: { includeSubcategories?: boolean } = {}): Promise<CategoryNode[]> {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(
      options.includeSubcategories
        ? eq(categories.isVisible, true)
        : and(eq(categories.isVisible, true), isNull(categories.parentId))!,
    )
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows;
}

export async function listCategoriesWithProducts(): Promise<CategoryNode[]> {
  // Возвращает только корневые категории, у которых есть видимые товары
  // напрямую или через подкатегории.
  const rows = await db.execute(sql`
    SELECT DISTINCT c.id, c.slug, c.name, c.parent_id AS "parentId", c.sort_order
    FROM categories c
    WHERE c.is_visible = true
      AND c.parent_id IS NULL
      AND EXISTS (
        SELECT 1 FROM products p
        LEFT JOIN categories sub ON sub.id = p.category_id
        WHERE p.is_visible = true
          AND p.deleted_at IS NULL
          AND (p.category_id = c.id OR sub.parent_id = c.id)
      )
    ORDER BY c.sort_order ASC, c.name ASC
  `);
  return (rows as unknown as Array<{ id: number; slug: string; name: string; parentId: number | null }>).map(
    ({ id, slug, name, parentId }) => ({ id, slug, name, parentId }),
  );
}
