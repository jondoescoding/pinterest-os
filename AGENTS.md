# Pinterest OS

Start with [the documentation quickstart](docs/quickstart.md), then follow its links to the relevant concept.

## Required references

- [Architecture](docs/architecture.md)
- [Development and verification](docs/development.md)
- [Design standards](docs/design/design-standards.md)
- [Image metadata stripping](docs/integrations/metadata-stripping.md)
- [Workflows and integrations index](docs/index.md)
- [Artifact organization](docs/operations/artifacts.md)
- [Task tracking](docs/operations/task-tracking.md)

For metadata-cleaner service changes, read
[Image metadata stripping](docs/integrations/metadata-stripping.md) and
`services/metadata-cleaner/README.md`. That service is intentionally separate
VPS-ready code: it accepts binary image uploads only, never remote URLs or
Postiz or provider credentials.

Keep this file lean. Put durable detail in the linked knowledge graph and update the smallest relevant page when behavior changes.
