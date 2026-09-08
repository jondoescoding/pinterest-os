import { createHash } from "node:crypto";
import { stripImageMetadata } from "@/lib/strip-metadata";

function cleanerToken(): string | undefined {
  const configured = process.env.METADATA_CLEANER_TOKEN?.trim();
  if (configured) return configured;
  const generationKey = process.env.FAL_KEY?.trim();
  if (!generationKey) return undefined;
  return createHash("sha256")
    .update(`pinterest-os-metadata-cleaner:${generationKey}`)
    .digest("hex");
}

export async function cleanFinalPosterMetadata(
  image: Buffer,
  filename: string,
): Promise<Buffer> {
  const serviceUrl = process.env.METADATA_CLEANER_URL?.trim().replace(
    /\/+$/,
    "",
  );
  const token = cleanerToken();

  if (!serviceUrl) return stripImageMetadata(image, filename);
  if (!token) {
    throw new Error(
      "METADATA_CLEANER_TOKEN or FAL_KEY is required when METADATA_CLEANER_URL is set",
    );
  }

  const response = await fetch(`${serviceUrl}/v1/strip-metadata`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/jpeg",
    },
    body: new Uint8Array(image),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Metadata cleaner failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }
  if (response.headers.get("x-metadata-stripped") !== "true") {
    throw new Error("Metadata cleaner response was not verified");
  }
  return Buffer.from(await response.arrayBuffer());
}
