// Thin fal.ai image-generation client. Docs: https://fal.ai/docs
// The queue client (fal.subscribe) handles async submit + polling and resolves
// once the image is ready. Credentials come from FAL_KEY (format `id:secret`).
import { fal } from "@fal-ai/client";

// Campaign-safe default. Batch jobs can still override per request.
export const DEFAULT_MODEL = "fal-ai/bytedance/seedream/v5/lite/text-to-image";

// Normalized result the pipeline consumes downstream (save content / schedule).
export interface GeneratedImage {
  url: string;
  model: string;
  width?: number;
  height?: number;
}

// Shape fal returns from a FLUX image model (only the fields we use).
interface FalImage {
  url: string;
  width?: number;
  height?: number;
}
interface FalImageOutput {
  images?: FalImage[];
}

interface QueueSubmitResponse {
  status?: string;
  response_url?: string;
  status_url?: string;
}

function configure(): void {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set");
  fal.config({ credentials: key });
}

function falKey(): string {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set");
  return key;
}

async function queueRequest<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${falKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`fal queue ${url} failed (${res.status}): ${detail}`);
  }
  return body as T;
}

async function waitForQueueResult(
  model: string,
  submit: QueueSubmitResponse,
): Promise<FalImageOutput> {
  if (!submit.response_url || !submit.status_url) {
    throw new Error(`fal ${model} queue response missing status URLs`);
  }
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const status = await queueRequest<{ status?: string }>(submit.status_url);
    if (status.status === "COMPLETED") {
      return queueRequest<FalImageOutput>(submit.response_url);
    }
    if (status.status === "FAILED") {
      throw new Error(`fal ${model} generation failed`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`fal ${model} generation timed out`);
}

async function generateViaQueue({
  prompt,
  model,
  input,
}: Required<GenerateImageInput>): Promise<GeneratedImage> {
  const submit = await queueRequest<QueueSubmitResponse>(
    `https://queue.fal.run/${model}`,
    {
      method: "POST",
      body: JSON.stringify({ ...input, prompt }),
    },
  );
  const data = await waitForQueueResult(model, submit);
  const image = data.images?.[0];
  if (!image?.url) {
    throw new Error(`fal ${model} returned no image`);
  }
  return {
    url: image.url,
    model,
    width: image.width,
    height: image.height,
  };
}

export interface GenerateImageInput {
  prompt: string;
  model?: string;
  input?: Record<string, unknown>;
}

function usesQueue(model: string): boolean {
  return (
    model === "ideogram/v4" ||
    model === "fal-ai/bytedance/seedream/v5/lite/text-to-image" ||
    model === "fal-ai/recraft/v4.1/text-to-image"
  );
}

// Generate one image from a text prompt; resolves with the normalized first image.
export async function generateImage({
  prompt,
  model = DEFAULT_MODEL,
  input = {},
}: GenerateImageInput): Promise<GeneratedImage> {
  if (usesQueue(model)) {
    return generateViaQueue({ prompt, model, input });
  }
  configure();
  const result = await fal.subscribe(model, { input: { ...input, prompt } });
  const data = result.data as FalImageOutput;
  const image = data.images?.[0];
  if (!image?.url) {
    throw new Error(`fal ${model} returned no image`);
  }
  return {
    url: image.url,
    model,
    width: image.width,
    height: image.height,
  };
}
