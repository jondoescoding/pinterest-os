import { addDays, startOfWeek } from "@/lib/calendar-range";
import { listCampaigns } from "@/lib/campaigns";
import { listContent } from "@/lib/content";
import { listGenerationSets } from "@/lib/generation-sets";
import { listPosts } from "@/lib/postiz";

export async function GET(): Promise<Response> {
  const weekStart = startOfWeek(new Date());
  const [campaigns, contentItems, generationSets, postizPosts] =
    await Promise.all([
      listCampaigns(),
      listContent(),
      listGenerationSets(),
      listPosts(
        weekStart.toISOString(),
        addDays(weekStart, 7).toISOString(),
      ).catch(() => []),
    ]);

  return Response.json({
    ok: true,
    metrics: {
      activeCampaigns: campaigns.filter(
        (campaign) => campaign.status === "active",
      ).length,
      totalCampaigns: campaigns.length,
      draftContent: contentItems.filter((item) => item.state === "draft")
        .length,
      totalContent: contentItems.length,
      generationSets: generationSets.length,
      postizPostsThisWeek: postizPosts.length,
    },
    recentContent: contentItems.slice(0, 10),
    campaigns,
    generationSets,
    postizPosts,
  });
}
