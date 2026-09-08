---
type: workflow
---

# Direct Postiz Publish Endpoint

Use `POST /api/publish/postiz` when the caller already has an image and wants
Pinterest OS to publish it through Postiz.

## Boundary

This endpoint:

- reads `PINTEREST_OS_API_KEY` to authenticate the caller;
- reads `POSTIZ_API_KEY` to call Postiz;
- accepts the Pinterest integration ID and board ID explicitly;
- uploads one public HTTPS image URL and creates one Pinterest post;

## Request

Send `Authorization: Bearer <PINTEREST_OS_API_KEY>`, a unique
`Idempotency-Key`, and JSON:

```json
{
  "mode": "schedule",
  "integrationId": "postiz-integration-id",
  "boardId": "pinterest-board-id",
  "title": "Pin title",
  "description": "Pin description",
  "imageUrl": "https://cdn.example.com/pin.jpg",
  "destinationUrl": "https://example.com/landing-page",
  "scheduledAt": "2026-08-15T14:00:00.000Z"
}
```

`mode` is required. Use `schedule` with `scheduledAt`, or use `now` for an
explicit immediate publish. `imageUrl` must be publicly reachable over HTTPS so
Postiz can fetch it. `destinationUrl` is optional and must use HTTPS when set.

## Response

```json
{
  "ok": true,
  "provider": "postiz",
  "idempotencyKey": "pin-0000000000000001",
  "idempotentReplay": false,
  "result": {
    "id": "postiz-post-id"
  }
}
```

The endpoint fails closed with `503` when `PINTEREST_OS_API_KEY` is absent and
returns `401` for an invalid bearer token.

## Safe Retries

Use the same `Idempotency-Key` when retrying the exact same request. Pinterest
OS saves the key before calling Postiz:

- A completed request replays its stored response with
  `"idempotentReplay": true`.
- The same key with different content returns `409`.
- A request still in progress returns `409` with `Retry-After: 5`.
- A failed or interrupted request returns `409` with
  `"reconciliationRequired": true`.

For `reconciliationRequired`, check the Postiz calendar before creating a new
key. This fail-closed behavior prevents Pinterest OS from guessing whether
Postiz accepted an interrupted request.

Run `pnpm db:push` once after installing or upgrading Pinterest OS to create the
durable request table.
