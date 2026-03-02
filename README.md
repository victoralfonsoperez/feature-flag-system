# Feature Flag System

A self-hosted feature flag system with build-time and runtime flag support, GitHub Actions integration, and A/B testing capabilities.

## Architecture

```
┌─────────────────────┐
│   Flag Dashboard    │  (React web UI)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Flag Service API   │  (Fastify + SQLite)
│                     │
│  GET  /flags        │
│  PUT  /flags/:key   │
│  POST /flags        │
│  DELETE /flags/:key │
└────────┬───────┬────┘
         │       │
    ┌────┘       └─────┐
    ▼                   ▼
 Scenario 1          Scenario 2
 webhook →           client fetches
 GitHub Actions      flags on load
 rebuild + deploy    renders dynamically
```

## Packages

| Package | Description |
|---|---|
| `packages/api` | Flag Service API — Fastify + SQLite CRUD, webhook trigger |
| `packages/dashboard` | Flag Dashboard — React + Tailwind web UI |
| `packages/sdk` | Client SDK — React provider & hooks for runtime flags |

## Getting Started

```bash
npm install
npm run dev        # start all packages in dev mode
```

### API only

```bash
npm run dev -w packages/api
```

### Dashboard only

```bash
npm run dev -w packages/dashboard
```

## Implementation Phases

- [ ] Phase 1: Flag Service API (CRUD + SQLite)
- [ ] Phase 2: GitHub webhook trigger
- [ ] Phase 3: GitHub Actions workflow
- [ ] Phase 4: Flag Dashboard UI
- [ ] Phase 5: Client SDK (FlagProvider)
- [ ] Phase 6: A/B variant assignment logic
- [ ] Phase 7: End-to-end testing
