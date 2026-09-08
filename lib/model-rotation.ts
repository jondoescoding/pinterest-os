export interface FalModelConfig {
  id: string;
  input: Record<string, unknown>;
}

// Low-cost settings:
// - one image per request on every model.
// - Ideogram uses TURBO and disables expansion.
// - portrait-leaning dimensions keep Pinterest utility while staying modest.
export const GYM_MODEL_ROTATION: FalModelConfig[] = [
  {
    id: "fal-ai/bytedance/seedream/v5/lite/text-to-image",
    input: {
      num_images: 1,
      max_images: 1,
      image_size: "portrait_16_9",
    },
  },
  {
    id: "fal-ai/recraft/v4.1/text-to-image",
    input: {
      num_images: 1,
      image_size: "portrait_16_9",
    },
  },
  {
    id: "ideogram/v4",
    input: {
      num_images: 1,
      rendering_speed: "TURBO",
      expansion_model: "None",
      enable_safety_checker: false,
      image_size: { width: 768, height: 1152 },
    },
  },
];

export function modelForIndex(index: number): FalModelConfig {
  return GYM_MODEL_ROTATION[index % GYM_MODEL_ROTATION.length];
}
