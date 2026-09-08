import {
  type CampaignStatus,
  type UpdateCampaignInput,
  deleteCampaign,
  getCampaign,
  updateCampaign,
} from "@/lib/campaigns";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/campaigns/[id] — one campaign, 404 if absent.
export async function GET(_req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }
  return Response.json({ campaign });
}

// PATCH /api/campaigns/[id] — update name / board / status.
export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, boardIntegrationId, pinterestBoardId, boardName, status } =
    (body ?? {}) as {
      name?: unknown;
      boardIntegrationId?: unknown;
      pinterestBoardId?: unknown;
      boardName?: unknown;
      status?: unknown;
    };

  const patch: UpdateCampaignInput = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim() === "") {
      return Response.json(
        { error: "name must be a non-empty string" },
        { status: 400 },
      );
    }
    patch.name = name.trim();
  }
  if (boardIntegrationId !== undefined) {
    patch.boardIntegrationId =
      typeof boardIntegrationId === "string" ? boardIntegrationId : null;
  }
  if (pinterestBoardId !== undefined) {
    patch.pinterestBoardId =
      typeof pinterestBoardId === "string" ? pinterestBoardId : null;
  }
  if (boardName !== undefined) {
    patch.boardName = typeof boardName === "string" ? boardName : null;
  }
  if (status !== undefined) {
    if (status !== "active" && status !== "archived") {
      return Response.json(
        { error: "status must be 'active' or 'archived'" },
        { status: 400 },
      );
    }
    patch.status = status as CampaignStatus;
  }

  const campaign = await updateCampaign(id, patch);
  if (!campaign) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }
  return Response.json({ campaign });
}

// DELETE /api/campaigns/[id] — remove a campaign.
export async function DELETE(
  _req: Request,
  { params }: Ctx,
): Promise<Response> {
  const { id } = await params;
  const removed = await deleteCampaign(id);
  if (!removed) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
