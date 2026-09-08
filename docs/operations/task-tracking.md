---
type: operations
---

# Task Tracking

Use Personal Vault v2 directly. Do not add a repository-local tracking helper or hard-code a planning project ID.

## Entry points

- Source repo: `C:\Users\Jonathan\Documents\CODING\PERSONAL\personal-vault-v2`
- Production Goals API: `https://jons-personal-vault.vercel.app/api/vault/goals`
- Live discovery: `GET https://jons-personal-vault.vercel.app/api/vault/agent/endpoints`
- Local CLI: run `pnpm vault help` from the Personal Vault v2 `frontend/` directory

Track new Pinterest OS work in the current Goals hierarchy and task dossiers. After a mutation, read the saved record instead of assuming success.

## Related

- [Development](../development.md)
- [Architecture](../architecture.md)
