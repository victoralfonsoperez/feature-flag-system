# Feature Flag System

A self-hosted feature flag system with build-time and runtime flag support, GitHub Actions integration, and A/B testing capabilities.

## Live Demo

The system is deployed and publicly accessible:

- **Dashboard**: https://kanary-feature-flags.netlify.app/
- **API**: https://kanary-api.onrender.com (health check: [`/health`](https://kanary-api.onrender.com/health))

> **Note:** The Render free tier spins down after inactivity. The first request may take 30–60 seconds while the service starts up.

## Architecture

```
┌─────────────────────┐
│   Flag Dashboard    │  (React web UI)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Flag Service API   │  (Fastify + PostgreSQL)
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

## Authentication

The system uses **Auth0** for dashboard user authentication and **API tokens** for external clients (CI, curl, Postman).

- **Auth0 (RS256 JWTs)** — dashboard users log in via Auth0; the API validates tokens using Auth0's JWKS endpoint
- **API tokens** — SHA-256 hashed, created in the dashboard, sent via `Authorization: Bearer` header

### Auth Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     DASHBOARD LOGIN (Auth0)                              │
│                                                                          │
│  Browser ──▶ Auth0 Universal Login                                       │
│           ◀── redirect with authorization code                           │
│  Browser ──▶ Auth0 token exchange                                        │
│           ◀── access_token (RS256 JWT) + id_token                        │
│                                                                          │
│  Dashboard stores access_token in memory, refreshes silently             │
│  via Auth0 SDK's getAccessTokenSilently()                                │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATED REQUEST (DASHBOARD)                     │
│                                                                          │
│  Browser ──any request──▶ API                                            │
│            Authorization: Bearer <auth0-jwt>                             │
│                             │                                            │
│                             ├─▶ fetch JWKS from Auth0 (cached)           │
│                             ├─▶ verify RS256 signature                   │
│                             ├─▶ check audience & issuer                  │
│                             ├─▶ extract sub, email, roles                │
│                             ├─▶ attach user to request                   │
│           ◀── response ─────┘                                            │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL CLIENT (API TOKEN)                          │
│                                                                          │
│  Dashboard: Create token ──▶ API returns plaintext token (once)          │
│                               Stores SHA-256 hash in api_tokens          │
│                                                                          │
│  curl/CI ──request──▶ API                                                │
│            Authorization: Bearer <token>                                 │
│                           │                                              │
│                           ├─▶ try Auth0 JWT verification first           │
│                           │   (fails → fall through)                     │
│                           ├─▶ SHA-256 hash the token                     │
│                           ├─▶ lookup hash in api_tokens                  │
│                           ├─▶ update last_used_at                        │
│                           ├─▶ attach user to request                     │
│           ◀── response ───┘                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Auth0 RS256 JWTs** — tokens signed with Auth0's private key, verified via public JWKS endpoint
- **Dual auth strategy** — Auth0 JWT checked first, then API token hash lookup as fallback
- **Role-based access** — roles extracted from custom `https://kanary.dev/roles` claim in the Auth0 token
- **JWKS caching** — Auth0 public keys fetched once and cached in memory
- **API tokens stored as SHA-256 hashes** — plaintext shown only once at creation
- **Public reads, authenticated writes** — `GET /api/flags` is public; all mutations require auth

## Packages

| Package | Description |
|---|---|
| `packages/api` | Flag Service API — Fastify + PostgreSQL CRUD, webhook trigger |
| `packages/dashboard` | Flag Dashboard — React + Tailwind web UI |
| `packages/sdk` | Client SDK — React provider & hooks for runtime flags |

## Usage Guide

See [docs/USAGE.md](./docs/USAGE.md) for a complete guide on integrating feature flags into your app, covering both runtime (React SDK) and build-time scenarios.

## Getting Started

### Prerequisites

- Node.js (see `.nvmrc` for version)
- An **Auth0 tenant** (free tier works)

### 1. Set up Auth0

1. **Create an Auth0 account** at [auth0.com](https://auth0.com) if you don't have one.

2. **Create a Single Page Application** in Auth0:
   - Go to **Applications > Create Application > Single Page Web Applications**
   - Note the **Domain** and **Client ID** from the app's Settings tab
   - Under **Allowed Callback URLs**, add: `http://localhost:5173`
   - Under **Allowed Logout URLs**, add: `http://localhost:5173`
   - Under **Allowed Web Origins**, add: `http://localhost:5173`
   - If running via Docker Compose, also add `http://localhost:3200` to all three fields above

3. **Create an API** in Auth0:
   - Go to **Applications > APIs > Create API**
   - Set the **Identifier (Audience)** to something like `https://api.kanary.dev` (this is a logical identifier, not an actual URL)
   - Signing Algorithm: **RS256**

4. **Add roles** (optional but recommended):
   - Go to **User Management > Roles**
   - Create an `admin` role and a `viewer` role
   - Assign the `admin` role to your user

5. **Add a custom claim for roles** via an Auth0 Action:
   - Go to **Actions > Flows > Login**
   - Create a custom Action with this code:
     ```js
     exports.onExecutePostLogin = async (event, api) => {
       const namespace = 'https://kanary.dev';
       const roles = event.authorization?.roles || [];
       api.accessToken.setCustomClaim(`${namespace}/roles`, roles);
       api.idToken.setCustomClaim(`${namespace}/roles`, roles);
     };
     ```
   - Drag it into the Login flow and **Deploy**

### 2. Configure environment variables

**API** — copy `packages/api/.env.example` to `packages/api/.env`:

```bash
cp packages/api/.env.example packages/api/.env
```

Fill in:
```
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.kanary.dev
```

**Dashboard** — copy `packages/dashboard/.env.example` to `packages/dashboard/.env`:

```bash
cp packages/dashboard/.env.example packages/dashboard/.env
```

Fill in:
```
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://api.kanary.dev
VITE_AUTH0_CALLBACK_URL=http://localhost:5173
```

### 3. Run locally

```bash
nvm use            # switch to the required Node version (see .nvmrc)
npm install
npm run dev        # start all packages in dev mode
```

Visit `http://localhost:5173` — you'll be redirected to the Auth0 login page.

### API only

```bash
npm run dev -w packages/api
```

### Dashboard only

```bash
npm run dev -w packages/dashboard
```

## Docker

### Full stack with Docker Compose

Run PostgreSQL, the API, and the dashboard together:

```bash
docker compose up --build
```

The API reads `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` from a `.env` file in the project root (or you can export them). Create one if you haven't:

```bash
# .env (project root — used by docker compose)
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.kanary.dev
```

The dashboard bakes `VITE_*` variables at build time. Set them in `packages/dashboard/.env` **before** building:

```bash
# packages/dashboard/.env
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://api.kanary.dev
VITE_AUTH0_CALLBACK_URL=http://localhost:3200
```

> **Note:** When running via Docker Compose the dashboard is served at `http://localhost:3200`, so set `VITE_AUTH0_CALLBACK_URL` to that and make sure it's in your Auth0 allowed URLs.

This starts:
- **PostgreSQL** on port 5432 (internal only)
- **API** at `http://localhost:3100`
- **Dashboard** at `http://localhost:3200` (nginx serving the built React app, proxying `/api` to the API container)

PostgreSQL data is persisted in a Docker volume (`pgdata`), so flags survive container restarts. To start fresh, remove the volume:

```bash
docker compose down -v
```

### Running Tests

API tests require a running PostgreSQL instance. A separate test compose file is provided:

```bash
docker compose -f docker-compose.test.yml up -d   # start test PostgreSQL on port 5433
npm test -w packages/api                            # run API tests
docker compose -f docker-compose.test.yml down      # stop test PostgreSQL
```

Or use the convenience scripts:

```bash
npm run test:db:up -w packages/api    # start test PostgreSQL
npm test -w packages/api              # run tests
npm run test:db:down -w packages/api  # stop test PostgreSQL
```

### Environment Variables

#### API (`packages/api/.env`)

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/db`) | Yes |
| `AUTH0_DOMAIN` | Auth0 tenant domain (e.g. `your-tenant.us.auth0.com`) | Yes |
| `AUTH0_AUDIENCE` | Auth0 API identifier (e.g. `https://api.kanary.dev`) | Yes |
| `PORT` | Port to listen on (default: `3100`) | No |
| `GITHUB_PAT` | GitHub Personal Access Token for webhook dispatch | No |
| `GITHUB_OWNER` | GitHub repository owner for webhook dispatch | No |
| `GITHUB_REPO` | GitHub repository name for webhook dispatch | No |
| `WEBHOOK_URL` | Slack/Discord webhook URL for flag change notifications | No |

#### Dashboard (`packages/dashboard/.env`)

| Variable | Description | Required |
|---|---|---|
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain (must match API's `AUTH0_DOMAIN`) | Yes |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA application Client ID | Yes |
| `VITE_AUTH0_AUDIENCE` | Auth0 API identifier (must match API's `AUTH0_AUDIENCE`) | Yes |
| `VITE_AUTH0_CALLBACK_URL` | Redirect URL after login (e.g. `http://localhost:5173`) | Yes |

## Deployment

For production deployment instructions covering Supabase, Render, and Netlify, see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full implementation plan. The project has reached **v1.0** with all core features complete: API, dashboard, SDK, A/B testing, Auth0 authentication, and production deployment.
