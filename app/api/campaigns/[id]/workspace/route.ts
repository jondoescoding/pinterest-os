import { addDays, startOfWeek } from "@/lib/calendar-range";
import { getCampaign, listCampaigns } from "@/lib/campaigns";
import { listContent } from "@/lib/content";
import { listGenerationSets } from "@/lib/generation-sets";
import { listPosts } from "@/lib/postiz";
import { listSchedulesForContent } from "@/lib/schedules";
import { getSettings } from "@/lib/settings";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const weekStart = startOfWeek(new Date());
  const [campaign, campaigns, settings, generationSets, contentItems, posts] =
    await Promise.all([
      getCampaign(id),
      listCampaigns(),
      getSettings(),
      listGenerationSets({ campaignId: id }),
      listContent({ campaignId: id }),
      listPosts(
        weekStart.toISOString(),
        addDays(weekStart, 7).toISOString(),
      ).catch(() => []),
    ]);

  if (!campaign) {
    return Response.json(
      { ok: false, error: "Campaign not found" },
      { status: 404 },
    );
  }

  const schedules = await listSchedulesForContent(
    contentItems.map((item) => item.id),
  );
  const integrationId =
    campaign.boardIntegrationId ?? settings.targetBoardIntegrationId;

  return Response.json({
    ok: true,
    tabs: ["overview", "content", "calendar", "generation", "settings"],
    campaign,
    campaigns,
    settings,
    overview: {
      contentCount: contentItems.length,
      scheduleCount: schedules.length,
      generationSetCount: generationSets.length,
      postizPostsThisWeek: integrationId
        ? posts.filter((post) => post.integration?.id === integrationId).length
        : posts.length,
    },
    contentItems,
    schedules,
    generationSets,
    postizPosts: integrationId
      ? posts.filter((post) => post.integration?.id === integrationId)
      : posts,
  });
}
