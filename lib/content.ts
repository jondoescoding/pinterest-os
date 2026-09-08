// Content-item query helpers over Drizzle. Keeps route handlers + the page thin.
import { randomUUID } from "node:crypto";
import type { ContentState } from "@/lib/content-state";
import { db } from "@/lib/db/client";
import {
  type ContentItem,
  type NewContentItem,
  campaigns,
  contentItems,
} from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export type { ContentState };

// A content row plus the campaign name (LEFT JOIN), so the library can show it.
export type ContentItemWithCampaign = ContentItem & {
  campaignName: string | null;
};

export interface ContentFilters {
  campaignId?: string;
  state?: ContentState;
}

// List content items (newest first), optionally filtered by campaign / state.
// Surfaces the campaign name via a LEFT JOIN.
export async function listContent(
  filters: ContentFilters = {},
): Promise<ContentItemWithCampaign[]> {
  const conditions = [];
  if (filters.campaignId !== undefined) {
    conditions.push(eq(contentItems.campaignId, filters.campaignId));
  }
  if (filters.state !== undefined) {
    conditions.push(eq(contentItems.state, filters.state));
  }

  const rows = await db
    .select({
      item: contentItems,
      campaignName: campaigns.name,
    })
    .from(contentItems)
    .leftJoin(campaigns, eq(contentItems.campaignId, campaigns.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(contentItems.createdAt));

  return rows.map((r) => ({ ...r.item, campaignName: r.campaignName }));
}

// Fetch one content item by id, or undefined if absent.
export async function getContent(id: string): Promise<ContentItem | undefined> {
  const rows = await db
    .select()
    .from(contentItems)
    .where(eq(contentItems.id, id))
    .limit(1);
  return rows[0];
}

export interface CreateContentInput {
  title?: string | null;
  description?: string | null;
  destinationUrl?: string | null;
  imageUrl?: string | null;
  campaignId?: string | null;
  imagePrompt?: string | null;
  falModel?: string | null;
  state?: ContentState;
}

// Create a content item; id is generated here so callers stay simple.
export async function createContent(
  input: CreateContentInput,
): Promise<ContentItem> {
  const row: NewContentItem = {
    id: randomUUID(),
    title: input.title ?? null,
    description: input.description ?? null,
    destinationUrl: input.destinationUrl ?? null,
    imageUrl: input.imageUrl ?? null,
    campaignId: input.campaignId ?? null,
    imagePrompt: input.imagePrompt ?? null,
    falModel: input.falModel ?? null,
    state: input.state ?? "draft",
  };
  const [created] = await db.insert(contentItems).values(row).returning();
  return created;
}

// Fields a PATCH may touch. Only provided keys are applied.
export type UpdateContentInput = Partial<{
  title: string | null;
  description: string | null;
  destinationUrl: string | null;
  imageUrl: string | null;
  campaignId: string | null;
  imagePrompt: string | null;
  falModel: string | null;
  state: ContentState;
}>;

// Update an existing content item; returns the updated row or undefined if absent.
export async function updateContent(
  id: string,
  patch: UpdateContentInput,
): Promise<ContentItem | undefined> {
  const [updated] = await db
    .update(contentItems)
    .set(patch)
    .where(eq(contentItems.id, id))
    .returning();
  return updated;
}

// Delete a content item; returns true if a row was removed.
export async function deleteContent(id: string): Promise<boolean> {
  const removed = await db
    .delete(contentItems)
    .where(eq(contentItems.id, id))
    .returning({ id: contentItems.id });
  return removed.length > 0;
}
