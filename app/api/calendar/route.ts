import { addDays, startOfWeek } from "@/lib/calendar-range";
import { getCampaign } from "@/lib/campaigns";
import { listPosts } from "@/lib/postiz";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaignId");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const weekStart = startOfWeek(new Date());
  const startDate = start ?? weekStart.toISOString();
  const endDate = end ?? addDays(weekStart, 7).toISOString();
  const campaign = campaignId ? await getCampaign(campaignId) : undefined;
  const posts = await listPosts(startDate, endDate).catch(() => []);
  const filtered = campaign?.boardIntegrationId
    ? posts.filter(
        (post) => post.integration?.id === campaign.boardIntegrationId,
      )
    : posts;

  return Response.json({
    ok: true,
    startDate,
    endDate,
    campaign: campaign ?? null,
    posts: filtered,
  });
}
