# Contributing to Pinterest OS

## Before You Start

1. Read [AGENTS.md](AGENTS.md) and the relevant page in [docs](docs/index.md).
2. Search existing issues and pull requests for overlapping work.
3. Keep provider credentials and customer content out of the repository.
4. Open an issue before a large architectural or database change.

## Local Setup

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm db:push
pnpm dev
```

Use synthetic credentials and data. Never point tests at another person's
Postiz, Pinterest, or Turso account.

## Change Requirements

- Keep route handlers small and move reusable business rules into `lib/`.
- Validate request fields and authenticate every new mutation.
- Make external publishing retry-safe where the provider permits it.
- Add focused tests for changed behavior.
- Update the smallest relevant documentation page.

## Verification

Run the complete local gate:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
pnpm audit --prod --audit-level=high
```

## Pull Requests

1. Use a focused branch and keep unrelated changes out.
2. Explain the behavior change and security impact.
3. List the exact verification commands that passed.
4. Include screenshots for user-visible desktop and mobile changes.
5. Mark any live provider call or data migration explicitly.

Contributions are licensed under the
[Apache License 2.0](LICENSE), as described in Section 5 of that license.
