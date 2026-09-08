import { getCampaign } from "@/lib/campaigns";
import { getContent, updateContent } from "@/lib/content";
import { type PostizMedia, createPost, listPosts } from "@/lib/postiz";
import { ensureSchedule, updateSchedule } from "@/lib/schedules";
import { getSettings } from "@/lib/settings";

export function parseScheduledAt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 2_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }
  if (typeof value !== "string" || value.trim() === "") return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

function contentBody(title: string | null, description: string | null): string {
  return [title, description]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function extractPostizPostId(body: unknown): string | null {
  if (Array.isArray(body)) {
    for (const item of body) {
      const id = extractPostizPostId(item);
      if (id) return id;
    }
    return null;
  }
  if (typeof body !== "object" || body === null) return null;
  if ("id" in body && typeof body.id === "string") return body.id;
  if ("postId" in body && typeof body.postId === "string") return body.postId;
  if ("posts" in body && Array.isArray(body.posts)) {
    for (const post of body.posts) {
      const id = extractPostizPostId(post);
      if (id) return id;
    }
  }
  if ("data" in body) return extractPostizPostId(body.data);
  return null;
}

export async function scheduleContentItem(
  contentId: string,
  scheduledAt: number,
  uploadedImages: PostizMedia[] = [],
  recoverExistingPost = true,
  target: {
    boardIntegrationId?: string | null;
    pinterestBoardId?: string | null;
  } = {},
) {
  const content = await getContent(contentId);
  if (!content) {
    return {
      ok: false as const,
      status: 404,
      error: `Content item ${contentId} was not found`,
    };
  }
  if (!content.imageUrl) {
    return {
      ok: false as const,
      status: 400,
      error: "Content item needs an imageUrl before scheduling",
    };
  }
  if (!content.campaignId) {
    return {
      ok: false as const,
      status: 400,
      error: "Content item needs a campaign before scheduling",
    };
  }

  const [campaign, settings] = await Promise.all([
    getCampaign(content.campaignId),
    getSettings(),
  ]);
  const boardIntegrationId =
    target.boardIntegrationId ??
    campaign?.boardIntegrationId ??
    settings.targetBoardIntegrationId;
  const pinterestBoardId =
    target.pinterestBoardId ??
    campaign?.pinterestBoardId ??
    settings.targetPinterestBoardId;
  if (!boardIntegrationId) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Campaign needs a Pinterest integration/Postiz integration before scheduling",
    };
  }
  if (!pinterestBoardId) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Campaign needs a Pinterest board ID before scheduling. Copy it from Postiz/Pinterest into Settings or Campaigns.",
    };
  }

  const text = contentBody(content.title, content.description);
  if (!text) {
    return {
      ok: false as const,
      status: 400,
      error: "Content item needs a title or description",
    };
  }

  const schedule = await ensureSchedule(content.id, scheduledAt);
  if (schedule.status === "scheduled" && schedule.postizPostId) {
    return { ok: true as const, schedule, idempotent: true };
  }

  try {
    // Recover a post created by an earlier attempt whose response was lost
    // before the local Postiz id could be stored.
    const scheduledIso = new Date(scheduledAt * 1000).toISOString();
    const nearbyPosts = recoverExistingPost
      ? await listPosts(
          new Date((scheduledAt - 60) * 1000).toISOString(),
          new Date((scheduledAt + 60) * 1000).toISOString(),
        )
      : [];
    const existingPost = nearbyPosts.find(
      (post) =>
        post.title?.trim() === content.title?.trim() &&
        post.integration?.id === boardIntegrationId &&
        post.publishDate &&
        Math.floor(Date.parse(post.publishDate) / 1000) === scheduledAt,
    );
    if (existingPost?.id) {
      const recovered = await updateSchedule(schedule.id, {
        postizPostId: existingPost.id,
        status: "scheduled",
      });
      const recoveredContent = await updateContent(content.id, {
        state: "scheduled",
      });
      return {
        ok: true as const,
        schedule: recovered ?? schedule,
        contentItem: recoveredContent,
        postizPostId: existingPost.id,
        idempotent: true,
      };
    }

    const postizResponse = await createPost({
      integrationId: boardIntegrationId,
      boardId: pinterestBoardId,
      platform: "pinterest",
      title: content.title,
      link: content.destinationUrl,
      content: text,
      images: uploadedImages.length ? [] : [content.imageUrl],
      uploadedImages,
      date: scheduledIso,
      type: "schedule",
    });
    const postizPostId = extractPostizPostId(postizResponse);
    const updated = await updateSchedule(schedule.id, {
      postizPostId,
      status: "scheduled",
    });
    const updatedContent = await updateContent(content.id, {
      state: "scheduled",
    });
    return {
      ok: true as const,
      schedule: updated ?? schedule,
      contentItem: updatedContent,
      postizPostId,
      postizResponse,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const failedSchedule = await updateSchedule(schedule.id, {
      status: "failed",
    });
    const failedContent = await updateContent(content.id, { state: "failed" });
    return {
      ok: false as const,
      status: 502,
      error: message,
      schedule: failedSchedule ?? schedule,
      contentItem: failedContent,
    };
  }
}
