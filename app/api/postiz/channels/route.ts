import {
  type Channel,
  type PostizIntegration,
  isAllowedChannelPlatform,
  listIntegrations,
  normalizePlatform,
} from "@/lib/postiz";

// GET /api/postiz/channels — probe Postiz auth and return connected boards.
export async function GET(): Promise<Response> {
  try {
    const integrations = await listIntegrations();
    // Postiz returns an array of integration objects; normalize to what the UI needs.
    const list: PostizIntegration[] = Array.isArray(integrations)
      ? integrations
      : (integrations?.integrations ?? []);
    const channels: Channel[] = list
      .map((i) => {
        const platform = normalizePlatform(
          i.identifier ?? i.providerIdentifier ?? i.platform ?? null,
        );
        return {
          id: i.id,
          name: i.name ?? null,
          platform,
          picture: i.picture ?? i.avatar ?? null,
          disabled: i.disabled ?? false,
        };
      })
      .filter((c) => isAllowedChannelPlatform(c.platform));
    return Response.json({ ok: true, count: channels.length, channels });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
