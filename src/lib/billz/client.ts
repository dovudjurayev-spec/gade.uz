const BASE_URL = "https://api-admin.billz.ai";
const REFRESH_PLATFORM_ID = "7d4a4c38-dd84-4902-b744-0488b80a4c01";
const THROTTLE_MS = 600;

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

let tokens: TokenPair | null = null;
let lastRequestAt = 0;

async function throttle() {
  const wait = lastRequestAt + THROTTLE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

async function login(): Promise<TokenPair> {
  const secret = process.env.BILLZ_SECRET_TOKEN;
  if (!secret) throw new Error("BILLZ_SECRET_TOKEN is not set");
  await throttle();
  const res = await fetch(`${BASE_URL}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ secret_token: secret }),
  });
  const json = (await res.json()) as {
    code: number;
    message: string;
    error: string | null;
    data: { access_token: string; refresh_token: string; expires_in: number } | null;
  };
  if (!res.ok || json.code !== 200 || !json.data) {
    throw new Error(`Billz login failed: ${json.message} ${json.error ?? ""}`);
  }
  return {
    accessToken: json.data.access_token,
    refreshToken: json.data.refresh_token,
    expiresAt: Date.now() + (json.data.expires_in - 60) * 1000,
  };
}

async function refresh(current: TokenPair): Promise<TokenPair> {
  await throttle();
  const res = await fetch(`${BASE_URL}/v2/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      "platform-id": REFRESH_PLATFORM_ID,
    },
    body: JSON.stringify({ refresh_token: current.refreshToken }),
  });
  if (!res.ok) return login();
  const json = (await res.json()) as {
    code: number;
    data: { access_token: string; refresh_token: string; expires_in: number } | null;
  };
  if (json.code !== 200 || !json.data) return login();
  return {
    accessToken: json.data.access_token,
    refreshToken: json.data.refresh_token,
    expiresAt: Date.now() + (json.data.expires_in - 60) * 1000,
  };
}

async function getToken(): Promise<string> {
  if (!tokens || tokens.expiresAt < Date.now()) {
    tokens = tokens ? await refresh(tokens) : await login();
  }
  return tokens.accessToken;
}

export async function billzFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let token = await getToken();
  const doFetch = async () => {
    await throttle();
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  let res = await doFetch();

  if (res.status === 401) {
    tokens = tokens ? await refresh(tokens) : await login();
    token = tokens.accessToken;
    res = await doFetch();
  }

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await doFetch();
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Billz ${path} ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

// --- Types ---

export type BillzShopMeasurement = {
  shop_id: string;
  shop_name: string;
  active_measurement_value: number;
};

export type BillzShopPrice = {
  shop_id: string;
  shop_name: string;
  retail_price: number;
  retail_currency: string;
  supply_price: number;
  promo_price: number;
  promos: unknown;
};

export type BillzCustomField = {
  custom_field_name: string;
  custom_field_system_name: string;
  custom_field_id: string;
  custom_field_value: string;
  from_parent?: boolean;
};

export type BillzProduct = {
  id: string;
  parent_id: string;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  brand_id: string;
  brand_name: string;
  categories: { id: string; name: string }[] | null;
  main_image_url_full: string;
  photos: { photo_url_full?: string; photo_url?: string }[] | null;
  updated_at: string;
  is_variative: boolean;
  shop_measurement_values: BillzShopMeasurement[] | null;
  shop_prices: BillzShopPrice[] | null;
  custom_fields?: BillzCustomField[] | null;
};

export function getCustomField(p: BillzProduct, systemName: string): string | null {
  const raw = p.custom_fields?.find(
    (f) => f.custom_field_system_name?.toUpperCase() === systemName.toUpperCase(),
  )?.custom_field_value;
  const v = typeof raw === "string" ? raw.trim() : "";
  return v.length > 0 ? v : null;
}

export type BillzProductsResponse = {
  count: number;
  products: BillzProduct[];
};

export async function fetchProductsPage(page: number, limit = 100) {
  return billzFetch<BillzProductsResponse>(
    `/v2/products?page=${page}&limit=${limit}`,
  );
}
