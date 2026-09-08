import PostizCalendarGrid from "@/app/components/PostizCalendarGrid";
import GenerationSetPanel from "@/app/components/generation/GenerationSetPanel";
import LibraryView from "@/app/library/LibraryView";
import { addDays, startOfWeek } from "@/lib/calendar-range";
import { getCampaign, listCampaigns } from "@/lib/campaigns";
import { listContent } from "@/lib/content";
import { listGenerationSets } from "@/lib/generation-sets";
import { listPosts } from "@/lib/postiz";
import { listSchedulesForContent } from "@/lib/schedules";
import { getSettings } from "@/lib/settings";
import Link from "next/link";
import { notFound } from "next/navigation";
import CampaignSettingsPanel from "./CampaignSettingsPanel";

type Tab = "overview" | "content" | "calendar" | "generation" | "settings";
type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Content" },
  { id: "calendar", label: "Calendar" },
  { id: "generation", label: "Generation" },
  { id: "settings", label: "Settings" },
];

function normalizeTab(value: string | undefined): Tab {
  return TABS.some((tab) => tab.id === value) ? (value as Tab) : "overview";
}

export default async function CampaignWorkspacePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const activeTab = normalizeTab(tabParam);
  const shouldFetchPosts = activeTab === "overview";
  const shouldFetchSchedules =
    activeTab === "overview" || activeTab === "content";
  const weekStart = startOfWeek(new Date());
  const [campaign, campaigns, settings, generationSets, content, posts] =
    await Promise.all([
      getCampaign(id),
      listCampaigns(),
      getSettings(),
      listGenerationSets({ campaignId: id }),
      listContent({ campaignId: id }),
      shouldFetchPosts
        ? listPosts(
            weekStart.toISOString(),
            addDays(weekStart, 7).toISOString(),
          ).catch(() => [])
        : [],
    ]);

  if (!campaign) notFound();

  const initialSet = generationSets[0] ?? null;
  const schedules =
    shouldFetchSchedules && content.length > 0
      ? await listSchedulesForContent(content.map((item) => item.id))
      : [];
  const scheduledCount = schedules.length;
  const calendarIntegrationId =
    campaign.boardIntegrationId ?? settings.targetBoardIntegrationId;

  return (
    <div>
      <div className="campaign-workspace-head">
        <div>
          <span className="eyebrow">Campaign workspace</span>
          <h1>{campaign.name}</h1>
          <p>
            {campaign.boardName ?? "No board assigned"} · Pinterest board{" "}
            {campaign.pinterestBoardId ?? "not set"}
          </p>
        </div>
        <span className={`pill ${campaign.status === "active" ? "ok" : ""}`}>
          <span className="dot" />
          {campaign.status}
        </span>
      </div>

      <nav className="workspace-tabs" aria-label="Campaign workspace tabs">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            className={`workspace-tab${activeTab === tab.id ? " active" : ""}`}
            href={`/campaigns/${campaign.id}?tab=${tab.id}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" && (
        <div className="metric-grid">
          <div className="metric-card">
            <span>Campaign content</span>
            <strong>{content.length}</strong>
            <small>Generated items in this campaign</small>
          </div>
          <div className="metric-card">
            <span>Scheduled mirrors</span>
            <strong>{scheduledCount}</strong>
            <small>Local content with a schedule row</small>
          </div>
          <div className="metric-card">
            <span>Generation sets</span>
            <strong>{generationSets.length}</strong>
            <small>Reusable presets</small>
          </div>
          <div className="metric-card">
            <span>Postiz posts</span>
            <strong>
              {
                posts.filter(
                  (post) => post.integration?.id === calendarIntegrationId,
                ).length
              }
            </strong>
            <small>This week for this integration</small>
          </div>
        </div>
      )}

      {activeTab === "content" && (
        <LibraryView items={content} schedules={schedules} />
      )}

      {activeTab === "calendar" && (
        <PostizCalendarGrid
          campaigns={campaigns}
          integrationId={calendarIntegrationId}
          title={`${campaign.name} calendar`}
          subtitle="Campaign posts pulled directly from Postiz."
        />
      )}

      {activeTab === "generation" && (
        <GenerationSetPanel
          campaigns={campaigns}
          settings={settings}
          initialSet={initialSet}
          defaultCampaignId={campaign.id}
          showCampaignPicker={false}
        />
      )}

      {activeTab === "settings" && (
        <CampaignSettingsPanel campaign={campaign} globalSettings={settings} />
      )}
    </div>
  );
}
