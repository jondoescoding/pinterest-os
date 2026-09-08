# Poster assets

This directory is the only source for deterministic poster composition assets.
Do not fetch logos, overlays, templates, masks, or fonts at runtime.

- Add your own transparent wordmark when you configure branded posters.
- `templates/`: optional full-canvas 1000 × 1500 PNG, SVG, or WebP overlays.
- `fonts/`: optional WOFF2, WOFF, or TTF brand fonts.
- `masks/`: optional 1000 × 1500 PNG or SVG masks used by a template revision.

Configure repo-relative paths with `POSTER_LOGO_PATH`,
`POSTER_TEMPLATE_ASSET_PATH`, and `POSTER_FONT_PATH`. The composer hashes the
configured files into `compositionAssetVersion`. Set `POSTER_ASSET_VERSION`
only when an explicit human-readable release label is required.

Never commit licensed font files unless the repository has redistribution
rights.
