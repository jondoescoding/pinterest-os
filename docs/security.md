---
type: guide
---

# Deployment Security

## Access Control

Pinterest OS middleware protects every dashboard page and API route.

Configure at least one access method:

| Caller | Required variables | Header |
|---|---|---|
| Browser operator | `PINTEREST_OS_USERNAME`, `PINTEREST_OS_PASSWORD` | Browser Basic authentication |
| Trusted automation | `PINTEREST_OS_API_KEY` | `Authorization: Bearer <token>` |

When neither method is configured, requests fail with `503`. Invalid credentials
receive `401`. There is no production bypass flag or hardcoded fallback secret.

Basic authentication means the browser sends a username and password with each
request. It is acceptable only over HTTPS. For multiple users, single sign-on,
or role-based permissions, put Pinterest OS behind an identity-aware proxy and
keep this middleware as a second security layer.

## Direct Publish Duplicate Protection

Every direct Postiz publish requires an `Idempotency-Key`, a caller-generated
label that identifies one intended post. Pinterest OS stores the key and a
fingerprint of the request before contacting Postiz.

- A completed retry returns the saved response without creating another post.
- Reusing a key with different content returns `409`.
- A concurrent request with the same key returns `409`.
- An interrupted or failed request is locked for manual Postiz reconciliation.

Run `pnpm db:push` during deployment so the
`postiz_publish_requests` table exists before this endpoint receives traffic.

## Credential Separation

Use a different random value for `PINTEREST_OS_PASSWORD` and
`PINTEREST_OS_API_KEY`. Provider keys must never be reused as application access
credentials.

Keep these boundaries separate:

- Pinterest OS credentials authenticate operators and automation.
- `POSTIZ_API_KEY` authenticates Pinterest OS to Postiz.
- `FAL_KEY` and other model-provider keys remain server-side.
- `DATABASE_AUTH_TOKEN` only authenticates the remote database client.

## Network Boundary

- Terminate HTTPS before requests reach Pinterest OS.
- Restrict database and metadata-cleaner access to trusted networks.
- Do not expose `.env.local`, database files, artifacts, or source maps.
- Send provider errors to protected logs, not public monitoring pages.
- Back up the database and test restoration before live publishing.

## Release Gate

Before a public release or production deployment:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
pnpm audit --prod --audit-level=high
gitleaks git --redact --no-banner
```

`gitleaks git` scans the complete reachable Git history. If it finds a real
credential, rotate the credential before deciding whether history also needs to
be rewritten.
