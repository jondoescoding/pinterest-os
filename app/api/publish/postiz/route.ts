import { createHash } from "node:crypto";
import { authorizeApiRequest } from "@/lib/api-auth";
import { createPost } from "@/lib/postiz";
import {
  claimPostizPublishRequest,
  completePostizPublishRequest,
  failPostizPublishRequest,
} from "@/lib/postiz-publish-requests";

type PublishMode = "schedule" | "now";

class BadRequestError extends Error {}

function requiredString(
  body: Record<string, unknown>,
  key: string,
  maximumLength = 500,
): string {
  const value = typeof body[key] === "string" ? body[key].trim() : "";
  if (!value) throw new BadRequestError(`${key} is required`);
  if (value.length > maximumLength) {
    throw new BadRequestError(
      `${key} must be ${maximumLength} characters or fewer`,
    );
  }
  return value;
}

function optionalString(
  body: Record<string, unknown>,
  key: string,
  maximumLength = 5000,
): string | null {
  const value = typeof body[key] === "string" ? body[key].trim() : "";
  if (!value) return null;
  if (value.length > maximumLength) {
    throw new BadRequestError(
      `${key} must be ${maximumLength} characters or fewer`,
    );
  }
  return value;
}

function httpsUrl(value: string, field: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BadRequestError(`${field} must be a valid URL`);
  }
  if (parsed.protocol !== "https:") {
    throw new BadRequestError(`${field} must use HTTPS`);
  }
  return parsed.toString();
}

function publishDate(body: Record<string, unknown>, mode: PublishMode): string {
  if (mode === "now") return new Date().toISOString();
  const scheduledAt = requiredString(body, "scheduledAt", 100);
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.valueOf())) {
    throw new BadRequestError("scheduledAt must be a valid ISO date");
  }
  return date.toISOString();
}

function idempotencyKey(req: Request): string {
  const value = req.headers.get("idempotency-key")?.trim() ?? "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{15,199}$/.test(value)) {
    throw new BadRequestError(
      "Idempotency-Key must contain 16 to 200 letters, numbers, dots, underscores, colons, or hyphens",
    );
  }
  return value;
}

function requestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/**
 * Publish directly through Postiz.
 */
export async function POST(req: Request): Promise<Response> {
  const denied = authorizeApiRequest(req);
  if (denied) return denied;

  let key: string;
  try {
    key = idempotencyKey(req);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  let claimed = false;
  try {
    const mode = requiredString(body, "mode", 20) as PublishMode;
    if (mode !== "schedule" && mode !== "now") {
      throw new BadRequestError('mode must be either "schedule" or "now"');
    }

    const integrationId = requiredString(body, "integrationId", 200);
    const boardId = requiredString(body, "boardId", 200);
    const title = requiredString(body, "title", 100);
    const imageUrl = httpsUrl(
      requiredString(body, "imageUrl", 2048),
      "imageUrl",
    );
    const destinationUrlValue = optionalString(body, "destinationUrl", 2048);
    const destinationUrl = destinationUrlValue
      ? httpsUrl(destinationUrlValue, "destinationUrl")
      : null;
    const scheduledAt = mode === "schedule" ? publishDate(body, mode) : null;
    const normalizedRequest = {
      mode,
      integrationId,
      boardId,
      title,
      description: optionalString(body, "description") ?? "",
      imageUrl,
      destinationUrl,
      scheduledAt,
    };

    const claim = await claimPostizPublishRequest(
      key,
      requestHash(normalizedRequest),
    );
    if (claim.state === "conflict") {
      return Response.json(
        {
          ok: false,
          error: "Idempotency-Key was already used for a different request",
        },
        { status: 409 },
      );
    }
    if (claim.state === "in_progress") {
      return Response.json(
        {
          ok: false,
          error:
            "This request is already in progress; check Postiz before manual recovery",
        },
        { status: 409, headers: { "Retry-After": "5" } },
      );
    }
    if (claim.state === "failed") {
      return Response.json(
        {
          ok: false,
          error:
            "The original request failed or ended ambiguously; reconcile it in Postiz before using a new key",
          reconciliationRequired: true,
        },
        { status: 409 },
      );
    }
    if (claim.state === "complete") {
      const response =
        typeof claim.response === "object" && claim.response !== null
          ? claim.response
          : { ok: true, result: claim.response };
      return Response.json(
        {
          ...response,
          idempotencyKey: key,
          idempotentReplay: true,
        },
        { status: 200 },
      );
    }
    claimed = true;

    const result = await createPost({
      integrationId,
      boardId,
      platform: "pinterest",
      title,
      content: normalizedRequest.description,
      images: [imageUrl],
      link: destinationUrl,
      date: scheduledAt ?? new Date().toISOString(),
      type: mode,
    });

    const response = {
      ok: true,
      provider: "postiz",
      idempotencyKey: key,
      idempotentReplay: false,
      result,
    };
    await completePostizPublishRequest(key, response);
    return Response.json(response, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (claimed) {
      await failPostizPublishRequest(key, message).catch(() => undefined);
    }
    const status =
      error instanceof BadRequestError
        ? 400
        : message.startsWith("Postiz ")
          ? 502
          : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}
