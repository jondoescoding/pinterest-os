---
type: integration
---

# Postiz Public API

Source:
- API overview: https://docs.postiz.com/public-api
- Docs index: https://docs.postiz.com/llms.txt
- OpenAPI JSON: https://docs.postiz.com/public-api/openapi.json
- Pinterest settings: https://docs.postiz.com/public-api/providers/pinterest.md
- TikTok settings: https://docs.postiz.com/public-api/providers/tiktok.md

Local client:
- File: `lib/postiz.ts`
- Base URL: `POSTIZ_BASE_URL`, default `https://api.postiz.com/public/v1`
- Auth: `Authorization: ${POSTIZ_API_KEY}`. Do not prefix with `Bearer`.
- Terminology: Postiz UI says "channel"; the API says "integration".

## Endpoints Used By Pinterest OS

| Local function | Method | Path | Purpose |
|---|---:|---|---|
| `listIntegrations()` | GET | `/integrations` | List connected channels. The app filters platforms to Pinterest and TikTok. |
| `listPosts(startDate, endDate)` | GET | `/posts?startDate=...&endDate=...` | List posts within an ISO date range. |
| `uploadImageFromUrl(url)` | POST | `/upload-from-url` | Fetch a public image URL into Postiz media storage. |
| `createPost(input)` | POST | `/posts` | Create or schedule a post using uploaded media IDs. |

Operationally used in cleanup flows:

| Method | Path | Purpose |
|---:|---|---|
| DELETE | `/posts/{id}` | Delete a post by ID; Postiz deletes all posts in the same group. |

## Available Public API Endpoints

The Postiz OpenAPI document currently exposes:

| Method | Path | Summary |
|---:|---|---|
| GET | `/integrations` | List all integrations |
| GET | `/groups` | List all groups/customers |
| DELETE | `/integrations/{id}` | Delete a channel |
| GET | `/social/{integration}` | Get OAuth URL for a channel |
| GET | `/integration-settings/{id}` | Get integration settings and tools |
| POST | `/integration-trigger/{id}` | Trigger an integration tool |
| GET | `/is-connected` | Check connection status |
| GET | `/find-slot/{id}` | Find next available slot |
| GET | `/posts` | List posts |
| POST | `/posts` | Create a post |
| DELETE | `/posts/{id}` | Delete a post by ID |
| DELETE | `/posts/group/{group}` | Delete a post by group |
| GET | `/posts/{id}/missing` | Get missing content |
| PUT | `/posts/{id}/release-id` | Update release ID |
| PUT | `/posts/{id}/status` | Change post status |
| GET | `/analytics/{integration}` | Get platform analytics |
| GET | `/analytics/post/{postId}` | Get post analytics |
| POST | `/upload` | Upload a file |
| POST | `/upload-from-url` | Upload from URL |
| GET | `/notifications` | List notifications |
| POST | `/generate-video` | Generate a video |
| POST | `/video/function` | Video function |

## Create Post Shape Used Here

`createPost` uploads each image first, then sends a Postiz post payload:

```json
{
  "type": "schedule",
  "date": "2026-06-30T14:00:00.000Z",
  "shortLink": false,
  "tags": [],
  "posts": [
    {
      "integration": { "id": "postiz-integration-id" },
      "value": [
        {
          "content": "caption text",
          "image": [{ "id": "media-id", "path": "media-path" }]
        }
      ],
      "settings": {
        "__type": "pinterest",
        "board": "pinterest-board-id",
        "title": "Pin title",
        "link": "",
        "dominant_color": ""
      }
    }
  ]
}
```

## Pinterest Settings

Postiz requires this settings object for Pinterest:

| Field | Required | Notes |
|---|---:|---|
| `__type` | yes | Must be `pinterest`. |
| `board` | yes | Pinterest board ID, not the Postiz integration ID. |
| `title` | no | Max 100 characters. The client slices to 100. |
| `link` | no | Destination URL. |
| `dominant_color` | no | Hex color hint. |

Important: `/integrations` returns connected Pinterest accounts/channels. It does not reliably return Pinterest board IDs. Board IDs need to come from Postiz UI/provider tooling or Pinterest directly.

## TikTok Settings

Postiz documents this TikTok settings shape:

```json
{
  "__type": "tiktok",
  "title": "",
  "privacy_level": "PUBLIC_TO_EVERYONE",
  "duet": false,
  "stitch": false,
  "comment": true,
  "autoAddMusic": "no",
  "brand_content_toggle": false,
  "brand_organic_toggle": false,
  "video_made_with_ai": false,
  "content_posting_method": "DIRECT_POST"
}
```

Pinterest OS currently normalizes and allows TikTok channels, but the `createPost` settings builder only has a minimal generic fallback for non-Pinterest platforms. Add a TikTok-specific settings builder before scheduling real TikTok videos.

## Notes For Codex

- Keep channel filtering in code: `isAllowedChannelPlatform` should allow only `pinterest` and `tiktok` for this project.
- `POST /upload-from-url` requires the source media URL to be public HTTPS and fetchable by Postiz.
- Postiz public API docs state a rate limit of 30 requests per hour. Batch jobs should pace uploads and scheduling.
- `GET /posts` requires a date range. Always pass `startDate` and `endDate`.
- Prefer draft or schedule posts during QA. Use `type: "now"` only for deliberate immediate publishing.
