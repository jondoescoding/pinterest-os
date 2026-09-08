---
type: integration
title: Image Metadata Stripping
---

# Image Metadata Stripping

Every image scheduled by the autonomous pipeline is cleaned after poster composition and before its single Postiz media upload.

```text
composeFinalPoster()
  -> stripImageMetadata()
  -> uploadImageBuffer()
```

This placement in `lib/pipeline.ts` is the chokepoint: every autonomous image scheduled through `runAutonomousItem()` passes through it.

## What is removed

`lib/strip-metadata.ts` invokes the Python `remove-ai-watermarks` CLI in `metadata` mode with `--remove` and `--remove-all`. It removes:

- EXIF, XMP, and IPTC records;
- C2PA manifests;
- PNG text chunks containing generation parameters;
- TC260 AIGC labels;
- vendor and AI-generation signatures handled by the upstream metadata remover.

The operation is lossless and idempotent. Lossless means image pixels are unchanged and JPEG data is not re-encoded. Idempotent means stripping an already-clean image produces the same clean result without a new side effect.

Visible-watermark inpainting and invisible or SynthID diffusion removal are intentionally excluded. The fal-hosted FLUX and SDXL-family models used here do not embed SynthID, and invisible-mark removal would alter pixels.

## Library API

- `stripImageMetadata(buffer, filename)` writes temporary input/output files, invokes the CLI, and returns the clean buffer.
- `stripImageUrlMetadata(url)` downloads an image without caching, strips it, and returns `{ buffer, contentType }`.
- Temporary files are removed in a `finally` block.

## HTTP endpoint

`POST /api/image/strip-metadata`

Request:

```json
{ "imageUrl": "https://example.com/image.png" }
```

Success returns the cleaned binary image with `Content-Type`, `Content-Length`, and `X-Metadata-Stripped: true`.

Invalid JSON or a missing `imageUrl` returns status `400` using `{ "ok": false, "error": "..." }`. Download and CLI failures return status `502` using the same error shape. Re-stripping a clean image returns `200`.

The endpoint follows the one-job-per-endpoint rule, so callers can retry metadata cleaning independently.

## Runtime constraint

Install the hard dependency:

```powershell
uv tool install remove-ai-watermarks
```

The executable must be on `PATH`. The current Python implementation is for development and self-hosted operation; Vercel serverless has no Python binary. A TypeScript PNG/JPEG port is a deferred option, not current behavior.

Production Pinterest OS may instead call the dedicated VPS service under
`services/metadata-cleaner/`. The app sends the final branded JPEG as binary
data to `METADATA_CLEANER_URL`; the service returns the cleaned binary with
`X-Metadata-Stripped: true`. It accepts no remote URLs and holds no Postiz,
Postiz, or generation-provider credential. When
`METADATA_CLEANER_TOKEN` is omitted, Pinterest OS derives a one-purpose token
from `FAL_KEY`; only that derived token is stored on the VPS.

## Private Service

The metadata-cleaner service is tracked code, not an artifact. It lives in
`services/metadata-cleaner/` and is the deployment unit for self-hosted metadata
stripping:

| File | Purpose |
|---|---|
| `services/metadata-cleaner/server.py` | HTTP service with `/health` and `POST /v1/strip-metadata`. |
| `services/metadata-cleaner/Dockerfile` | Container image with Python and `remove-ai-watermarks`. |
| `services/metadata-cleaner/docker-compose.yml` | Local/VPS process binding for the private service. |
| `services/metadata-cleaner/Caddyfile.example` | HTTPS reverse-proxy example. |
| `services/metadata-cleaner/.env.example` | Non-secret environment variable template. |
| `services/metadata-cleaner/README.md` | Operator-facing request, auth, and health contract. |

`tests/metadata-cleaner-client.test.ts` covers the Pinterest OS client path that
calls this private service when `METADATA_CLEANER_URL` is configured.

## Scope boundary

`lib/fits/publisher.ts` uploads collages through `uploadImageBuffer` but was intentionally left unchanged. Do not claim that every upload in the entire repository is stripped; the guarantee currently applies to the autonomous scheduling path in `lib/pipeline.ts`.

## Verification evidence

- Stable Diffusion generation parameters were removed from a dirty PNG and verified with `remove-ai-watermarks identify`.
- Endpoint behavior was verified for `200` binary success, `400` missing input, `502` unreachable URL, and idempotent re-stripping.
- `pnpm typecheck` passed after implementation.

## Related

- [Architecture](../architecture.md)
- [Autonomous pipeline](../workflows/autonomous-pipeline.md)
- [Development](../development.md)
