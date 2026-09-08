import PostizCalendarGrid from "@/app/components/PostizCalendarGrid";
import { listCampaigns } from "@/lib/campaigns";

export default async function CalendarPage() {
  const campaigns = await listCampaigns();

  return (
    <div>
      <div className="page-head">
        <h1>Calendar</h1>
        <p>Scheduled posts pulled directly from Postiz.</p>
      </div>
      <PostizCalendarGrid campaigns={campaigns} />
    </div>
  );
}
