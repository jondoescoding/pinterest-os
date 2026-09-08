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

export async function GET(): Promise<Response> {
  try {
    const settings = await getSettings();
    const integrations = await listIntegrations();
    const list: PostizIntegration[] = Array.isArray(integrations)
      ? integrations
      : (integrations?.integrations ?? []);
    const channels = list
      .map(normalizeChannel)
      .filter((c) => isAllowedChannelPlatform(c.platform));
    const pinterest = channels.filter((c) => c.platform === "pinterest");
    const integration =
      pinterest.find((c) => c.id === settings.targetBoardIntegrationId) ??
      pinterest[0] ??
      null;

    if (integration) {
      await updateSettings({
        targetBoardIntegrationId: integration.id,
      });
    }

    return Response.json({
      ok: true,
      targetName: settings.targetBoardName,
      integration,
      board: settings.targetPinterestBoardId
        ? {
            id: settings.targetPinterestBoardId,
            name: settings.targetBoardName,
            integrationId: integration?.id ?? null,
          }
        : null,
      boardIdConfigured: Boolean(settings.targetPinterestBoardId),
      pinterestBoards: pinterest,
      allowedChannels: channels,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
