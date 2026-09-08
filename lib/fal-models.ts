import { DEFAULT_MODEL } from "@/lib/fal";

export interface FalCatalogModel {
  id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnailUrl: string | null;
}

const FALLBACK_MODELS: FalCatalogModel[] = [
  {
    id: "fal-ai/nano-banana-2",
    title: "Nano Banana 2",
    description: "Fast, high-fidelity image generation with strong typography.",
    category: "text-to-image",
    thumbnailUrl: null,
  },
  {
    id: DEFAULT_MODEL,
    title: "Seedream v5 Lite",
    description:
      "Fast portrait-leaning text-to-image model for content batches.",
    category: "text-to-image",
    thumbnailUrl: null,
  },
  {
    id: "fal-ai/recraft/v4.1/text-to-image",
    title: "Recraft v4.1",
    description: "Graphic-design-friendly text-to-image generation.",
    category: "text-to-image",
    thumbnailUrl: null,
  },
  {
    id: "ideogram/v4",
    title: "Ideogram v4",
    description: "Text-to-image model with strong prompt following.",
    category: "text-to-image",
    thumbnailUrl: null,
  },
  {
    id: "fal-ai/flux/schnell",
    title: "FLUX.1 Schnell",
    description: "Fast FLUX text-to-image generation.",
    category: "text-to-image",
    thumbnailUrl: null,
  },
];

interface FalCatalogItem {
  id?: unknown;
  title?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  category?: unknown;
  thumbnailUrl?: unknown;
  deprecated?: unknown;
  removed?: unknown;
}

interface FalCatalogEnvelope {
  items?: FalCatalogItem[];
}

function normalize(item: FalCatalogItem): FalCatalogModel | null {
  if (
    typeof item.id !== "string" ||
    item.id.trim() === "" ||
    item.deprecated === true ||
    item.removed === true
  ) {
    return null;
  }
  const category =
    typeof item.category === "string" ? item.category : "text-to-image";
  if (category !== "text-to-image") return null;
  const title =
    typeof item.title === "string" && item.title.trim() !== ""
      ? item.title.trim()
      : null;
  if (!title || title === item.id) return null;
  return {
    id: item.id,
    title,
    description:
      typeof item.shortDescription === "string"
        ? item.shortDescription
        : typeof item.description === "string"
          ? item.description
          : null,
    category,
    thumbnailUrl:
      typeof item.thumbnailUrl === "string" ? item.thumbnailUrl : null,
  };
}

export async function listFalTextToImageModels(): Promise<FalCatalogModel[]> {
  const byId = new Map(FALLBACK_MODELS.map((model) => [model.id, model]));
  try {
    const res = await fetch(
      "https://fal.ai/api/models?categories=text-to-image",
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`fal catalog failed (${res.status})`);
    const envelope = (await res.json()) as FalCatalogEnvelope;
    for (const item of envelope.items ?? []) {
      const model = normalize(item);
      if (model) byId.set(model.id, model);
    }
  } catch {
    // Fallback list is enough for the editor; the route reports source separately.
  }

  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export async function assertApprovedImageModel(modelId: string): Promise<void> {
  const models = await listFalTextToImageModels();
  if (!models.some((model) => model.id === modelId)) {
    throw new Error(
      "The selected image model is not in the approved model catalog",
    );
  }
}
