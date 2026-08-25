export type ProductListItem = {
  id: number;
  slug: string;
  sku: string;
  name: string;
  volume: string | null;
  priceTiyin: number;
  oldPriceTiyin: number | null;
  stock: number;
  isNew: boolean;
  isFeatured: boolean;
  image: string | null;
  imageFit: "contain" | "cover";
  brandLine: string | null;
  shortDescription: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
};

export type ProductDetail = ProductListItem & {
  description: string | null;
  ingredients: string | null;
  usage: string | null;
  hairType: string | null;
  skinType: string | null;
  images: string[];
  categoryName: string | null;
  categorySlug: string | null;
  brandLineSlug: string | null;
};

export type CategoryNode = {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
};

export type ProductFilters = {
  categorySlug?: string;
  brandLineSlug?: string;
  inStock?: boolean;
  onSale?: boolean;
  minTiyin?: number;
  maxTiyin?: number;
  sort?: "popular" | "new" | "price_asc" | "price_desc";
  q?: string;
  limit?: number;
  offset?: number;
};
