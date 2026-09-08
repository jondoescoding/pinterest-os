import { db } from "@/lib/db/client";
import { postizPublishRequests } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export type PostizPublishClaim =
  | { state: "claimed" }
  | { state: "conflict" }
  | { state: "in_progress" }
  | { state: "failed"; failureMessage: string | null }
  | { state: "complete"; response: unknown };

export async function claimPostizPublishRequest(
  idempotencyKey: string,
  requestHash: string,
): Promise<PostizPublishClaim> {
  const inserted = await db
    .insert(postizPublishRequests)
    .values({
      idempotencyKey,
      requestHash,
      status: "pending",
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .onConflictDoNothing()
    .returning({ idempotencyKey: postizPublishRequests.idempotencyKey });

  if (inserted.length > 0) return { state: "claimed" };

  const existing = await db
    .select()
    .from(postizPublishRequests)
    .where(eq(postizPublishRequests.idempotencyKey, idempotencyKey))
    .limit(1);
  const record = existing[0];
  if (!record) {
    throw new Error("Idempotency claim disappeared after a key conflict");
  }
  if (record.requestHash !== requestHash) return { state: "conflict" };
  if (record.status === "pending") return { state: "in_progress" };
  if (record.status === "failed") {
    return {
      state: "failed",
      failureMessage: record.failureMessage,
    };
  }
  if (record.status !== "complete" || !record.responseJson) {
    throw new Error(`Unknown idempotency record status: ${record.status}`);
  }
  return {
    state: "complete",
    response: JSON.parse(record.responseJson) as unknown,
  };
}

export async function completePostizPublishRequest(
  idempotencyKey: string,
  response: unknown,
): Promise<void> {
  const updated = await db
    .update(postizPublishRequests)
    .set({
      status: "complete",
      responseJson: JSON.stringify(response),
      failureMessage: null,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(
      and(
        eq(postizPublishRequests.idempotencyKey, idempotencyKey),
        eq(postizPublishRequests.status, "pending"),
      ),
    )
    .returning({ idempotencyKey: postizPublishRequests.idempotencyKey });
  if (updated.length === 0) {
    throw new Error("Idempotency claim was not pending at completion");
  }
}

export async function failPostizPublishRequest(
  idempotencyKey: string,
  failureMessage: string,
): Promise<void> {
  await db
    .update(postizPublishRequests)
    .set({
      status: "failed",
      failureMessage: failureMessage.slice(0, 2000),
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(
      and(
        eq(postizPublishRequests.idempotencyKey, idempotencyKey),
        eq(postizPublishRequests.status, "pending"),
      ),
    );
}
