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
nvm use            # switch to the required Node version (see .nvmrc)
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

## Docker

Build and run the API as a container:

```bash
docker build -t feature-flag-api .
docker run -p 3100:3100 -e API_TOKEN=your-secret-token feature-flag-api
```

The API will be available at `http://localhost:3100`. The image uses a multi-stage build — native dependencies (`better-sqlite3`) are compiled in a build stage, and only the runtime artifacts are copied to the final slim image.

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `API_TOKEN` | Bearer token for authenticating mutating requests (POST, PUT, DELETE) | Yes |
| `PORT` | Port to listen on (default: `3100`) | No |
| `GITHUB_PAT` | GitHub Personal Access Token for webhook dispatch | No |
| `GITHUB_OWNER` | GitHub repository owner for webhook dispatch | No |
| `GITHUB_REPO` | GitHub repository name for webhook dispatch | No |

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full implementation plan — 7 phases over 12 weeks (~81 hours total at 5–10h/week).
