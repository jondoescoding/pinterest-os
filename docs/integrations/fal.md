---
type: integration
---

# fal API

Source:
- General docs: https://fal.ai/docs
- Seedream Lite text-to-image: https://fal.ai/models/fal-ai/bytedance/seedream/v5/lite/text-to-image/api
- Recraft v4.1 text-to-image: https://fal.ai/models/fal-ai/recraft/v4.1/text-to-image/api
- Ideogram v4: https://fal.ai/models/ideogram/v4/api

Local client:
- File: `lib/fal.ts`
- Package: `@fal-ai/client`
- Auth: `FAL_KEY`, configured with `fal.config({ credentials: key })`
- Execution: `fal.subscribe(model, { input: { ...input, prompt } })`
- Normalized output: first item in `result.data.images` as `{ url, model, width, height }`

## Endpoint IDs

Use these model IDs with `generateImage({ model, prompt, input })`:

| Model | Endpoint ID | Notes |
|---|---|---|
| Seedream 5 Lite text-to-image | `fal-ai/bytedance/seedream/v5/lite/text-to-image` | Fast lite Seedream text-to-image model. |
| Recraft v4.1 text-to-image | `fal-ai/recraft/v4.1/text-to-image` | Recraft image generation model with color controls. |
| Ideogram v4 | `ideogram/v4` | Ideogram endpoint path from fal docs. |
| Legacy smoke-test option | `fal-ai/fast-sdxl` | Older low-cost model. Keep it only for ad hoc smoke tests; current campaign defaults use Seedream 5 Lite. |

## Inputs Used By The Current Wrapper

The wrapper only requires:

```ts
generateImage({
  prompt: "realistic gym scene...",
  model: "ideogram/v4",
  input: {
    image_size: "portrait_16_9",
    num_images: 1,
  },
});
```

Every model accepts `prompt`. Extra inputs are passed through unchanged, so route handlers can set model-specific controls without changing `lib/fal.ts`.

## Model Input Surface

### Seedream 5 Lite Text-To-Image

Documented inputs on the fal page include:

| Input | Type | Default / values | Notes |
|---|---|---|---|
| `prompt` | string | required | Text prompt used to generate the image. |
| `image_size` | enum or object | default `auto_2K`; enum includes `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9`, `auto_2K`, `auto_3K`, `auto_4K` | Page notes total pixels are adjusted into the supported range. |
| `num_images` | integer | default `1` | Number of separate generations to run. |
| `max_images` | integer | optional | Enables multi-image generation when greater than one. |
| `sync_mode` | boolean | default false | If true, media returns as a data URI and is not available in request history. |
| `enable_safety_checker` | boolean | default true | Safety checker toggle. |
| `return_byteplus_urls` | boolean | optional | Returns trusted URLs that expire in 24 hours. |

Low-cost campaign posture: request one image per call, keep `image_size` at `auto_2K` or a single portrait enum, and leave `sync_mode` false so downstream scheduling receives a hosted URL.

### Recraft v4.1 Text-To-Image

Documented inputs on the fal page include:

| Input | Type | Default / values | Notes |
|---|---|---|---|
| `prompt` | string | required | Text prompt. |
| `image_size` | enum or object | default `square_hd`; enum includes `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9` | Custom sizes can be passed as `{ width, height }`. |
| `colors` | list of RGB colors | optional | Preferable colors. |
| `background_color` | RGB color | optional | Background color preference. |
| `enable_safety_checker` | boolean | default true | Safety checker toggle. |

Low-cost campaign posture: request the default single image, avoid custom oversized dimensions, and only use `colors` when it materially helps visual consistency.

### Ideogram v4

Documented inputs on the fal page include:

| Input | Type | Default / values | Notes |
|---|---|---|---|
| `prompt` | string | required | Prompt to generate an image from. |
| `expansion_model` | enum | optional | `None` disables prompt expansion and skips its fee; other choices expand the prompt. |
| `image_size` | enum or object | default `square_hd`; enum includes `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9` | Custom sizes can be passed as `{ width, height }`. |
| `rendering_speed` | enum | default `BALANCED`; values `TURBO`, `BALANCED`, `QUALITY` | Faster speeds use fewer denoising steps. |
| `acceleration` | enum | optional | Provider acceleration control. |
| `num_images` | integer | default `1` | Number of images to generate. |
| `seed` | integer | optional | Random seed if omitted. |
| `sync_mode` | boolean | default false | If true, image returns as a data URI and is not stored. |
| `enable_safety_checker` | boolean | default true | Safety checker toggle. |
| `output_format` | enum | default `jpeg`; values `jpeg`, `png` | Use `jpeg` for Pinterest images unless transparency is required. |

Low-cost campaign posture: `num_images: 1`, `rendering_speed: "TURBO"`, `expansion_model: "None"` when prompts are already well-written, and `output_format: "jpeg"`.

## Campaign Prompting Notes

- For Pinterest gym-aesthetic campaigns, keep scenes grounded in real workout spaces: commercial gym floors, apartment gyms, Pilates studios, hotel gyms, outdoor training courts, locker-room prep areas, and weight-room corners.
- Add background objects that create depth: mirrors, dumbbell racks, cable machines, towels, water bottles, benches, mats, lockers, windows, clocks, plants, wall posters, and other people out of focus.
- Keep `num_images` at `1` and rotate model IDs at the job level. Multi-image outputs cost more and complicate provenance.
- Persist `model`, input settings, and prompt text on each content item so later cleanup can target specific model batches.
