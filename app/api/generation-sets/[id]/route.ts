import { assertApprovedImageModel } from "@/lib/fal-models";
import {
  type GenerationSetInput,
  deleteGenerationSet,
  updateGenerationSet,
} from "@/lib/generation-sets";

type Ctx = { params: Promise<{ id: string }> };

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parsePatch(body: unknown): Partial<GenerationSetInput> {
  const row =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const patch: Partial<GenerationSetInput> = {};

  if ("campaignId" in row) patch.campaignId = str(row.campaignId);
  if ("name" in row) {
    const name = str(row.name);
    if (!name) throw new Error("name must be a non-empty string");
    patch.name = name;
  }
  if ("falModel" in row) patch.falModel = str(row.falModel);
  if ("destinationUrl" in row) patch.destinationUrl = str(row.destinationUrl);
  if ("scheduleStart" in row) {
    patch.scheduleStart =
      typeof row.scheduleStart === "number" &&
      Number.isFinite(row.scheduleStart)
        ? Math.floor(row.scheduleStart)
        : null;
  }
  if ("scheduleInterval" in row) {
    patch.scheduleInterval =
      typeof row.scheduleInterval === "number" &&
      Number.isFinite(row.scheduleInterval)
        ? Math.floor(row.scheduleInterval)
        : null;
  }
  if ("scheduleUnit" in row) {
    patch.scheduleUnit =
      row.scheduleUnit === "minutes" ||
      row.scheduleUnit === "hours" ||
      row.scheduleUnit === "days"
        ? row.scheduleUnit
        : "days";
  }
  if ("scheduleAfterSave" in row) {
    patch.scheduleAfterSave = row.scheduleAfterSave === true;
  }
  if ("items" in row) {
    patch.items = Array.isArray(row.items)
      ? row.items.map((item) => {
          const value =
            typeof item === "object" && item !== null
              ? (item as Record<string, unknown>)
              : {};
          return {
            title: str(value.title) ?? "",
            description: str(value.description) ?? "",
            prompt: str(value.prompt) ?? "",
          };
        })
      : [];
  }
  if ("status" in row) {
    patch.status = row.status === "archived" ? "archived" : "active";
  }

  return patch;
}

export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  let patch: Partial<GenerationSetInput>;
  try {
    patch = parsePatch(await req.json());
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  if (patch.falModel) {
    try {
      await assertApprovedImageModel(patch.falModel);
    } catch (err) {
      return Response.json(
        { ok: false, error: err instanceof Error ? err.message : String(err) },
        { status: 400 },
      );
    }
  }
  const generationSet = await updateGenerationSet(id, patch);
  if (!generationSet) {
    return Response.json(
      { ok: false, error: "Generation set not found" },
      { status: 404 },
    );
  }
  return Response.json({ ok: true, generationSet });
}

export async function DELETE(
  _req: Request,
  { params }: Ctx,
): Promise<Response> {
  const { id } = await params;
  const removed = await deleteGenerationSet(id);
  if (!removed) {
    return Response.json(
      { ok: false, error: "Generation set not found" },
      { status: 404 },
    );
  }
  return Response.json({ ok: true });
}
