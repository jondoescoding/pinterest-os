---
type: operations
---

# Artifact Organization

`artifacts/` stores local visual previews, experiment outputs, and verification evidence. Git ignores the entire directory, so publish durable findings in the relevant documentation page instead of relying on an artifact file being available to another checkout. The directory must contain directories only at its top level; loose files are not allowed.

## Directory Pattern

Use the narrowest matching pattern:

| Purpose | Pattern | Example |
|---|---|---|
| Repeatable workflow output | `<workflow>/<run-type>/YYYY-MM-DD/` | `pipeline/dry-runs/2026-07-26/` |
| One-off comparison or experiment | `experiments/YYYY-MM-DD/<topic>/` | `experiments/2026-07-26/nepal-travel-poster/` |
| Durable visual reference | `references/<topic>/` | `references/brand/pinterest-os-vault-colors.png` |

Use lowercase kebab-case names. Keep a run's images and machine-readable trace or configuration files together. If two runs of the same workflow happen on one date, add a short run label below the date instead of overwriting evidence.

## References And Generated Paths

- Do not use local artifact files as required documentation links.
- Update paths in scripts, docs, and trace files when an artifact moves.
- Scripts that create artifacts must create the full purpose/date directory before writing.
- Keep secrets, downloaded dependencies, and disposable caches out of this folder.
- Before finishing, verify that the top level has no files and search the repository for each old path.

## Related

- [Development](../development.md)
- [Autonomous pipeline](../workflows/autonomous-pipeline.md)
