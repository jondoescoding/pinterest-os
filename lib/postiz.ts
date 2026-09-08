// Thin Postiz public API client. Docs: https://docs.postiz.com/public-api
const BASE_URL =
  process.env.POSTIZ_BASE_URL ?? "https://api.postiz.com/public/v1";

// Shape Postiz returns per connected channel (only the fields we use).
export interface PostizIntegration {
  id: string;
  name?: string;
  identifier?: string;
  providerIdentifier?: string;
  platform?: string;
  picture?: string;
  avatar?: string;
  disabled?: boolean;
}

export interface Channel {
  id: string;
  name: string | null;
  platform: string | null;
  picture: string | null;
  disabled: boolean;
}

export function normalizePlatform(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const platform = raw.trim().toLowerCase();
  if (platform.includes("pinterest")) return "pinterest";
  if (platform.includes("tiktok")) return "tiktok";
  return platform || null;
}

export function isAllowedChannelPlatform(platform: string | null): boolean {
  return platform === "pinterest" || platform === "tiktok";
}

function authHeaders(): Record<string, string> {
  const key = process.env.POSTIZ_API_KEY;
  if (!key) throw new Error("POSTIZ_API_KEY is not set");
  return { Authorization: key, "Content-Type": "application/json" };
}

function authOnlyHeaders(): Record<string, string> {
  const key = process.env.POSTIZ_API_KEY;
  if (!key) throw new Error("POSTIZ_API_KEY is not set");
  return { Authorization: key };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
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
    throw new Error(
      `Postiz ${init.method ?? "GET"} ${path} failed (${res.status}): ${detail}`,
    );
  }
  return body as T;
}

async function requestAllowNotFound<T>(
  path: string,
  init: RequestInit = {},
): Promise<T | null> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(
      `Postiz ${init.method ?? "GET"} ${path} failed (${res.status}): ${detail}`,
    );
  }
  return body as T;
}

// List connected channels/integrations (your Pinterest boards/accounts live here).
export function listIntegrations(): Promise<
  PostizIntegration[] | { integrations: PostizIntegration[] }
> {
  return request("/integrations");
}

export interface CreatePostInput {
  integrationId: string;
  content: string;
  images?: string[];
  uploadedImages?: PostizMedia[];
  date: string;
  type?: "schedule" | "now";
  platform?: string;
  boardId?: string;
  title?: string | null;
  link?: string | null;
  dominantColor?: string | null;
}

export interface PostizPost {
  id: string;
  title?: string;
  content?: string;
  publishDate?: string;
  state?: string;
  integration?: { id?: string; name?: string };
}

export async function listPosts(
  startDate: string,
  endDate: string,
): Promise<PostizPost[]> {
  const qs = new URLSearchParams({ startDate, endDate });
  const body = await request<
    PostizPost[] | { posts?: PostizPost[]; data?: PostizPost[] }
  >(`/posts?${qs.toString()}`);
  if (Array.isArray(body)) return body;
  return body.posts ?? body.data ?? [];
}

export async function deletePost(
  postId: string,
): Promise<{ id?: string } | null> {
  return requestAllowNotFound<{ id?: string }>(
    `/posts/${encodeURIComponent(postId)}`,
    { method: "DELETE" },
  );
}

export interface PostizMedia {
  id: string;
  path: string;
}

function assertMedia(body: unknown): PostizMedia {
  if (
    typeof body === "object" &&
    body !== null &&
    "id" in body &&
    "path" in body &&
    typeof body.id === "string" &&
    typeof body.path === "string"
  ) {
    return { id: body.id, path: body.path };
  }
  throw new Error(
    `Postiz upload-from-url response missing media id/path: ${JSON.stringify(body)}`,
  );
}

export async function uploadImageFromUrl(url: string): Promise<PostizMedia> {
  const body = await request<unknown>("/upload-from-url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  return assertMedia(body);
}

export async function uploadImageBuffer(
  buffer: Buffer,
  filename = "fit-set.jpg",
): Promise<PostizMedia> {
  const form = new FormData();
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  form.append(
    "file",
    new Blob([arrayBuffer], { type: "image/jpeg" }),
    filename,
  );
  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: authOnlyHeaders(),
    body: form,
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
    throw new Error(`Postiz POST /upload failed (${res.status}): ${detail}`);
  }
  return assertMedia(body);
}

function buildSettings(input: CreatePostInput): Record<string, string> {
  const platform = normalizePlatform(input.platform) ?? "pinterest";
  if (platform === "pinterest") {
    return {
      __type: "pinterest",
      board: input.boardId ?? input.integrationId,
      title: (input.title ?? "").slice(0, 100),
      link: input.link ?? "",
      dominant_color: input.dominantColor ?? "",
    };
  }
  return { __type: platform };
}

// Schedule (or post now) a single content item to one integration.
export async function createPost(input: CreatePostInput): Promise<unknown> {
  const {
    integrationId,
    content,
    images = [],
    uploadedImages = [],
    date,
    type = "schedule",
  } = input;
  const uploadedFromUrls = await Promise.all(images.map(uploadImageFromUrl));
  const media = [...uploadedImages, ...uploadedFromUrls];
  return request("/posts", {
    method: "POST",
    body: JSON.stringify({
      type,
      date,
      shortLink: false,
      tags: [],
      posts: [
        {
          integration: { id: integrationId },
          value: [{ content, image: media }],
          settings: buildSettings(input),
        },
      ],
    }),
  });
}
