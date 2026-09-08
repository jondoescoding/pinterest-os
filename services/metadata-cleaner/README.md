# Pinterest OS Metadata Cleaner

This private VPS service accepts the final branded JPEG as binary data, removes
metadata with `remove-ai-watermarks`, and returns the cleaned file. It does not
receive Postiz or generation-provider credentials.

## Runtime

- Docker Compose binds the service to `127.0.0.1:8791`.
- Caddy provides HTTPS and proxies the dedicated metadata hostname.
- `METADATA_CLEANER_TOKEN` is required by the service.
- Pinterest OS may derive the one-purpose token from `FAL_KEY`; only the
  derived value is stored on the VPS.

## Request

```http
POST /v1/strip-metadata
Authorization: Bearer <private token>
Content-Type: image/jpeg

<binary JPEG body>
```

The response must include `X-Metadata-Stripped: true`. Requests are limited to
20 MB by default, URLs are not accepted, and temporary files live in an
ephemeral container filesystem.

## Health

```http
GET /health
```
