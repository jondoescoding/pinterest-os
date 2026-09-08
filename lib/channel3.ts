import type { PriceBand } from "@/lib/fits/types";

const CHANNEL3_SEARCH_URL = "https://api.trychannel3.com/v1/search";

export interface Channel3Brand {
  id?: string;
  name?: string;
}

export interface Channel3Image {
  url?: string;
  is_main_image?: boolean;
  is_cleaned_image?: boolean;
  shot_type?: string;
  alt_text?: string;
}

export interface Channel3Offer {
  url?: string;
  domain?: string;
  price?: {
    price?: number | string;
    currency?: string;
  };
  availability?: string;
  condition?: string;
  max_commission_rate?: number | string;
}

export interface Channel3Product {
  id?: string;
  title?: string;
  description?: string;
  key_features?: string[];
  materials?: string[];
  brands?: Channel3Brand[];
  images?: Channel3Image[];
  categories?: string[];
  offers?: Channel3Offer[];
}

export interface Channel3SearchOptions {
  limit?: number;
}

export interface PublishableProduct {
  id: string;
  title: string;
  description: string;
  keyFeatures: string[];
  brand: string | null;
  offer: {
    url: string;
    price: number;
    currency: string;
    maxCommissionRate: number;
  };
  image: {
    url: string;
    altText: string | null;
  };
  raw: Channel3Product;
}

function apiKey(): string {
  const key = process.env.CHANNEL3_API_KEY;
  if (!key) throw new Error("CHANNEL3_API_KEY is not set");
  return key;
}

function productsFromBody(body: unknown): Channel3Product[] {
  if (typeof body !== "object" || body === null) return [];
  if ("products" in body && Array.isArray(body.products)) {
    return body.products as Channel3Product[];
  }
  if (
    "data" in body &&
    typeof body.data === "object" &&
    body.data !== null &&
    "products" in body.data &&
    Array.isArray(body.data.products)
  ) {
    return body.data.products as Channel3Product[];
  }
  if ("results" in body && Array.isArray(body.results)) {
    return body.results as Channel3Product[];
  }
  return [];
}

async function requestSearch(
  query: string,
  options: Channel3SearchOptions,
): Promise<Channel3Product[]> {
  const res = await fetch(CHANNEL3_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey(),
    },
    body: JSON.stringify({
      query,
      limit: options.limit ?? 25,
    }),
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`Channel3 search failed (${res.status}): ${detail}`);
  }
  return productsFromBody(body);
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function channel3Search(
  query: string,
  options: Channel3SearchOptions = {},
): Promise<Channel3Product[]> {
  let last: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await requestSearch(query, options);
    } catch (err) {
      if (err instanceof Error && err.message.includes("CHANNEL3_API_KEY")) {
        throw err;
      }
      last = err;
      if (attempt < 3) await wait(attempt * 750);
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export function numberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function choosePublishableOffer(
  offers: Channel3Offer[] | undefined,
  band: PriceBand,
): PublishableProduct["offer"] | null {
  for (const offer of offers ?? []) {
    if (offer.availability !== "InStock") continue;
    const price = numberFrom(offer.price?.price);
    const commission = numberFrom(offer.max_commission_rate);
    if (price === null || commission === null) continue;
    if (commission <= 0) continue;
    if (price < band.min || price > band.max) continue;
    if (!offer.url) continue;
    return {
      url: offer.url,
      price,
      currency: offer.price?.currency ?? "USD",
      maxCommissionRate: commission,
    };
  }
  return null;
}

export function chooseCleanedImage(
  images: Channel3Image[] | undefined,
): PublishableProduct["image"] | null {
  const image = (images ?? []).find(
    (item) => item.is_cleaned_image && item.url,
  );
  if (!image?.url) return null;
  return { url: image.url, altText: image.alt_text ?? null };
}
