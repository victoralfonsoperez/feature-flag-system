# Deployment Guide

This guide covers deploying the Feature Flag System to production using **Supabase** (PostgreSQL), **Render** (API), and **Netlify** (dashboard).

## Prerequisites

- A [Supabase](https://supabase.com) account (free tier works)
- A [Render](https://render.com) account (free tier works)
- A [Netlify](https://netlify.com) account (free tier works)
- An [Auth0](https://auth0.com) tenant configured per the [Auth0 setup guide](./auth0-setup.md)

## 1. Supabase (PostgreSQL)

### Create a project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Choose a region close to your Render deployment (e.g., US West for Oregon).
3. Set a strong database password — you'll need it for the connection string.

### Run migrations

In the Supabase SQL Editor, run the migration files in order:

1. **`packages/api/src/migrations/001_init.sql`** — creates the `flags`, `audit_log`, and `api_tokens` tables.
2. **`packages/api/src/migrations/002_auth0_migration.sql`** — adds Auth0 fields to `api_tokens` and drops legacy `users`/`sessions` tables.

### Get the connection string

Go to **Settings > Database** and copy the **Connection string (URI)** under "Connection Pooling" (Transaction mode). It looks like:

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

## 2. Render (API)

### Create a Web Service

The easiest way is to use the included `render.yaml` Blueprint:

1. Go to [Render Dashboard](https://dashboard.render.com) and click **New > Blueprint**.
2. Connect your GitHub repository and select the branch.
3. Render will detect `render.yaml` and create the service automatically.

Alternatively, create a Web Service manually:

1. **Runtime:** Docker
2. **Dockerfile Path:** `./Dockerfile`
3. **Docker Context:** `.` (root)
4. **Health Check Path:** `/health`

### Set environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase connection string from step 1 |
| `AUTH0_DOMAIN` | Your Auth0 tenant domain (e.g., `your-tenant.us.auth0.com`) |
| `AUTH0_AUDIENCE` | Your Auth0 API identifier (e.g., `https://api.kanary.dev`) |
| `CORS_ORIGIN` | Your Netlify dashboard URL (e.g., `https://kanary-feature-flags.netlify.app`) |
| `NODE_OPTIONS` | `--dns-result-order=ipv4first` (required for Supabase connection on Render) |
| `PORT` | `3100` |

### Verify

After deployment, check the health endpoint:

```bash
curl https://your-service.onrender.com/health
```

You should see `{ "status": "ok", ... }`.

> **Note:** The Render free tier spins down after 15 minutes of inactivity. The first request after idle may take 30–60 seconds.

## 3. Netlify (Dashboard)

### Create a site

1. Go to [Netlify](https://app.netlify.com) and click **Add new site > Import an existing project**.
2. Connect your GitHub repository.

### Configure build settings

| Setting | Value |
|---|---|
| **Base directory** | `packages/dashboard` |
| **Build command** | `cd ../.. && pnpm install && pnpm --filter @feature-flags/dashboard build` |
| **Publish directory** | `packages/dashboard/dist` |

### Set environment variables

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Render API URL (e.g., `https://kanary-api.onrender.com`) |
| `VITE_AUTH0_DOMAIN` | Your Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Your Auth0 SPA application Client ID |
| `VITE_AUTH0_AUDIENCE` | Your Auth0 API identifier |
| `VITE_AUTH0_CALLBACK_URL` | Your Netlify site URL (e.g., `https://kanary-feature-flags.netlify.app`) |

### SPA routing

Add a `_redirects` file to `packages/dashboard/public/` to handle client-side routing:

```
/* /index.html 200
```

Or use `netlify.toml` at the repo root:

```toml
[build]
  base = "packages/dashboard"
  command = "cd ../.. && pnpm install && pnpm --filter @feature-flags/dashboard build"
  publish = "packages/dashboard/dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Verify

Visit your Netlify URL. You should be redirected to Auth0 for login.

## 4. Auth0 (Production URLs)

After deploying, update your Auth0 application settings to include the production URLs:

1. Go to **Applications > Your SPA Application > Settings**.
2. Add your Netlify URL to:
   - **Allowed Callback URLs**: `https://your-site.netlify.app`
   - **Allowed Logout URLs**: `https://your-site.netlify.app`
   - **Allowed Web Origins**: `https://your-site.netlify.app`

Keep existing `localhost` entries for local development (comma-separated).

## Troubleshooting

**API returns 500 / database connection errors:**
- Verify `DATABASE_URL` is correct and uses the pooler connection string.
- Ensure `NODE_OPTIONS=--dns-result-order=ipv4first` is set on Render (fixes IPv6 DNS issues with Supabase).

**CORS errors in browser console:**
- Check that `CORS_ORIGIN` on Render matches your Netlify URL exactly (no trailing slash).

**Auth0 callback errors:**
- Ensure the production URL is added to all three Auth0 allowed URL fields.
- Make sure `VITE_AUTH0_CALLBACK_URL` matches the URL in Auth0 settings.

**Render service won't start:**
- Check the deploy logs in the Render dashboard.
- Verify the Dockerfile builds successfully locally: `docker build -t kanary-api .`

**Netlify build fails:**
- Ensure the base directory is set to `packages/dashboard`.
- Check that all `VITE_*` environment variables are set in Netlify.
