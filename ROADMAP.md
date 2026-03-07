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
- [ ] Extract `Flag` and shared types into `packages/dashboard/src/types.ts`
- [ ] Break monolithic `App.tsx` into component files under `packages/dashboard/src/components/`

##### Flag list table
- [ ] Create `FlagTable` component with columns: Key, Value, Type, Environment, Updated
- [ ] Add type badges with color coding (amber for build-time, blue for runtime)
- [ ] Add toggle switch for boolean flags (value is `"true"` / `"false"`) that calls PUT on toggle
- [ ] Add environment selector dropdown that filters the flag list
- [ ] Add loading skeleton/spinner state while fetching flags
- [ ] Add empty state when no flags match the current filter
- [ ] Add error state with retry button when API call fails

##### Create flag form
- [ ] Create `CreateFlagModal` component with form fields: key, value, type (dropdown), environment (dropdown), description
- [ ] Add client-side validation matching API rules (key format, required fields, valid type/environment)
- [ ] Wire form submission to `POST /api/flags` with auth header
- [ ] Show success feedback and refresh flag list on create
- [ ] Show error feedback on validation or API errors

##### Inline editing
- [ ] Add edit action (icon/button) on each flag row that opens an `EditFlagModal`
- [ ] Pre-populate modal with current flag values (value, description)
- [ ] Wire save to `PUT /api/flags/:key` with auth header
- [ ] Show success feedback and refresh flag list on save

##### Delete flag
- [ ] Add delete action (icon/button) on each flag row
- [ ] Show confirmation dialog before deleting ("Are you sure you want to delete {key}?")
- [ ] Wire confirm to `DELETE /api/flags/:key` with auth header
- [ ] Show success feedback and refresh flag list on delete

#### Week 5: Modals, Activity Log & Polish

##### Build-time flag warning
- [ ] Add confirmation modal when editing a build-time flag that warns "This will trigger a production rebuild"
- [ ] Show the modal before the PUT request; only proceed if user confirms
- [ ] Visually distinguish build-time flags in the table (e.g. deploy icon or warning badge)

##### Activity log view
- [ ] Add `GET /api/audit-log` endpoint to the API (paginated, filterable by `flag_key`)
- [ ] Create `AuditLog` component that displays a timeline/table of changes
- [ ] Show columns: flag key, action (created/updated/deleted), old value, new value, changed by, timestamp
- [ ] Add a "View history" action on each flag row that filters the log to that flag
- [ ] Add pagination or "load more" for the activity log

##### Layout & polish
- [ ] Add a top navigation bar with app title and links (Flags, Activity Log)
- [ ] Add toast/notification system for success and error feedback
- [ ] Add responsive layout that works on mobile viewports
- [ ] Add keyboard shortcut: Escape to close modals
- [ ] Handle API token configuration (environment variable or settings input for the dashboard)

**Milestone:** Flags can be created, viewed, edited, and deleted entirely from the dashboard.

## Phase 4 — Client SDK (Week 6)

Ship the React SDK for runtime flags.

| Week | Hours | Tasks |
|---|---|---|
| 6 | ~7h | Finalize `FlagProvider`, `useFlags()`, and `useFlag(key)` APIs, add configurable caching (sessionStorage with TTL), define sensible defaults/fallback behavior when service is unreachable, write unit tests, publish package or document local linking |

**Milestone:** Any React app can consume runtime flags via the SDK.

## Phase 5 — A/B Testing (Weeks 7–8)

Add variant assignment and the plumbing needed for experiments.

| Week | Hours | Tasks |
|---|---|---|
| 7 | ~8h | Harden the hash-based variant assignment (add tests for distribution uniformity), extend `/resolve` endpoint to return variant metadata (name, experiment ID), add variant management UI in the dashboard (create/edit variants with weights) |
| 8 | ~5h | Add analytics event hook in the SDK (`onVariantAssigned` callback), document how to integrate with an analytics provider, write integration test: SDK → API → correct variant returned |

**Milestone:** Full A/B testing flow works end-to-end with deterministic bucketing.

## Phase 6 — Hardening & Production Readiness (Weeks 9–10)

Make it reliable enough to run in production.

| Week | Hours | Tasks |
|---|---|---|
| 9 | ~8h | Add rate limiting to the `/resolve` endpoint, add request logging and structured error responses, set up health check endpoint (`GET /health`), write a `docker-compose.yml` for local full-stack development (API + dashboard) |
| 10 | ~6h | Deploy to hosting (Fly.io, Railway, or VPS), configure HTTPS and environment-specific secrets, end-to-end smoke test in a real environment, write deployment documentation |

**Milestone:** System is deployed and serving real traffic.

## Phase 7 — Polish & Extras (Weeks 11–12)

Nice-to-haves that improve the day-to-day experience.

| Week | Hours | Tasks |
|---|---|---|
| 11 | ~6h | Add "revert to previous value" button in dashboard (reads audit log), add Slack/Discord webhook notification on flag changes, add flag search/filter in dashboard |
| 12 | ~5h | Add multi-app support (scope flags by `app_id`), write project documentation and usage guide, tag `v1.0.0` release |

**Milestone:** v1.0 shipped.

---

## Summary

| Phase | Weeks | Total Hours | Deliverable |
|---|---|---|---|
| 1 — API Foundation | 1–2 | ~15h | Tested, containerized CRUD API with auth |
| 2 — Webhook & CI | 3 | ~6h | Build-time flag → auto rebuild pipeline |
| 3 — Dashboard UI | 4–5 | ~15h | Full flag management web interface |
| 4 — Client SDK | 6 | ~7h | React provider + hooks for runtime flags |
| 5 — A/B Testing | 7–8 | ~13h | Variant assignment + experiment support |
| 6 — Hardening | 9–10 | ~14h | Production deployment with monitoring |
| 7 — Polish | 11–12 | ~11h | Revert, notifications, multi-app, v1.0 |
| **Total** | **12 weeks** | **~81h** | |
