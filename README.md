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

---

## Roadmap

Weekly dedication: **5–10 hours/week**

### Phase 1 — API Foundation (Weeks 1–2)

Get the Flag Service API running, tested, and deployable.

| Week | Hours | Tasks |
|---|---|---|
| 1 | ~8h | Finalize SQLite schema and seed data, implement and manually test all CRUD endpoints (`GET`, `POST`, `PUT`, `DELETE`), add input validation and error handling |
| 2 | ~7h | Add API token authentication middleware, write integration tests for all endpoints (Vitest), set up Docker build and verify it runs locally |

**Milestone:** API is fully functional with auth, tested, and containerized.

### Phase 2 — GitHub Webhook & CI Integration (Week 3)

Wire up the build-time flag change → rebuild pipeline.

| Week | Hours | Tasks |
|---|---|---|
| 3 | ~6h | Generate GitHub PAT and configure env vars, implement and test the `repository_dispatch` webhook trigger, finalize the GitHub Actions workflow (`deploy-on-flag-change.yml`), test full loop: change a build-time flag → dispatch fires → workflow runs |

**Milestone:** Changing a build-time flag automatically triggers a rebuild in CI.

### Phase 3 — Dashboard UI (Weeks 4–5)

Build the web dashboard for managing flags.

| Week | Hours | Tasks |
|---|---|---|
| 4 | ~8h | Build flag list table with environment selector, implement create-flag form and inline value editing, add type badges and toggle switch for boolean flags |
| 5 | ~7h | Add confirmation modal for build-time flag changes (warns it triggers a deploy), build activity log view (reads from `audit_log` table), polish layout, loading states, and error handling |

**Milestone:** Flags can be created, viewed, edited, and deleted entirely from the dashboard.

### Phase 4 — Client SDK (Week 6)

Ship the React SDK for runtime flags.

| Week | Hours | Tasks |
|---|---|---|
| 6 | ~7h | Finalize `FlagProvider`, `useFlags()`, and `useFlag(key)` APIs, add configurable caching (sessionStorage with TTL), define sensible defaults/fallback behavior when service is unreachable, write unit tests, publish package or document local linking |

**Milestone:** Any React app can consume runtime flags via the SDK.

### Phase 5 — A/B Testing (Weeks 7–8)

Add variant assignment and the plumbing needed for experiments.

| Week | Hours | Tasks |
|---|---|---|
| 7 | ~8h | Harden the hash-based variant assignment (add tests for distribution uniformity), extend `/resolve` endpoint to return variant metadata (name, experiment ID), add variant management UI in the dashboard (create/edit variants with weights) |
| 8 | ~5h | Add analytics event hook in the SDK (`onVariantAssigned` callback), document how to integrate with an analytics provider, write integration test: SDK → API → correct variant returned |

**Milestone:** Full A/B testing flow works end-to-end with deterministic bucketing.

### Phase 6 — Hardening & Production Readiness (Weeks 9–10)

Make it reliable enough to run in production.

| Week | Hours | Tasks |
|---|---|---|
| 9 | ~8h | Add rate limiting to the `/resolve` endpoint, add request logging and structured error responses, set up health check endpoint (`GET /health`), write a `docker-compose.yml` for local full-stack development (API + dashboard) |
| 10 | ~6h | Deploy to hosting (Fly.io, Railway, or VPS), configure HTTPS and environment-specific secrets, end-to-end smoke test in a real environment, write deployment documentation |

**Milestone:** System is deployed and serving real traffic.

### Phase 7 — Polish & Extras (Weeks 11–12)

Nice-to-haves that improve the day-to-day experience.

| Week | Hours | Tasks |
|---|---|---|
| 11 | ~6h | Add "revert to previous value" button in dashboard (reads audit log), add Slack/Discord webhook notification on flag changes, add flag search/filter in dashboard |
| 12 | ~5h | Add multi-app support (scope flags by `app_id`), write project documentation and usage guide, tag `v1.0.0` release |

**Milestone:** v1.0 shipped.

---

### Summary

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
