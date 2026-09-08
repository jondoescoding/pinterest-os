import { assertApprovedImageModel } from "@/lib/fal-models";
import {
  type GenerationSetInput,
  createGenerationSet,
  listGenerationSets,
} from "@/lib/generation-sets";

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseInput(body: unknown): GenerationSetInput {
  const row =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const name = str(row.name);
  if (!name) throw new Error("name is required");
  const scheduleStart =
    typeof row.scheduleStart === "number" && Number.isFinite(row.scheduleStart)
      ? Math.floor(row.scheduleStart)
      : null;
  const scheduleInterval =
    typeof row.scheduleInterval === "number" &&
    Number.isFinite(row.scheduleInterval)
      ? Math.floor(row.scheduleInterval)
      : null;
  const items = Array.isArray(row.items)
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

  return {
    campaignId: str(row.campaignId),
    name,
    falModel: str(row.falModel),
    destinationUrl: str(row.destinationUrl),
    scheduleStart,
    scheduleInterval,
    scheduleUnit:
      row.scheduleUnit === "minutes" ||
      row.scheduleUnit === "hours" ||
      row.scheduleUnit === "days"
        ? row.scheduleUnit
        : "days",
    scheduleAfterSave: row.scheduleAfterSave === true,
    items,
    status: row.status === "archived" ? "archived" : "active",
  };
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaignId") ?? undefined;
  const generationSets = await listGenerationSets({ campaignId });
  return Response.json({ ok: true, generationSets });
}

export async function POST(req: Request): Promise<Response> {
  let input: GenerationSetInput;
  try {
    input = parseInput(await req.json());
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  try {
    if (input.falModel) await assertApprovedImageModel(input.falModel);
    const generationSet = await createGenerationSet(input);
    return Response.json({ ok: true, generationSet }, { status: 201 });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
