import {
  type Channel3Product,
  type PublishableProduct,
  chooseCleanedImage,
  choosePublishableOffer,
} from "@/lib/channel3";
import type { PriceBand } from "@/lib/fits/types";

function productId(product: Channel3Product): string | null {
  return product.id?.trim() || null;
}

function productTitle(product: Channel3Product): string | null {
  return product.title?.trim() || null;
}

export function filterPublishable(
  products: Channel3Product[],
  priceBand: PriceBand,
): PublishableProduct[] {
  const publishable: PublishableProduct[] = [];
  for (const product of products) {
    const id = productId(product);
    const title = productTitle(product);
    if (!id || !title) continue;
    const offer = choosePublishableOffer(product.offers, priceBand);
    const image = chooseCleanedImage(product.images);
    if (!offer || !image) continue;
    publishable.push({
      id,
      title,
      description: product.description?.trim() ?? "",
      keyFeatures: product.key_features ?? [],
      brand: product.brands?.find((brand) => brand.name)?.name ?? null,
      offer,
      image,
      raw: product,
    });
  }
  return publishable;
}

export function matchesPalette(
  product: PublishableProduct,
  palette: string[],
): boolean {
  if (palette.length === 0) return true;
  const haystack = [
    product.title,
    product.description,
    product.brand,
    product.image.altText,
    ...product.keyFeatures,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return palette.some((color) => haystack.includes(color.toLowerCase()));
}
