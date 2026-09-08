import { listCampaigns } from "@/lib/campaigns";
import { listContent } from "@/lib/content";
import { listGenerationSets } from "@/lib/generation-sets";
import { listSchedules } from "@/lib/schedules";
import {
  CalendarDaysIcon,
  FolderIcon,
  PhotoIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import ChannelsPanel from "./components/ChannelsPanel";

export default async function OverviewPage() {
  const [campaigns, content, schedules, generationSets] = await Promise.all([
    listCampaigns(),
    listContent(),
    listSchedules(),
    listGenerationSets(),
  ]);
  const now = Date.now() / 1000;
  const weekEnd = now + 7 * 24 * 60 * 60;
  const scheduledThisWeek = schedules.filter(
    (schedule) =>
      schedule.scheduledAt >= now && schedule.scheduledAt <= weekEnd,
  );
  const drafts = content.filter((item) => item.state === "draft");
  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.status === "active",
  );
  const recentContent = content.slice(0, 4);

  return (
    <div className="overview-page">
      <div className="page-head">
        <h1>Overview</h1>
        <p>
          Quick glance across campaigns, generated assets, and schedule load.
        </p>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <FolderIcon aria-hidden="true" />
          <span>Active campaigns</span>
          <strong>{activeCampaigns.length}</strong>
          <small>{campaigns.length} total campaign records</small>
        </div>
        <div className="metric-card">
          <CalendarDaysIcon aria-hidden="true" />
          <span>Scheduled this week</span>
          <strong>{scheduledThisWeek.length}</strong>
          <small>{schedules.length} total scheduled posts</small>
        </div>
        <div className="metric-card">
          <PhotoIcon aria-hidden="true" />
          <span>Draft assets</span>
          <strong>{drafts.length}</strong>
          <small>{content.length} library items</small>
        </div>
        <div className="metric-card">
          <SparklesIcon aria-hidden="true" />
          <span>Generation sets</span>
          <strong>{generationSets.length}</strong>
          <small>Reusable presets available</small>
        </div>
      </div>

      <div className="overview-grid">
        <section className="overview-card board-panel">
          <div className="card-title-row">
            <div>
              <h2>Campaign health</h2>
              <p>Board mapping and active generation presets.</p>
            </div>
            <Link className="btn" href="/campaigns">
              View all
            </Link>
          </div>
          <div className="dense-list">
            {campaigns.slice(0, 5).map((campaign) => {
              const setCount = generationSets.filter(
                (set) => set.campaignId === campaign.id,
              ).length;
              return (
                <Link
                  className="dense-row"
                  href={`/campaigns/${campaign.id}`}
                  key={campaign.id}
                >
                  <span>
                    <strong>{campaign.name}</strong>
                    <small>{campaign.boardName ?? "No board assigned"}</small>
                  </span>
                  <span className="row-meta">
                    {setCount} preset{setCount === 1 ? "" : "s"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="card overview-card">
          <div className="card-title-row">
            <div>
              <h2>Connected boards</h2>
              <p>Live Postiz channel state.</p>
            </div>
          </div>
          <ChannelsPanel />
        </section>

        <section className="card overview-card wide">
          <div className="card-title-row">
            <div>
              <h2>Recent library</h2>
              <p>Latest generated images and drafts.</p>
            </div>
            <Link className="btn" href="/library">
              Open library
            </Link>
          </div>
          <div className="recent-strip">
            {recentContent.length === 0 ? (
              <div className="placeholder">No content yet.</div>
            ) : (
              recentContent.map((item) => (
                <article className="recent-card" key={item.id}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title ?? "Content"} />
                  ) : (
                    <div className="image-empty" />
                  )}
                  <strong>{item.title ?? "Untitled"}</strong>
                  <small>{item.campaignName ?? "No campaign"}</small>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="card overview-card">
          <div className="card-title-row">
            <div>
              <h2>Next scheduled</h2>
              <p>Upcoming Postiz queue mirrors.</p>
            </div>
            <Link className="btn" href="/calendar">
              Calendar
            </Link>
          </div>
          <div className="dense-list">
            {schedules.slice(0, 5).map((schedule) => (
              <div className="dense-row" key={schedule.id}>
                <span>
                  <strong>{schedule.contentTitle ?? "Untitled"}</strong>
                  <small>{schedule.campaignName ?? "No campaign"}</small>
                </span>
                <span className="row-meta">
                  {new Date(schedule.scheduledAt * 1000).toLocaleDateString()}
                </span>
              </div>
            ))}
            {schedules.length === 0 && (
              <div className="placeholder">No scheduled posts yet.</div>
            )}
          </div>
        </section>

        <section className="card overview-card">
          <div className="card-title-row">
            <div>
              <h2>Generation sets</h2>
              <p>Reusable settings components.</p>
            </div>
          </div>
          <div className="dense-list">
            {generationSets.slice(0, 5).map((set) => (
              <Link
                className="dense-row"
                href={
                  set.campaignId ? `/campaigns/${set.campaignId}` : "/campaigns"
                }
                key={set.id}
              >
                <span>
                  <strong>{set.name}</strong>
                  <small>{set.campaignName ?? "No campaign"}</small>
                </span>
                <span className="pill ok">
                  <span className="dot" />
                  {set.scheduleUnit}
                </span>
              </Link>
            ))}
            {generationSets.length === 0 && (
              <div className="placeholder">No generation sets saved yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
