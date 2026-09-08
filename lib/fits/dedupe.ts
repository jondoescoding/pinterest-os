import { createHash } from "node:crypto";
import type * as schema from "@/lib/db/schema";
import { fitSets, usedProducts } from "@/lib/db/schema";
import { and, eq, gte } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

type Db = LibSQLDatabase<typeof schema>;

export function productHash(productIds: string[]): string {
  return createHash("sha256")
    .update([...productIds].sort().join("|"))
    .digest("hex");
}

export async function isProductRecentlyUsed(
  db: Db,
  channel3ProductId: string,
  days = 30,
  now = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const cutoff = now - days * 24 * 60 * 60;
  const rows = await db
    .select({ id: usedProducts.channel3ProductId })
    .from(usedProducts)
    .where(
      and(
        eq(usedProducts.channel3ProductId, channel3ProductId),
        gte(usedProducts.lastUsedAt, cutoff),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function hasProductHash(db: Db, hash: string): Promise<boolean> {
  const rows = await db
    .select({ id: fitSets.id })
    .from(fitSets)
    .where(eq(fitSets.productHash, hash))
    .limit(1);
  return rows.length > 0;
}
