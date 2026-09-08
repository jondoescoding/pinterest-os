import { listCampaigns } from "@/lib/campaigns";
import CampaignManager from "./CampaignManager";

// Server component: read campaigns straight from the DB (no fetch waterfall);
// the client island below handles the create form + mutations.
export default async function CampaignsPage() {
  const campaigns = await listCampaigns();

  return (
    <div>
      <div className="page-head">
        <h1>Campaigns</h1>
        <p>Group content into campaigns — each targets one Pinterest board.</p>
      </div>
      <CampaignManager campaigns={campaigns} />
    </div>
  );
}
