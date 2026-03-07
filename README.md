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

## Authentication

The system uses **JWT-based auth** with two tokens for dashboard users, and per-user API tokens for external clients (CI, curl, Postman):

- **Access token** — short-lived JWT (5 min), sent as an httpOnly cookie
- **Refresh token** — longer-lived JWT (4 hours), its JTI stored server-side in SQLite for revocation
- **API tokens** — SHA-256 hashed, for external tools via `Authorization: Bearer` header

### Auth Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          FIRST-TIME SETUP                                │
│                                                                          │
│  Browser ──GET /api/auth/status──▶ API                                   │
│           ◀── { setupRequired: true } ──┘                                │
│                                                                          │
│  Browser ──POST /api/auth/setup──▶ API                                   │
│            { email, password }    │                                       │
│                                   ├─▶ hash password (scrypt)             │
│                                   ├─▶ INSERT into users                  │
│                                   ├─▶ sign access JWT (5 min)            │
│                                   ├─▶ sign refresh JWT (4h) + store JTI  │
│           ◀── Set-Cookie: access_token  (httpOnly, sameSite=lax) ──┐     │
│           ◀── Set-Cookie: refresh_token (httpOnly, sameSite=lax) ──┘     │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                          DASHBOARD LOGIN                                 │
│                                                                          │
│  Browser ──POST /api/auth/login──▶ API                                   │
│            { email, password }    │                                       │
│                                   ├─▶ verify password (scrypt)           │
│                                   ├─▶ sign access JWT (5 min)            │
│                                   ├─▶ sign refresh JWT (4h) + store JTI  │
│           ◀── Set-Cookie: access_token + refresh_token ──────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATED REQUEST (DASHBOARD)                     │
│                                                                          │
│  Browser ──any request──▶ API                                            │
│            Cookie: access_token, refresh_token                           │
│                             │                                            │
│                             ├─▶ verify access_token JWT (HMAC-SHA256)    │
│                             │   ├─ valid ──▶ attach user, proceed        │
│                             │   └─ expired ──▼                           │
│                             │                                            │
│                             ├─▶ check refresh_token JWT                  │
│                             │   ├─ valid + JTI in DB ──▶ issue new       │
│                             │   │   access_token cookie, proceed         │
│                             │   └─ invalid ──▶ 401                       │
│                             │                                            │
│  (transparent to the client — refresh happens automatically              │
│   inside the middleware, no extra round-trip needed)                      │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│              EXPLICIT REFRESH (client-side fallback)                     │
│                                                                          │
│  Dashboard catches 401 ──POST /api/auth/refresh──▶ API                   │
│                           Cookie: refresh_token   │                      │
│                                                   ├─▶ verify refresh JWT │
│                                                   ├─▶ check JTI in DB   │
│                           ◀── Set-Cookie: new access_token ──────────┘   │
│                           retry original request                         │
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
│                           ├─▶ SHA-256 hash the token                     │
│                           ├─▶ lookup hash in api_tokens                  │
│                           ├─▶ update last_used_at                        │
│                           ├─▶ attach user to request                     │
│           ◀── response ───┘                                              │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                         AUTH MIDDLEWARE ORDER                             │
│                                                                          │
│  Incoming request                                                        │
│       │                                                                  │
│       ▼                                                                  │
│  1. access_token cookie?                                                 │
│     ├─ YES + valid JWT ──▶ attach user ──▶ done                          │
│     └─ NO or expired ──▼                                                 │
│                                                                          │
│  2. refresh_token cookie?                                                │
│     ├─ YES + valid JWT + JTI in DB ──▶ new access_token cookie           │
│     │                                  attach user ──▶ done              │
│     └─ NO or invalid ──▼                                                 │
│                                                                          │
│  3. Authorization: Bearer header?                                        │
│     ├─ YES ──▶ SHA-256 hash ──▶ lookup in api_tokens                     │
│     │   ├─ found ──▶ attach user ──▶ done                                │
│     │   └─ not found ──▶ 401                                             │
│     └─ NO ──▶ 401                                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **JWT access + refresh tokens** — short-lived access (5 min) with longer refresh (4h) for balance of security and UX
- **Refresh token JTI stored in DB** — enables server-side revocation (logout invalidates immediately)
- **Transparent refresh in middleware** — no extra round-trip; expired access tokens are silently reissued if refresh is valid
- **httpOnly cookies** — not accessible to JavaScript, mitigates XSS
- **sameSite: lax** — prevents CSRF while allowing normal navigation
- **HMAC-SHA256 JWT signing** — using `JWT_SECRET` env var, Node.js built-in `crypto`
- **scrypt password hashing** — with 16-byte random salt, constant-time comparison
- **API tokens stored as SHA-256 hashes** — plaintext shown only once at creation

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

On first launch, visit the dashboard and create the initial admin account through the setup form.

### Headless setup (Docker / CI)

```bash
npm run seed:admin -w packages/api -- admin@example.com yourpassword
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
docker run -p 3100:3100 -e JWT_SECRET=your-random-secret feature-flag-api
```

The API will be available at `http://localhost:3100`. The image uses a multi-stage build — native dependencies (`better-sqlite3`) are compiled in a build stage, and only the runtime artifacts are copied to the final slim image.

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `JWT_SECRET` | Secret key for signing JWTs. Auto-generated in dev if unset. | Yes (prod) |
| `PORT` | Port to listen on (default: `3100`) | No |
| `GITHUB_PAT` | GitHub Personal Access Token for webhook dispatch | No |
| `GITHUB_OWNER` | GitHub repository owner for webhook dispatch | No |
| `GITHUB_REPO` | GitHub repository name for webhook dispatch | No |

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full implementation plan — 7 phases over 12 weeks (~81 hours total at 5–10h/week).
