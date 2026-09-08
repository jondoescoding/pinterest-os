import type * as schema from "@/lib/db/schema";
import { fitSetItems, fitSets, usedProducts } from "@/lib/db/schema";
import type { CandidateSet } from "@/lib/fits/types";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

type Db = LibSQLDatabase<typeof schema>;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export async function insertDraftSet(db: Db, set: CandidateSet): Promise<void> {
  const now = nowSeconds();
  await db.insert(fitSets).values({
    id: set.id,
    slug: set.slug,
    themeSlug: set.themeSlug,
    title: set.title,
    blurb: set.blurb,
    status: "draft",
    productHash: set.productHash,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(fitSetItems).values(
    set.items.map((item) => ({
      id: crypto.randomUUID(),
      setId: set.id,
      slot: item.slot,
      channel3ProductId: item.channel3ProductId,
      title: item.title,
      brand: item.brand,
      price: item.price,
      currency: item.currency,
      buyUrl: item.buyUrl,
      imageUrl: item.imageUrl,
      copy: item.copy,
      position: item.position,
    })),
  );
  await db
    .insert(usedProducts)
    .values(
      set.items.map((item) => ({
        channel3ProductId: item.channel3ProductId,
        lastUsedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: usedProducts.channel3ProductId,
      set: { lastUsedAt: now },
    });
}

export async function markSetPublished(
  db: Db,
  setId: string,
  patch: { collageUrl: string | null; pinId: string | null },
): Promise<void> {
  const now = nowSeconds();
  await db
    .update(fitSets)
    .set({
      status: "published",
      collageUrl: patch.collageUrl,
      pinId: patch.pinId,
      publishedAt: now,
      updatedAt: now,
      failureReason: null,
    })
    .where(eq(fitSets.id, setId));
}

export async function markSetFailed(
  db: Db,
  setId: string,
  reason: string,
): Promise<void> {
  await db
    .update(fitSets)
    .set({
      status: "failed",
      failureReason: reason.slice(0, 500),
      updatedAt: nowSeconds(),
    })
    .where(eq(fitSets.id, setId));
}
