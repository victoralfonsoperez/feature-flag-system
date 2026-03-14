# Roadmap

Weekly dedication: **5–10 hours/week**

## Phase 1 — API Foundation (Weeks 1–2)

Get the Flag Service API running, tested, and deployable.

| Week | Hours | Tasks |
|---|---|---|
| 1 | ~8h | Finalize SQLite schema and seed data, implement and manually test all CRUD endpoints (`GET`, `POST`, `PUT`, `DELETE`), add input validation and error handling |
| 2 | ~7h | Add API token authentication middleware, write integration tests for all endpoints (Vitest), set up Docker build and verify it runs locally |

### Phase 1 — Task Checklist

#### Week 1: Schema, CRUD & Validation

- [x] Add `created_at` column to `flags` table schema
- [x] Add a seed data script (`packages/api/src/seed.ts`) with sample flags (boolean, string, JSON; build-time & runtime; multiple environments)
- [x] Add an npm script `seed` to run the seed file
- [x] Validate `type` field is `build-time` or `runtime` on POST
- [x] Validate `environment` field against allowed values (e.g. `development`, `staging`, `production`)
- [x] Validate `key` format (non-empty, no spaces, alphanumeric + dashes/underscores)
- [x] Return `409 Conflict` on POST when flag key already exists
- [x] Return proper error shape (`{ error, statusCode }`) consistently across all error responses
- [x] Handle malformed JSON body gracefully (Fastify content-type parser errors)
- [x] Verify GET `/api/flags` returns all flags and supports `?type=` and `?env=` filters
- [x] Verify GET `/api/flags/:key` returns a single flag or 404
- [x] Verify POST `/api/flags` creates a flag and returns 201
- [x] Verify PUT `/api/flags/:key` updates a flag and logs to `audit_log`
- [x] Verify DELETE `/api/flags/:key` removes a flag and returns 204
- [x] Verify audit log entries are written for create, update, and delete actions

#### Week 2: Auth, Tests & Docker

- [x] Create auth middleware (`packages/api/src/middleware/auth.ts`) that checks `Authorization: Bearer <API_TOKEN>` header
- [x] Register auth middleware on all mutating routes (POST, PUT, DELETE)
- [x] Allow unauthenticated access to read routes (GET `/api/flags`, GET `/api/flags/resolve`)
- [x] Return `401 Unauthorized` when token is missing, `403 Forbidden` when token is invalid
- [x] Write integration test: GET `/api/flags` returns seeded flags
- [x] Write integration test: GET `/api/flags/:key` returns single flag and 404 for missing
- [x] Write integration test: POST `/api/flags` creates flag, rejects duplicates (409), rejects invalid input (400)
- [x] Write integration test: PUT `/api/flags/:key` updates flag, returns 404 for missing
- [x] Write integration test: DELETE `/api/flags/:key` removes flag, returns 404 for missing
- [x] Write integration test: auth middleware blocks mutating routes without valid token
- [x] Write integration test: GET `/api/flags/resolve` returns resolved key-value map
- [x] Set up test helper that creates an in-memory (or temp file) database per test
- [x] Verify `npm run build` compiles TypeScript without errors
- [x] Verify `docker build` succeeds and container starts and responds on port 3100

**Milestone:** API is fully functional with auth, tested, and containerized.

## Phase 2 — GitHub Webhook & CI Integration (Week 3)

Wire up the build-time flag change → rebuild pipeline.

| Week | Hours | Tasks |
|---|---|---|
| 3 | ~6h | Generate GitHub PAT and configure env vars, implement and test the `repository_dispatch` webhook trigger, finalize the GitHub Actions workflow (`deploy-on-flag-change.yml`), test full loop: change a build-time flag → dispatch fires → workflow runs |

**Milestone:** Changing a build-time flag automatically triggers a rebuild in CI.

## Phase 3 — Dashboard UI (Weeks 4–5)

Build the web dashboard for managing flags.

| Week | Hours | Tasks |
|---|---|---|
| 4 | ~8h | Build flag list table with environment selector, implement create-flag form and inline value editing, add type badges and toggle switch for boolean flags |
| 5 | ~7h | Add confirmation modal for build-time flag changes (warns it triggers a deploy), build activity log view (reads from `audit_log` table), polish layout, loading states, and error handling |

### Phase 3 — Task Checklist

#### Week 4: Component Architecture & CRUD UI

##### Project setup
- [x] Extract shared API client helper (`packages/dashboard/src/api.ts`) with base URL, auth header, and typed fetch wrappers
- [x] Add vitest and unit tests for the API client (`packages/dashboard/src/api.test.ts`)
- [x] Refactor `App.tsx` to use the shared API client and imported types
- [x] Extract `Flag` and shared types into `packages/dashboard/src/types.ts`
- [x] Break monolithic `App.tsx` into component files under `packages/dashboard/src/components/`

##### Flag list table
- [x] Create `FlagTable` component with columns: Key, Value, Type, Environment, Updated
- [x] Add type badges with color coding (amber for build-time, blue for runtime)
- [x] Add toggle switch for boolean flags (value is `"true"` / `"false"`) that calls PUT on toggle
- [x] Add environment selector dropdown that filters the flag list
- [x] Add loading skeleton/spinner state while fetching flags
- [x] Add empty state when no flags match the current filter
- [x] Add error state with retry button when API call fails

##### Create flag form
- [x] Create `CreateFlagForm` component with form fields: key, value, type (dropdown), environment (dropdown), description
- [x] Add client-side validation matching API rules (key format, required fields, valid type/environment)
- [x] Wire form submission to `POST /api/flags` with auth header
- [x] Show success feedback and refresh flag list on create
- [x] Show error feedback on validation or API errors

##### Inline editing
- [x] Add edit action (icon/button) on each flag row that opens an `EditFlagModal`
- [x] Pre-populate modal with current flag values (value, description)
- [x] Wire save to `PUT /api/flags/:key` with auth header
- [x] Show success feedback and refresh flag list on save

##### Delete flag
- [x] Add delete action (icon/button) on each flag row
- [x] Show confirmation dialog before deleting ("Are you sure you want to delete {key}?")
- [x] Wire confirm to `DELETE /api/flags/:key` with auth header
- [x] Show success feedback and refresh flag list on delete

#### Week 5: Modals, Activity Log & Polish

##### Build-time flag warning
- [x] Add amber warning in create form when build-time type is selected
- [x] Add amber warning banner in edit modal for build-time flags
- [x] Show transient warning after toggling a build-time flag (auto-dismisses after 5s)

##### Activity log view
- [x] Add `GET /api/audit-log` endpoint to the API (paginated, filterable by `flag_key`)
- [x] Create `AuditLog` component that displays a timeline/table of changes
- [x] Show columns: flag key, action (created/updated/deleted), old value, new value, changed by, timestamp
- [x] Add a "View history" action on each flag row that filters the log to that flag
- [x] Add pagination or "load more" for the activity log

##### Layout & polish
- [x] Add a top navigation bar with app title and links (Flags, Activity Log)
- [x] Add toast/notification system for success and error feedback
- [x] Add responsive layout that works on mobile viewports
- [x] Add keyboard shortcut: Escape to close modals
- [x] Handle API token configuration (environment variable or settings input for the dashboard)

**Milestone:** Flags can be created, viewed, edited, and deleted entirely from the dashboard.

## Phase 4 — Client SDK (Week 6)

Ship the React SDK for runtime flags.

| Week | Hours | Tasks |
|---|---|---|
| 6 | ~7h | Finalize `FlagProvider`, `useFlags()`, and `useFlag(key)` APIs, add configurable caching (sessionStorage with TTL), define sensible defaults/fallback behavior when service is unreachable, write unit tests, publish package or document local linking |

### Phase 4 — Task Checklist

#### SDK core (done)
- [x] Implement `FlagProvider` component that fetches flags from the API on mount
- [x] Implement `useFlags()` hook returning all resolved flags
- [x] Implement `useFlag(key, fallback)` hook returning a single flag value
- [x] Define sensible defaults/fallback behavior when service is unreachable (use `defaults` prop)
- [x] Write unit tests for hooks and fallback behavior

#### SDK caching
- [x] Add configurable caching with `sessionStorage` and TTL (e.g. `cacheTtl` prop on `FlagProvider`)
- [x] On mount, check `sessionStorage` for cached flags within TTL — use cached values immediately while re-fetching in the background
- [x] Write tests for cache hit, cache miss, and cache expiration scenarios

**Milestone:** Any React app can consume runtime flags via the SDK.

## Phase 5 — A/B Testing (Weeks 7–8)

Add variant assignment and the plumbing needed for experiments.

| Week | Hours | Tasks |
|---|---|---|
| 7 | ~8h | Harden the hash-based variant assignment (add tests for distribution uniformity), extend `/resolve` endpoint to return variant metadata (name, experiment ID), add variant management UI in the dashboard (create/edit variants with weights) |
| 8 | ~5h | Add analytics event hook in the SDK (`onVariantAssigned` callback), document how to integrate with an analytics provider, write integration test: SDK → API → correct variant returned |

### Phase 5 — Task Checklist

#### Backend variant resolution (done)
- [x] Implement deterministic hash-based variant assignment using `user_id`
- [x] Store variants as JSON on the flag (name, value, weight)
- [x] Return variant value from `/resolve` endpoint when `user_id` is provided
- [x] Add tests for deterministic assignment and default fallback without `user_id`

#### Variant hardening
- [x] Add tests for distribution uniformity (e.g. 10k user IDs, assert variant distribution matches weights within tolerance)
- [x] Extend `/resolve` response to include variant metadata (variant name, experiment flag key)

#### Variant management UI (dashboard)
- [x] Add variant editor section to `EditFlagModal` — add/remove/reorder variants with name, value, and weight fields
- [x] Show variant data in `CreateFlagForm` when the user wants to create a flag with variants
- [x] Display variant info in `FlagTable` (e.g. badge or indicator showing "3 variants")
- [x] Validate that variant weights are positive integers and total weight is > 0
- [x] Write tests for variant editor UI

#### SDK analytics hook
- [x] Add `onVariantAssigned(flagKey, variantName, userId)` callback prop to `FlagProvider`
- [x] Fire callback when a flag with variants is resolved for a user
- [x] Document how to integrate with analytics providers (GA, Mixpanel, Amplitude)
- [x] Write integration test: SDK → API → correct variant returned and callback fired

**Milestone:** Full A/B testing flow works end-to-end with deterministic bucketing.

## Phase 6 — Hardening & Production Readiness (Weeks 9–10)

Make it reliable enough to run in production.

| Week | Hours | Tasks |
|---|---|---|
| 9 | ~8h | Add rate limiting to the `/resolve` endpoint, add request logging and structured error responses, set up health check endpoint (`GET /health`), write a `docker-compose.yml` for local full-stack development (API + dashboard) |
| 10 | ~6h | Deploy to hosting (Fly.io, Railway, or VPS), configure HTTPS and environment-specific secrets, end-to-end smoke test in a real environment, write deployment documentation |

### Phase 6 — Task Checklist

#### Rate limiting (done)
- [x] Add global rate limiting (100 req/min)
- [x] Add stricter rate limiting on login endpoint (10 req/min)

#### Observability & reliability (done)
- [x] Add `GET /health` endpoint returning `{ status: "ok", uptime, version }` for load balancer probes
- [x] Add structured request logging (method, path, status, duration) — consider `pino` (already a Fastify default)
- [x] Write tests for the health endpoint

#### Local development (done)
- [x] Write `docker-compose.yml` at repo root — API + dashboard + volume for SQLite persistence
- [x] Document `docker compose up` workflow in README
- [x] Update `Dockerfile` for the API to work with `pg` instead of `better-sqlite3` (remove native SQLite build deps)
- [x] Update `docker-compose.yml` to include a PostgreSQL container (`postgres:16-alpine`) with a named volume for data persistence
- [x] Configure API service with `DATABASE_URL` pointing to the local PostgreSQL container
- [x] Add an init script or entrypoint that runs the migration (`001_init.sql`) on first start
- [x] Update dashboard service env to point `VITE_API_URL` to the API container
- [x] Verify `docker compose up` brings up the full stack (PostgreSQL + API + dashboard) from scratch
- [x] Update README with the new `docker compose` instructions

#### Database migration: SQLite → PostgreSQL (done)
- [x] Create Supabase project and provision free-tier PostgreSQL database
- [x] Replace `better-sqlite3` with `pg` (node-postgres) driver in `packages/api`
- [x] Create `packages/api/src/db.ts` adapter that wraps `pg.Pool` with the same query interface
  - Replace `db.prepare(sql).get(...)` → `pool.query(sql, params)` with `LIMIT 1`
  - Replace `db.prepare(sql).all(...)` → `pool.query(sql, params)`
  - Replace `db.prepare(sql).run(...)` → `pool.query(sql, params)` returning `rowCount`
  - Replace `result.lastInsertRowid` → `RETURNING id` clause
- [x] Adapt SQL syntax differences:
  - `datetime('now')` → `NOW()`
  - `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
  - `PRAGMA table_info()` → `information_schema.columns` queries
  - `TEXT` defaults stay the same; timestamps can use `TIMESTAMPTZ`
  - `db.transaction(() => { ... })` → `BEGIN` / `COMMIT` via `pool.query`
- [x] Create SQL migration script (`packages/api/src/migrations/001_init.sql`) with all 5 tables: `flags`, `audit_log`, `users`, `sessions`, `api_tokens`
- [x] Update `seed.ts` and `seed-admin.ts` to use the new `pg` adapter
- [x] Update all API test files to use PostgreSQL test database via Docker
- [x] Verify all existing API tests pass against PostgreSQL
- [x] Add `DATABASE_URL` env var support for connection string

#### Deploy backend to Render
- [x] Create Render free-tier Web Service linked to the repo (`packages/api`)
- [x] Configure build command (`npm install && npm run build -w packages/api`) and start command
- [x] Set environment variables: `DATABASE_URL`, `JWT_SECRET`, `GITHUB_PAT`, `WEBHOOK_URL`
- [x] Configure CORS to allow requests from the Netlify frontend domain
- [x] Verify health check endpoint (`GET /health`) works on Render

#### Deploy frontend to Netlify
- [x] Create Netlify site linked to the repo (`packages/dashboard`)
- [x] Configure build command (`npm run build -w packages/dashboard`) and publish directory (`packages/dashboard/dist`)
- [x] Set `VITE_API_URL` env var pointing to the Render backend URL
- [ ] Add `_redirects` or `netlify.toml` for SPA routing (`/* → /index.html`)
- [x] Verify dashboard loads and connects to the deployed API

#### End-to-end verification
- [ ] Run full smoke test: setup admin → login → create flag → toggle → edit → delete → audit log
- [ ] Verify SDK `/resolve` endpoint works from an external origin
- [ ] Write deployment documentation (`docs/DEPLOYMENT.md`) covering Supabase, Render, and Netlify setup

**Milestone:** System is deployed and serving real traffic on Supabase + Render + Netlify.

## Phase 7 — Polish & Extras (Weeks 11–12)

Nice-to-haves that improve the day-to-day experience.

| Week | Hours | Tasks |
|---|---|---|
| 11 | ~6h | Add "revert to previous value" button in dashboard (reads audit log), add Slack/Discord webhook notification on flag changes, add flag search/filter in dashboard |
| 12 | ~5h | Add multi-app support (scope flags by `app_id`), write project documentation and usage guide, tag `v1.0.0` release |

### Phase 7 — Task Checklist

#### Dashboard improvements
- [x] Add flag search/filter input above the flag table (filter by key, description, or type)
- [x] Add "Revert to previous value" button on each flag row (reads last value from audit log, calls PUT)
- [x] Write tests for search/filter and revert functionality

#### Notifications
- [x] Add Slack/Discord webhook notification on flag changes (configurable webhook URL via env var or settings)
- [x] Fire notification on create, update, and delete with flag key, action, and actor
- [x] Write tests for webhook dispatch

#### Multi-app support
- [x] Add `app_id` column to flags table and update schema
- [x] Scope all flag CRUD and resolve endpoints by `app_id` query parameter
- [x] Add app selector in the dashboard UI
- [x] Update SDK `FlagProvider` to accept an `appId` prop
- [x] Write migration and tests for multi-app scoping

#### Release
- [ ] Write project documentation and usage guide (`docs/USAGE.md` — update existing)
- [ ] Review and update README with final architecture and setup instructions
- [ ] Tag `v1.0.0` release

**Milestone:** v1.0 shipped.

## Phase 8 — Auth0 Migration

Migrate from custom JWT auth to Auth0 Universal Login.

### Auth0 Migration — Task Checklist

#### API changes (done)
- [x] Install `jose` library for RS256 JWT verification
- [x] Create `auth0.ts` module for Auth0 JWKS token verification
- [x] Create `002_auth0_migration.sql` — add `creator_email`/`creator_role` to `api_tokens`, drop `sessions`/`users` tables
- [x] Rewrite auth middleware: Auth0 JWT + API token fallback (remove cookie-based auth)
- [x] Rewrite auth routes: keep `/status` (no-op) and `/me` (Auth0 claims)
- [x] Update token routes to store `creator_email`/`creator_role`
- [x] Update `server.ts` — remove `@fastify/cookie` and user routes
- [x] Update types: `user.id` is now `string` (Auth0 sub), source is `'auth0' | 'api-token'`
- [x] Delete: `password.ts`, `jwt.ts`, `session.ts`, `seed-admin.ts`, `routes/users.ts`

#### Dashboard changes (done)
- [x] Install `@auth0/auth0-react`
- [x] Wrap app with `Auth0Provider` in `main.tsx`
- [x] Rewrite `AuthContext.tsx` as thin `useAuth0()` wrapper
- [x] Rewrite `api.ts` — Bearer token auth, remove cookie/refresh logic
- [x] Update `App.tsx` — remove setup/login forms, auto-redirect to Auth0
- [x] Update `Header.tsx` — remove Users nav button
- [x] Delete: `LoginForm`, `SetupForm`, `UserManager` + their tests

#### Tests (done)
- [x] Create RS256 test helpers with `jose` key pair generation
- [x] Create `auth-middleware.test.ts` for Auth0 + API token validation
- [x] Rewrite `flags.test.ts`, `tokens.test.ts`, `audit-log.test.ts` to use Bearer tokens
- [x] Rewrite `AuthContext.test.tsx` to mock `@auth0/auth0-react`
- [x] Update `api.test.ts` and `Header.test.tsx`
- [x] Delete old test files: `auth.test.ts`, `password.test.ts`, `jwt.test.ts`, `session.test.ts`, `users.test.ts`

#### Documentation (done)
- [x] Create `docs/auth0-setup.md` with tenant configuration guide

**Milestone:** Auth system migrated to Auth0 Universal Login. Local user management removed.

---

## Summary

| Phase | Weeks | Total Hours | Deliverable |
|---|---|---|---|
| 1 — API Foundation | 1–2 | ~15h | Tested, containerized CRUD API with auth |
| 2 — Webhook & CI | 3 | ~6h | Build-time flag → auto rebuild pipeline |
| 3 — Dashboard UI | 4–5 | ~15h | Full flag management web interface |
| 4 — Client SDK | 6 | ~7h | React provider + hooks for runtime flags |
| 5 — A/B Testing | 7–8 | ~13h | Variant assignment + experiment support |
| 6 — Hardening | 9–10 | ~14h | PostgreSQL migration, deploy to Supabase + Render + Netlify |
| 7 — Polish | 11–12 | ~11h | Revert, notifications, multi-app, v1.0 |
| **Total** | **12 weeks** | **~81h** | |
