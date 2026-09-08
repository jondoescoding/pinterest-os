---
type: guide
---

# Development

## Commands

| Task | Command |
|---|---|
| Dev server | `pnpm dev` |
| Typecheck | `pnpm typecheck` |
| Test | `pnpm test` |
| Lint / format | `pnpm lint` / `pnpm lint:fix` |
| Push DB schema | `pnpm db:push` |
| Build | `pnpm build` |

`pnpm typecheck` runs `tsgo --noEmit`. Tsgo is authoritative; Next ignores its bundled TypeScript build errors so bundling and type ownership remain separate.

## Engineering rules

- Prefer the smallest solution that works and reuse installed dependencies.
- Fetch independent data in parallel; avoid request waterfalls.
- Memoize only to fix a measured problem.
- Prefer composition and precise discriminated unions over boolean-prop growth and loose optional state.
- Cover meaningful logic with unit or integration tests; reserve end-to-end tests for critical flows.
- Preserve unrelated dirty-worktree changes.

## Secrets

Keep `FAL_KEY`, `POSTIZ_API_KEY`, `DATABASE_URL`, and `DATABASE_AUTH_TOKEN` in `.env.local`. Never copy secrets into documentation or artifacts.

## System dependencies

Install `remove-ai-watermarks` for autonomous scheduling:

```powershell
uv tool install remove-ai-watermarks
```

The executable must be on `PATH`. Metadata stripping is a hard runtime dependency for the autonomous pipeline. The Python implementation works in development and self-hosted environments, not Vercel serverless.

## Related

- [Architecture](architecture.md)
- [Design standards](design/design-standards.md)
- [Image metadata stripping](integrations/metadata-stripping.md)
- [Artifact organization](operations/artifacts.md)
- [Task tracking](operations/task-tracking.md)
