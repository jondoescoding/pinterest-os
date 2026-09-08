// Campaign query helpers over Drizzle. Keeps route handlers + the page thin.
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import { type Campaign, type NewCampaign, campaigns } from "@/lib/db/schema";
import { desc, eq, or } from "drizzle-orm";

export type CampaignStatus = "active" | "archived";

// List all campaigns, newest first.
export function listCampaigns(): Promise<Campaign[]> {
  return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
}

// Fetch one campaign by id, or undefined if absent.
export async function getCampaign(id: string): Promise<Campaign | undefined> {
  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1);
  return rows[0];
}

export async function findCampaignByNameOrBoard(
  name: string,
  boardIntegrationId: string | null,
): Promise<Campaign | undefined> {
  const conditions = [eq(campaigns.name, name)];
  if (boardIntegrationId) {
    conditions.push(eq(campaigns.boardIntegrationId, boardIntegrationId));
  }
  const rows = await db
    .select()
    .from(campaigns)
    .where(or(...conditions))
    .limit(1);
  return rows[0];
}

export interface CreateCampaignInput {
  name: string;
  boardIntegrationId?: string | null;
  pinterestBoardId?: string | null;
  boardName?: string | null;
}

// Create a campaign; id is generated here so callers stay simple.
export async function createCampaign(
  input: CreateCampaignInput,
): Promise<Campaign> {
  const row: NewCampaign = {
    id: randomUUID(),
    name: input.name,
    boardIntegrationId: input.boardIntegrationId ?? null,
    pinterestBoardId: input.pinterestBoardId ?? null,
    boardName: input.boardName ?? null,
  };
  const [created] = await db.insert(campaigns).values(row).returning();
  return created;
}

// Fields a PATCH may touch. Only provided keys are applied.
export type UpdateCampaignInput = Partial<{
  name: string;
  boardIntegrationId: string | null;
  pinterestBoardId: string | null;
  boardName: string | null;
  status: CampaignStatus;
}>;

// Update an existing campaign; returns the updated row or undefined if absent.
export async function updateCampaign(
  id: string,
  patch: UpdateCampaignInput,
): Promise<Campaign | undefined> {
  const [updated] = await db
    .update(campaigns)
    .set(patch)
    .where(eq(campaigns.id, id))
    .returning();
  return updated;
}

// Delete a campaign; returns true if a row was removed.
export async function deleteCampaign(id: string): Promise<boolean> {
  const removed = await db
    .delete(campaigns)
    .where(eq(campaigns.id, id))
    .returning({ id: campaigns.id });
  return removed.length > 0;
}
