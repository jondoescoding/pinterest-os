---
type: architecture
---

# Architecture

Pinterest OS is a Next.js 15 App Router application using React 19, TypeScript, Turso/libSQL, Drizzle ORM, and Vercel.

## Structure

```text
app/            pages, shared components, and route handlers
app/api/        decoupled, independently retryable endpoints
lib/            service clients and domain logic
lib/db/         Drizzle schema and libSQL client
scripts/        operational and verification entry points
```

Keep server components as the default. Add `"use client"` only for hooks or browser interaction.

## API boundary

Each endpoint performs one independently retryable job such as pulling a template, generating an image, saving content, scheduling a post, or reading the calendar. Keep writes idempotent where possible.

Autonomous images are stripped of provenance and generation metadata after poster composition and before the single Postiz upload. The independently retryable `POST /api/image/strip-metadata` route exposes the same operation for an image URL. FITS collage publishing is outside this guarantee.

## Data model

`campaigns` map one-to-one to a Pinterest board/Postiz integration. Campaigns own `content_items`, which preserve image, copy, and provenance. `schedules` mirror Postiz scheduling state. The authoritative schema is `lib/db/schema.ts`.

## Related

- [Autonomous pipeline](workflows/autonomous-pipeline.md)
- [FITS product-set pipeline](workflows/fits.md)
- [Image metadata stripping](integrations/metadata-stripping.md)
- [Postiz](integrations/postiz.md)
