# Pinterest OS

Pinterest OS is a self-hosted tool for planning, tracking, and publishing
Pinterest content through Postiz.

It does not require access to another content platform. You supply the image,
text, destination URL, Postiz connection, and Pinterest board.

## Features

- Manage campaigns, content, schedules, and Pinterest boards.
- Read connected Pinterest channels from Postiz.
- Publish an existing public HTTPS image through Postiz.
- Prevent duplicate direct publishes with durable request keys.
- Store operational data in local libSQL or remote Turso.
- Protect all pages and API routes with operator credentials.

## Architecture

```text
Operator or trusted automation
              |
              v
       Pinterest OS API
          |         |
          |         +--> Postiz --> Pinterest
          |
          +--> libSQL or Turso
```

Provider credentials stay on the server. Do not use a `NEXT_PUBLIC_` prefix
for a secret because that prefix sends the value to the browser.

## Quickstart

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local`.
3. Set the access and Postiz credentials.
4. Run `pnpm db:push`.
5. Run `pnpm dev` and open [localhost](http://localhost:3000).

## Direct Postiz Publishing

`POST /api/publish/postiz` publishes one existing image through Postiz.

```bash
curl --request POST http://localhost:3000/api/publish/postiz \
  --header "Authorization: Bearer $PINTEREST_OS_API_KEY" \
  --header "Idempotency-Key: pin-0000000000000001" \
  --header "Content-Type: application/json" \
  --data '{
    "mode": "schedule",
    "integrationId": "postiz-integration-id",
    "boardId": "pinterest-board-id",
    "title": "Pin title",
    "description": "Pin description",
    "imageUrl": "https://cdn.example.com/pin.jpg",
    "destinationUrl": "https://example.com/landing-page",
    "scheduledAt": "2026-10-15T14:00:00.000Z"
  }'
```

An `Idempotency-Key` is a unique request label. Pinterest OS saves it before
it calls Postiz. A safe retry with the same body does not create a second post.
See [the endpoint contract](docs/workflows/postiz-direct-endpoint.md).

## Configuration

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | Local libSQL file or remote Turso database |
| `DATABASE_AUTH_TOKEN` | Remote only | Turso authentication token |
| `PINTEREST_OS_USERNAME` | Dashboard | Browser login name |
| `PINTEREST_OS_PASSWORD` | Dashboard | Browser password |
| `PINTEREST_OS_API_KEY` | API use | Machine-to-machine access token |
| `POSTIZ_API_KEY` | Publishing | Server-side Postiz credential |
| `POSTIZ_BASE_URL` | No | Alternative Postiz public API origin |

See [`.env.example`](.env.example) for optional settings. Never commit local
environment files, databases, provider keys, access tokens, or private media.

## Security

Pinterest OS is for one trusted operator or one trusted team.

- Use HTTPS outside localhost.
- Use different random values for the browser password and machine API key.
- Give the Postiz credential only the access that this deployment needs.
- Rotate a credential if it appears in Git, logs, screenshots, or tickets.
- Back up the database before live publishing.

Requests fail with `503` when access control is not configured. Invalid
credentials receive `401`. Read [the deployment security guide](docs/security.md)
and [the security policy](SECURITY.md).

## Verification

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
pnpm audit --prod --audit-level=high
```

## License

Pinterest OS uses the [Apache License 2.0](LICENSE). Read
[CONTRIBUTING.md](CONTRIBUTING.md) before you submit a change.
