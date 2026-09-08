import { createCampaign, listCampaigns } from "@/lib/campaigns";

// GET /api/campaigns — list all campaigns, newest first.
export async function GET(): Promise<Response> {
  const campaigns = await listCampaigns();
  return Response.json({ campaigns });
}

// POST /api/campaigns — create a campaign. Body: { name, boardIntegrationId?, boardName? }.
export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, boardIntegrationId, pinterestBoardId, boardName } = (body ??
    {}) as {
    name?: unknown;
    boardIntegrationId?: unknown;
    pinterestBoardId?: unknown;
    boardName?: unknown;
  };

  if (typeof name !== "string" || name.trim() === "") {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const campaign = await createCampaign({
    name: name.trim(),
    boardIntegrationId:
      typeof boardIntegrationId === "string" ? boardIntegrationId : null,
    pinterestBoardId:
      typeof pinterestBoardId === "string" ? pinterestBoardId : null,
    boardName: typeof boardName === "string" ? boardName : null,
  });

  return Response.json({ campaign }, { status: 201 });
}
