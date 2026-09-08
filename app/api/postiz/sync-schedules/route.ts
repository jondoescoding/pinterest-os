import { listPosts } from "@/lib/postiz";
import { listSchedules, updateSchedule } from "@/lib/schedules";

function contentText(title: string | null, description: string | null): string {
  return [title, description]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n\n");
}

function sameSecond(iso: string | undefined, unixSeconds: number): boolean {
  if (!iso) return false;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return false;
  return Math.floor(parsed / 1000) === unixSeconds;
}

export async function POST(): Promise<Response> {
  const schedules = await listSchedules();
  const missing = schedules.filter(
    (schedule) => schedule.status === "scheduled" && !schedule.postizPostId,
  );
  if (missing.length === 0) {
    return Response.json({ ok: true, checked: schedules.length, updated: 0 });
  }

  const min = Math.min(...missing.map((schedule) => schedule.scheduledAt));
  const max = Math.max(...missing.map((schedule) => schedule.scheduledAt));
  const startDate = new Date((min - 24 * 60 * 60) * 1000).toISOString();
  const endDate = new Date((max + 24 * 60 * 60) * 1000).toISOString();
  const posts = await listPosts(startDate, endDate);
  let updated = 0;

  for (const schedule of missing) {
    const expected = contentText(
      schedule.contentTitle,
      schedule.contentDescription,
    );
    const match = posts.find(
      (post) =>
        post.id &&
        post.content === expected &&
        sameSecond(post.publishDate, schedule.scheduledAt) &&
        (!schedule.boardIntegrationId ||
          post.integration?.id === schedule.boardIntegrationId),
    );
    if (match) {
      await updateSchedule(schedule.id, {
        postizPostId: match.id,
        status: "scheduled",
      });
      updated += 1;
    }
  }

  return Response.json({
    ok: true,
    checked: missing.length,
    updated,
    remaining: missing.length - updated,
  });
}
