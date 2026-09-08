import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import {
  type GenerationSet,
  type NewGenerationSet,
  campaigns,
  generationSets,
} from "@/lib/db/schema";
import { DEFAULT_DESTINATION_URL, DEFAULT_FAL_MODEL } from "@/lib/settings";
import { and, desc, eq } from "drizzle-orm";

export type GenerationSetStatus = "active" | "archived";
export type ScheduleUnit = "minutes" | "hours" | "days";

export interface GenerationSetItem {
  title: string;
  description: string;
  prompt: string;
}

export type GenerationSetWithCampaign = GenerationSet & {
  campaignName: string | null;
  boardName: string | null;
  boardIntegrationId: string | null;
  pinterestBoardId: string | null;
};

export interface GenerationSetInput {
  campaignId?: string | null;
  name: string;
  falModel?: string | null;
  destinationUrl?: string | null;
  scheduleStart?: number | null;
  scheduleInterval?: number | null;
  scheduleUnit?: ScheduleUnit | null;
  scheduleAfterSave?: boolean;
  items?: GenerationSetItem[];
  status?: GenerationSetStatus;
}

function cleanItems(items: GenerationSetItem[] = []): GenerationSetItem[] {
  return items
    .map((item) => ({
      title: item.title.trim(),
      description: item.description.trim(),
      prompt: item.prompt.trim(),
    }))
    .filter((item) => item.title || item.description || item.prompt);
}

function itemsJson(items?: GenerationSetItem[]): string {
  return JSON.stringify(cleanItems(items));
}

function normalizeInterval(value?: number | null): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(Number(value)));
}

function normalizeUnit(value?: ScheduleUnit | null): ScheduleUnit {
  return value === "minutes" || value === "hours" || value === "days"
    ? value
    : "days";
}

export function parseGenerationSetItems(value: string): GenerationSetItem[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return cleanItems(
      parsed.map((item) => {
        const row =
          typeof item === "object" && item !== null
            ? (item as Record<string, unknown>)
            : {};
        return {
          title: typeof row.title === "string" ? row.title : "",
          description:
            typeof row.description === "string" ? row.description : "",
          prompt: typeof row.prompt === "string" ? row.prompt : "",
        };
      }),
    );
  } catch {
    return [];
  }
}

export async function listGenerationSets(
  filters: {
    campaignId?: string;
  } = {},
): Promise<GenerationSetWithCampaign[]> {
  const conditions = [];
  if (filters.campaignId) {
    conditions.push(eq(generationSets.campaignId, filters.campaignId));
  }

  const rows = await db
    .select({
      set: generationSets,
      campaignName: campaigns.name,
      boardName: campaigns.boardName,
      boardIntegrationId: campaigns.boardIntegrationId,
      pinterestBoardId: campaigns.pinterestBoardId,
    })
    .from(generationSets)
    .leftJoin(campaigns, eq(generationSets.campaignId, campaigns.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(generationSets.updatedAt));

  return rows.map((row) => ({
    ...row.set,
    campaignName: row.campaignName,
    boardName: row.boardName,
    boardIntegrationId: row.boardIntegrationId,
    pinterestBoardId: row.pinterestBoardId,
  }));
}

export async function getGenerationSet(
  id: string,
): Promise<GenerationSet | undefined> {
  const rows = await db
    .select()
    .from(generationSets)
    .where(eq(generationSets.id, id))
    .limit(1);
  return rows[0];
}

export async function createGenerationSet(
  input: GenerationSetInput,
): Promise<GenerationSet> {
  const now = Math.floor(Date.now() / 1000);
  const row: NewGenerationSet = {
    id: randomUUID(),
    campaignId: input.campaignId ?? null,
    name: input.name.trim(),
    falModel: input.falModel || DEFAULT_FAL_MODEL,
    destinationUrl: input.destinationUrl ?? DEFAULT_DESTINATION_URL,
    scheduleStart: input.scheduleStart ?? null,
    scheduleInterval: normalizeInterval(input.scheduleInterval),
    scheduleUnit: normalizeUnit(input.scheduleUnit),
    scheduleAfterSave: input.scheduleAfterSave ?? false,
    itemsJson: itemsJson(input.items),
    status: input.status ?? "active",
    createdAt: now,
    updatedAt: now,
  };
  const [created] = await db.insert(generationSets).values(row).returning();
  return created;
}

export type UpdateGenerationSetInput = Partial<GenerationSetInput>;

export async function updateGenerationSet(
  id: string,
  input: UpdateGenerationSetInput,
): Promise<GenerationSet | undefined> {
  const patch: Partial<NewGenerationSet> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };
  if (input.campaignId !== undefined) patch.campaignId = input.campaignId;
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.falModel !== undefined) {
    patch.falModel = input.falModel || DEFAULT_FAL_MODEL;
  }
  if (input.destinationUrl !== undefined) {
    patch.destinationUrl = input.destinationUrl;
  }
  if (input.scheduleStart !== undefined)
    patch.scheduleStart = input.scheduleStart;
  if (input.scheduleInterval !== undefined) {
    patch.scheduleInterval = normalizeInterval(input.scheduleInterval);
  }
  if (input.scheduleUnit !== undefined) {
    patch.scheduleUnit = normalizeUnit(input.scheduleUnit);
  }
  if (input.scheduleAfterSave !== undefined) {
    patch.scheduleAfterSave = input.scheduleAfterSave;
  }
  if (input.items !== undefined) patch.itemsJson = itemsJson(input.items);
  if (input.status !== undefined) patch.status = input.status;

  const [updated] = await db
    .update(generationSets)
    .set(patch)
    .where(eq(generationSets.id, id))
    .returning();
  return updated;
}

export async function deleteGenerationSet(id: string): Promise<boolean> {
  const removed = await db
    .delete(generationSets)
    .where(eq(generationSets.id, id))
    .returning({ id: generationSets.id });
  return removed.length > 0;
}
