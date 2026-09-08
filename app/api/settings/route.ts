import { assertApprovedImageModel } from "@/lib/fal-models";
import { getSettings, updateSettings } from "@/lib/settings";

function nullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

export async function GET(): Promise<Response> {
  return Response.json({ ok: true, settings: await getSettings() });
}

export async function PATCH(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const patch = {
    defaultDestinationUrl: nullableString(body.defaultDestinationUrl),
    defaultFalModel: nullableString(body.defaultFalModel),
    targetBoardIntegrationId: nullableString(body.targetBoardIntegrationId),
    targetPinterestBoardId: nullableString(body.targetPinterestBoardId),
    targetBoardName: nullableString(body.targetBoardName),
  };

  try {
    if (patch.defaultFalModel) {
      await assertApprovedImageModel(patch.defaultFalModel);
    }
    const settings = await updateSettings(patch);
    return Response.json({ ok: true, settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
