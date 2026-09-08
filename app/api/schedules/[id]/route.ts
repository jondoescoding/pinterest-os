import { getContent, updateContent } from "@/lib/content";
import { deletePost } from "@/lib/postiz";
import {
  countSchedulesForContent,
  deleteSchedule,
  getSchedule,
} from "@/lib/schedules";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/schedules/[id] - unschedule from Postiz, then remove local mirror.
export async function DELETE(
  _req: Request,
  { params }: Ctx,
): Promise<Response> {
  const { id } = await params;
  const schedule = await getSchedule(id);
  if (!schedule) {
    return Response.json(
      { ok: false, error: "Schedule not found" },
      { status: 404 },
    );
  }

  try {
    if (schedule.postizPostId) {
      await deletePost(schedule.postizPostId);
    }
    await deleteSchedule(schedule.id);
    const remaining = await countSchedulesForContent(schedule.contentId);
    const content = await getContent(schedule.contentId);
    if (content && remaining === 0 && content.state === "scheduled") {
      await updateContent(content.id, { state: "draft" });
    }
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
