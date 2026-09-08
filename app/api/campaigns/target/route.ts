import {
  createCampaign,
  findCampaignByNameOrBoard,
  updateCampaign,
} from "@/lib/campaigns";
import {
  type Channel,
  type PostizIntegration,
  isAllowedChannelPlatform,
  listIntegrations,
  normalizePlatform,
} from "@/lib/postiz";
import { getSettings, updateSettings } from "@/lib/settings";

function normalizeChannel(i: PostizIntegration): Channel {
  return {
    id: i.id,
    name: i.name ?? null,
    platform: normalizePlatform(
      i.identifier ?? i.providerIdentifier ?? i.platform ?? null,
    ),
    picture: i.picture ?? i.avatar ?? null,
    disabled: i.disabled ?? false,
  };
}

export async function POST(): Promise<Response> {
  try {
    const settings = await getSettings();
    const integrations = await listIntegrations();
    const list: PostizIntegration[] = Array.isArray(integrations)
      ? integrations
      : (integrations?.integrations ?? []);
    const pinterestBoards = list
      .map(normalizeChannel)
      .filter(
        (c) =>
          isAllowedChannelPlatform(c.platform) && c.platform === "pinterest",
      );
    const integration =
      pinterestBoards.find((c) => c.id === settings.targetBoardIntegrationId) ??
      pinterestBoards[0];

    if (!integration) {
      return Response.json(
        {
          ok: false,
          error: "No Pinterest integration found in Postiz",
        },
        { status: 404 },
      );
    }

    const name = settings.targetBoardName;
    const existing = await findCampaignByNameOrBoard(name, integration.id);
    const campaign = existing
      ? await updateCampaign(existing.id, {
          name,
          boardIntegrationId: integration.id,
          pinterestBoardId: settings.targetPinterestBoardId,
          boardName: name,
          status: "active",
        })
      : await createCampaign({
          name,
          boardIntegrationId: integration.id,
          pinterestBoardId: settings.targetPinterestBoardId,
          boardName: name,
        });

    await updateSettings({
      targetBoardIntegrationId: integration.id,
      targetBoardName: name,
    });

    return Response.json({ ok: true, integration, campaign });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
