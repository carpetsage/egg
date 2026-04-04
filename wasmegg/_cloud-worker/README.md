# egg-cloud-storage

Cloudflare Worker providing cloud backup for wasmegg tools, starting with
ascension planner plans.

## KV key scheme

```
plans:{eid_hash_16}:index          → JSON: PlanIndexEntry[]
plans:{eid_hash_16}:{plan_id}      → gzip-compressed plan JSON (binary)
settings:{eid_hash_16}:{tool_name} → JSON (future: per-tool user settings)
```

`eid_hash_16` = first 16 hex characters of SHA-256(lowercased EID).

## Setup

```bash
npm install

# Create a KV namespace
npx wrangler kv:namespace create "WASMEGG_DATA"
npx wrangler kv:namespace create "WASMEGG_DATA" --preview

# Paste the returned IDs into wrangler.toml (replace the placeholders)

# Local dev
npm run dev

# Deploy
npm run deploy
```

## Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/plans/:eid_hash` | — | List plan index |
| GET | `/v1/plans/:eid_hash/:plan_id` | — | Download gzipped plan |
| PUT | `/v1/plans/:eid_hash/:plan_id` | X-EID header | Upload / overwrite plan |
| DELETE | `/v1/plans/:eid_hash/:plan_id` | X-EID header | Delete plan |
| GET | `/v1/settings/:eid_hash/:tool` | — | Get tool settings (future) |
| PUT | `/v1/settings/:eid_hash/:tool` | X-EID header | Save tool settings (future) |

### PUT /v1/plans headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-EID` | Yes | Raw player EID — hashed and checked against `:eid_hash` param |
| `X-Plan-Name` | Yes | Plan display name |
| `X-Plan-Timestamp` | Yes | Unix millisecond timestamp as decimal string |

Request body: raw gzip-compressed plan JSON (binary).

## Client integration

Set `VITE_CLOUD_WORKER_URL` in the ascension-planner `.env.local` to the deployed
worker URL. Cloud sync controls appear in the Plan Library panel automatically.
