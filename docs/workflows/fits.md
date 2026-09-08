---
type: workflow
---

# FITS / Gym-Girl Product-Set Pipeline

Local source files:
- Product search client: `lib/channel3.ts`
- Set composition, collage rendering, copy, scheduling, and publishing: `lib/fits/`
- FITS tables: `sets`, `set_items`, `used_products` in `lib/db/schema.ts`
- Daily runner: `scripts/fits-daily.ts`

## Current Direction

Preserve the V1 gym-girl aesthetic and existing Turso/libSQL database direction. The current launch work tests complete Pinterest boards, not isolated one-off pins.

There is one supported flow:

| Flow | Command | Purpose |
|---|---|---|
| FITS daily product sets | `pnpm fits:daily -- --dry-run` / `pnpm fits:daily` | Searches Channel3 products, composes outfit/product sets, renders collages, stores them, and schedules Pinterest pins. |
| FITS sample collages | `pnpm fits:sample` | Renders sample collage output under `out/fits/` for visual checks. |

## Data And External Services

FITS uses `CHANNEL3_API_KEY` to search products. A publishable product must have:
- an in-stock offer,
- a positive commission,
- a price inside the slot's configured band,
- a cleaned image URL,
- a usable buy URL.

Live FITS publishing uses Postiz and Telegram:
- `POSTIZ_API_KEY` plus `targetBoardIntegrationId` and `targetPinterestBoardId` in `app_settings` are required before scheduling.
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are required for live `fits:daily` reports.
- Dry runs do not require Postiz or Telegram secrets.

## Storage

The standard campaign/content/schedule tables still back the manual generation-set flow.

The FITS daily product-set flow writes:
- `sets`: one product-set/collage candidate, with `draft`, `published`, or `failed` status.
- `set_items`: selected products inside each set.
- `used_products`: product reuse guardrail for recent Channel3 products.

`product_hash` is unique, so repeated product combinations are skipped instead of duplicated.

## Operating Notes For Codex

- Use `--dry-run` before live daily publishing runs.
- Keep Pinterest board IDs in settings or environment-backed app state, not docs.
- If documenting behavior changes, update this file and the smallest relevant API reference instead of creating a new top-level spec.
