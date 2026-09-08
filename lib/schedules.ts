import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import {
  type NewSchedule,
  type Schedule,
  campaigns,
  contentItems,
  schedules,
} from "@/lib/db/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

export type ScheduleStatus = "pending" | "scheduled" | "posted" | "failed";

export type ScheduleWithContent = Schedule & {
  contentTitle: string | null;
  contentDescription: string | null;
  destinationUrl: string | null;
  imageUrl: string | null;
  contentState: string;
  campaignName: string | null;
  boardIntegrationId: string | null;
  boardName: string | null;
};

export async function findSchedule(
  contentId: string,
  scheduledAt: number,
): Promise<Schedule | undefined> {
  const rows = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.contentId, contentId),
        eq(schedules.scheduledAt, scheduledAt),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function ensureSchedule(
  contentId: string,
  scheduledAt: number,
): Promise<Schedule> {
  const existing = await findSchedule(contentId, scheduledAt);
  if (existing) return existing;

  const row: NewSchedule = {
    id: randomUUID(),
    contentId,
    scheduledAt,
    status: "pending",
  };
  const [created] = await db.insert(schedules).values(row).returning();
  return created;
}

export async function updateSchedule(
  id: string,
  patch: Partial<{ postizPostId: string | null; status: ScheduleStatus }>,
): Promise<Schedule | undefined> {
  const [updated] = await db
    .update(schedules)
    .set(patch)
    .where(eq(schedules.id, id))
    .returning();
  return updated;
}

export async function getSchedule(id: string): Promise<Schedule | undefined> {
  const rows = await db
    .select()
    .from(schedules)
    .where(eq(schedules.id, id))
    .limit(1);
  return rows[0];
}

export async function deleteSchedule(id: string): Promise<boolean> {
  const removed = await db
    .delete(schedules)
    .where(eq(schedules.id, id))
    .returning({ id: schedules.id });
  return removed.length > 0;
}

export async function countSchedulesForContent(
  contentId: string,
): Promise<number> {
  const rows = await db
    .select({ id: schedules.id })
    .from(schedules)
    .where(eq(schedules.contentId, contentId));
  return rows.length;
}

export async function listSchedules(): Promise<ScheduleWithContent[]> {
  const rows = await db
    .select({
      schedule: schedules,
      contentTitle: contentItems.title,
      contentDescription: contentItems.description,
      destinationUrl: contentItems.destinationUrl,
      imageUrl: contentItems.imageUrl,
      contentState: contentItems.state,
      campaignName: campaigns.name,
      boardIntegrationId: campaigns.boardIntegrationId,
      boardName: campaigns.boardName,
    })
    .from(schedules)
    .leftJoin(contentItems, eq(schedules.contentId, contentItems.id))
    .leftJoin(campaigns, eq(contentItems.campaignId, campaigns.id))
    .orderBy(asc(schedules.scheduledAt));

  return rows.map((r) => ({
    ...r.schedule,
    contentTitle: r.contentTitle,
    contentDescription: r.contentDescription,
    destinationUrl: r.destinationUrl,
    imageUrl: r.imageUrl,
    contentState: r.contentState ?? "draft",
    campaignName: r.campaignName,
    boardIntegrationId: r.boardIntegrationId,
    boardName: r.boardName,
  }));
}

export async function listSchedulesForContent(
  contentIds: string[],
): Promise<Schedule[]> {
  if (contentIds.length === 0) return [];
  return db
    .select()
    .from(schedules)
    .where(inArray(schedules.contentId, contentIds))
    .orderBy(desc(schedules.scheduledAt));
}
