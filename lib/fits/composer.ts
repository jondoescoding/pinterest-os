import type { Channel3Product, PublishableProduct } from "@/lib/channel3";
import { channel3Search } from "@/lib/channel3";
import { filterPublishable, matchesPalette } from "@/lib/fits/filters";
import { pickSeeded } from "@/lib/fits/random";
import type {
  CandidateSet,
  CandidateSetItem,
  ComposeSetResult,
  FitSlot,
  FitTheme,
} from "@/lib/fits/types";
import { productHash } from "./dedupe";

export interface ComposeSetDeps {
  search?: (
    query: string,
    opts: { limit: number },
  ) => Promise<Channel3Product[]>;
  isRecentlyUsed?: (channel3ProductId: string) => Promise<boolean>;
  hasProductHash?: (hash: string) => Promise<boolean>;
}

export interface ComposeSetOptions {
  date: string;
  runIndex: number;
  theme: FitTheme;
  deps?: ComposeSetDeps;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function oneLine(product: PublishableProduct): string {
  const source =
    product.description ||
    product.keyFeatures.find((feature) => feature.trim()) ||
    product.title;
  return source.replace(/\s+/g, " ").trim().slice(0, 180);
}

function itemFromProduct(
  slot: FitSlot,
  product: PublishableProduct,
  position: number,
): CandidateSetItem {
  return {
    slot: slot.slot,
    channel3ProductId: product.id,
    title: product.title,
    brand: product.brand,
    price: product.offer.price,
    currency: product.offer.currency,
    buyUrl: product.offer.url,
    imageUrl: product.image.url,
    copy: oneLine(product),
    position,
  };
}

function titleFor(theme: FitTheme, items: CandidateSetItem[]): string {
  const hero = items
    .slice(0, 2)
    .map((item) => item.title)
    .join(" + ");
  return `${theme.name}: ${hero}`.slice(0, 100);
}

function orderedQueries(slot: FitSlot, seed: string): string[] {
  const first = pickSeeded(slot.queryVariants, `${seed}:${slot.slot}:query`);
  return [first, ...slot.queryVariants.filter((query) => query !== first)];
}

async function firstEligibleProduct(
  slot: FitSlot,
  theme: FitTheme,
  seed: string,
  deps: Required<Pick<ComposeSetDeps, "search">> & ComposeSetDeps,
  selectedProductIds: Set<string>,
): Promise<PublishableProduct | null> {
  for (const query of orderedQueries(slot, seed)) {
    const products = await deps.search(query, { limit: 25 });
    const filtered = filterPublishable(products, slot.priceBand).filter(
      (product) =>
        matchesPalette(product, theme.palette) &&
        !selectedProductIds.has(product.id),
    );
    for (const product of filtered) {
      if (await deps.isRecentlyUsed?.(product.id)) continue;
      return product;
    }
  }
  return null;
}

export async function composeSet({
  date,
  runIndex,
  theme,
  deps = {},
}: ComposeSetOptions): Promise<ComposeSetResult> {
  const search = deps.search ?? channel3Search;
  const seed = `${date}:${theme.slug}:${runIndex}`;
  const items: CandidateSetItem[] = [];
  const skipped: string[] = [];
  const selectedProductIds = new Set<string>();

  for (const slot of theme.slots) {
    try {
      const product = await firstEligibleProduct(
        slot,
        theme,
        seed,
        { ...deps, search },
        selectedProductIds,
      );
      if (!product) {
        const message = `${slot.slot}: no eligible product`;
        skipped.push(message);
        if (slot.required) {
          return {
            ok: false,
            reason: { code: "required_slot_empty", message },
            skipped,
          };
        }
        continue;
      }
      selectedProductIds.add(product.id);
      items.push(itemFromProduct(slot, product, items.length));
    } catch (err) {
      const message = `${slot.slot}: ${
        err instanceof Error ? err.message : String(err)
      }`;
      skipped.push(message);
      if (slot.required) {
        return {
          ok: false,
          reason: { code: "search_failed", message },
          skipped,
        };
      }
    }
  }

  if (items.length < 4) {
    return {
      ok: false,
      reason: {
        code: "set_too_small",
        message: `Only ${items.length} eligible products found`,
      },
      skipped,
    };
  }

  const hash = productHash(items.map((item) => item.channel3ProductId));
  if (await deps.hasProductHash?.(hash)) {
    return {
      ok: false,
      reason: {
        code: "duplicate_set",
        message: `Product combination already exists: ${hash}`,
      },
      skipped,
    };
  }

  const id = crypto.randomUUID();
  const title = titleFor(theme, items);
  const slug = slugify(`${theme.slug}-${date}-${runIndex}-${hash.slice(0, 8)}`);
  const set: CandidateSet = {
    id,
    slug,
    themeSlug: theme.slug,
    title,
    blurb: theme.blurbTemplate,
    productHash: hash,
    items,
  };
  return { ok: true, set, skipped };
}
