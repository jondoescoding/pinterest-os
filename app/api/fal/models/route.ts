import { listFalTextToImageModels } from "@/lib/fal-models";

// GET /api/fal/models - text-to-image model catalog for generation-set pickers.
export async function GET(): Promise<Response> {
  const models = await listFalTextToImageModels();
  return Response.json({
    ok: true,
    count: models.length,
    models,
  });
}
