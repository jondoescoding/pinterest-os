import { parseScheduledAt, scheduleContentItem } from "@/lib/publish";

// POST /api/schedule - schedule one content item to its campaign's Pinterest board.
export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const contentId =
    typeof body.contentId === "string" ? body.contentId.trim() : "";
  const scheduledAt = parseScheduledAt(body.scheduledAt);
  if (!contentId) {
    return Response.json(
      { ok: false, error: "contentId is required" },
      { status: 400 },
    );
  }
  if (scheduledAt === null) {
    return Response.json(
      { ok: false, error: "scheduledAt must be an ISO date or unix timestamp" },
      { status: 400 },
    );
  }

  const result = await scheduleContentItem(contentId, scheduledAt);
  return Response.json(result, { status: result.ok ? 200 : result.status });
}
