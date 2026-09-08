import {
  buildPinDescription,
  buildPinTitle,
  fitSetPageUrl,
} from "@/lib/fits/pin-copy";
import type { CandidateSet } from "@/lib/fits/types";
import { createPost, uploadImageBuffer } from "@/lib/postiz";
import { extractPostizPostId } from "@/lib/publish";
import { getSettings } from "@/lib/settings";

export interface PublishFitSetInput {
  set: CandidateSet;
  collage: Buffer;
  scheduledAt: string;
}

export interface PublishFitSetResult {
  pinId: string | null;
  mediaUrl: string;
  pageUrl: string;
}

function isRetryablePostizError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\((429|5\d\d)\)/.test(message);
}

async function retry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isRetryablePostizError(err) || attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  const message = last instanceof Error ? last.message : String(last);
  throw new Error(`${label} failed after retries: ${message}`);
}

export async function publishFitSetPin({
  set,
  collage,
  scheduledAt,
}: PublishFitSetInput): Promise<PublishFitSetResult> {
  const settings = await getSettings();
  if (!settings.targetBoardIntegrationId) {
    throw new Error("targetBoardIntegrationId is not configured");
  }
  if (!settings.targetPinterestBoardId) {
    throw new Error("targetPinterestBoardId is not configured");
  }
  const media = await retry("Postiz upload", () =>
    uploadImageBuffer(collage, `${set.slug}.jpg`),
  );
  const pageUrl = fitSetPageUrl(set.slug);
  const response = await retry("Postiz create post", () =>
    createPost({
      integrationId: settings.targetBoardIntegrationId as string,
      boardId: settings.targetPinterestBoardId as string,
      platform: "pinterest",
      title: buildPinTitle(set),
      link: pageUrl,
      content: buildPinDescription(set),
      uploadedImages: [media],
      date: scheduledAt,
      type: "schedule",
      dominantColor: "#f7f7f5",
    }),
  );
  return {
    pinId: extractPostizPostId(response),
    mediaUrl: media.path,
    pageUrl,
  };
}
