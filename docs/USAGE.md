# Feature Flag System — Usage Guide

This guide covers how to integrate feature flags into your application after setting up the Feature Flag System (API + Dashboard).

## Overview

The Feature Flag System supports two scenarios:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Flag Service API                            │
│                 (Fastify + PostgreSQL)                           │
│                                                                 │
│   GET /api/flags/resolve?type=runtime&env=production            │
│   GET /api/flags/resolve?type=build-time&env=production         │
└──────────────┬────────────────────────────┬─────────────────────┘
               │                            │
     ┌─────────▼──────────┐      ┌──────────▼─────────────┐
     │  Scenario 1:       │      │  Scenario 2:           │
     │  Runtime Flags     │      │  Build-Time Flags      │
     │                    │      │                        │
     │  React SDK fetches │      │  CI/build script       │
     │  flags on page     │      │  fetches flags, bakes  │
     │  load, renders     │      │  them into the bundle  │
     │  dynamically       │      │  at build time         │
     └────────────────────┘      └────────────────────────┘
```

- **Runtime flags** — resolved on every page load; changes take effect immediately
- **Build-time flags** — baked into your bundle at build; changes require a rebuild (can be automated via GitHub Actions webhook)

## Prerequisites

1. **Deploy or run locally** — see [Deployment Guide](./DEPLOYMENT.md) for production setup (Supabase + Render + Netlify), or run locally:

   ```bash
   git clone <your-repo-url>
   cd feature-flag-system
   nvm use
   npm install
   npm run dev
   ```

2. **Log in via Auth0** — visit the dashboard (locally at `http://localhost:5173`, or the deployed URL). You'll be redirected to Auth0 to sign in or create an account.

3. **Create an API token** — once logged in, navigate to Settings and create an API token. Copy the token immediately; it is only shown once. For SDK/client apps, create an app-scoped token by specifying an App ID — this restricts the token to only read flags for that app.

4. **Create some flags** — use the dashboard or API to create flags (see [Managing Flags via Dashboard](#managing-flags-via-dashboard) or [API Reference](#api-reference-quick)).

## Scenario 1: Runtime Flags (React SDK)

The React SDK fetches flags from the API on page load and provides them via React context.

### Install

The SDK is published to GitHub Packages. Add a `.npmrc` file to your project to configure the registry:

```
@victoralfonsoperez:registry=https://npm.pkg.github.com
```

Then install:

```bash
npm install @victoralfonsoperez/feature-flags-sdk
```

> The SDK requires `react >= 18` as a peer dependency.

### Wrap your app with `FlagProvider`

```tsx
import { FlagProvider } from '@victoralfonsoperez/feature-flags-sdk';

function App() {
  return (
    <FlagProvider
      serviceUrl="https://flags.example.com"
      environment="production"
      apiKey="your-sdk-api-token"
      appId="my-app"
      userId={currentUser.id}
      defaults={{ dark_mode: 'false', checkout_version: 'v1' }}
    >
      <YourApp />
    </FlagProvider>
  );
}
```

> **Note:** The `apiKey` is required — the resolve endpoint requires authentication. Create an app-scoped API token in the dashboard for each consuming app. App-scoped tokens can only read flags for their assigned `app_id`.

#### `FlagProvider` Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `serviceUrl` | `string` | Yes | — | Base URL of the Flag Service API |
| `environment` | `string` | No | `'production'` | Environment to resolve flags for (`development`, `staging`, `production`) |
| `userId` | `string` | No | — | User identifier for A/B test variant bucketing |
| `appId` | `string` | No | `'default'` | App ID for multi-app flag scoping |
| `apiKey` | `string` | No | — | API token for authenticating with the resolve endpoint (sent as `Authorization: Bearer` header) |
| `defaults` | `Record<string, string>` | No | `{}` | Fallback values used before flags load or if the API is unreachable |
| `cacheTtl` | `number` | No | `0` | Cache TTL in seconds. Set to `0` to disable caching. |
| `onVariantAssigned` | `(flagKey, variantName, userId) => void` | No | — | Called when a flag with variants is resolved for a user. Use for analytics tracking. |
| `children` | `ReactNode` | Yes | — | Your application tree |

The provider renders nothing (`null`) until flags are loaded, then renders children with flag values available via context.

### `useFlag(key, fallback?)`

Returns a single flag value by key, with an optional fallback.

```tsx
import { useFlag } from '@victoralfonsoperez/feature-flags-sdk';

function CheckoutButton() {
  const checkoutVersion = useFlag('checkout_version', 'v1');

  if (checkoutVersion === 'v2') {
    return <NewCheckoutButton />;
  }
  return <ClassicCheckoutButton />;
}
```

**Signature:** `useFlag(key: string, fallback?: string): string | undefined`

- Returns the flag value if it exists, the `fallback` if provided, or `undefined`.

### `useFlags()`

Returns all resolved flags as a key-value object.

```tsx
import { useFlags } from '@victoralfonsoperez/feature-flags-sdk';

function DebugPanel() {
  const flags = useFlags();

  return (
    <pre>{JSON.stringify(flags, null, 2)}</pre>
  );
}
```

**Signature:** `useFlags(): Record<string, string>`

### Full Examples

#### Feature gate

```tsx
function PremiumFeature() {
  const enabled = useFlag('premium_feature', 'false');

  if (enabled !== 'true') {
    return <UpgradePrompt />;
  }

  return <PremiumDashboard />;
}
```

#### A/B test

```tsx
function HeroSection() {
  const variant = useFlag('hero_variant', 'control');

  switch (variant) {
    case 'big_cta':
      return <HeroBigCTA />;
    case 'video':
      return <HeroVideo />;
    default:
      return <HeroControl />;
  }
}
```

#### Config value

```tsx
function ApiClient() {
  const maxRetries = useFlag('api_max_retries', '3');

  // Use the flag as a configuration value
  return <DataFetcher retries={Number(maxRetries)} />;
}
```

## Scenario 2: Build-Time Flags

Build-time flags are fetched once during your build process and baked into the bundle. They don't change until the next build.

### Fetch flags at build time

```bash
curl "https://flags.example.com/api/flags/resolve?type=build-time&env=production" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

Response:

```json
{
  "enable_analytics": "true",
  "api_base_url": "https://api.example.com",
  "cdn_host": "https://cdn.example.com"
}
```

### Inject into your bundler

#### Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite';

const flags = await fetch(
  'https://flags.example.com/api/flags/resolve?type=build-time&env=production',
  { headers: { Authorization: `Bearer ${process.env.FLAG_API_TOKEN}` } }
).then((r) => r.json());

export default defineConfig({
  define: {
    __FLAGS__: JSON.stringify(flags),
  },
});
```

Then use in your code:

```ts
declare const __FLAGS__: Record<string, string>;

if (__FLAGS__.enable_analytics === 'true') {
  initAnalytics();
}
```

#### Webpack

```js
// webpack.config.js
const { DefinePlugin } = require('webpack');

// Fetch flags in your build script before webpack runs
const flags = require('./build-flags.json');

module.exports = {
  plugins: [
    new DefinePlugin({
      __FLAGS__: JSON.stringify(flags),
    }),
  ],
};
```

#### `window.__FLAGS__` (framework-agnostic)

Generate a script tag at build time:

```bash
#!/bin/bash
FLAGS=$(curl -s "https://flags.example.com/api/flags/resolve?type=build-time&env=production" \
  -H "Authorization: Bearer $FLAG_API_TOKEN")
echo "<script>window.__FLAGS__ = ${FLAGS};</script>" > public/flags.js
```

Then include it in your HTML before your app bundle:

```html
<script src="/flags.js"></script>
<script src="/app.js"></script>
```

### GitHub Actions integration

When a build-time flag is updated via the API, the system automatically sends a `repository_dispatch` event to GitHub, triggering a rebuild.

To use this, configure the API with these environment variables:

| Variable | Description |
|---|---|
| `GITHUB_PAT` | GitHub Personal Access Token with `repo` scope |
| `GITHUB_OWNER` | Repository owner (e.g., `your-org`) |
| `GITHUB_REPO` | Repository name (e.g., `your-app`) |

Then add a workflow that listens for the dispatch:

```yaml
# .github/workflows/rebuild-on-flag-change.yml
name: Rebuild on flag change

on:
  repository_dispatch:
    types: [flag-changed]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
      - run: npm ci
      - run: npm run build
      - run: npm run deploy # your deploy step
```

The dispatch payload includes the flag key and timestamp:

```json
{
  "event_type": "flag-changed",
  "client_payload": {
    "flag": "enable_analytics",
    "timestamp": "2026-01-15T10:30:00.000Z"
  }
}
```

## API Reference (Quick)

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/flags` | No | List all flags (filterable by `type`, `env`, `app_id` query params) |
| `GET` | `/api/flags/resolve` | Yes | Resolve flags for a client (query params: `type`, `env`, `user_id`, `app_id`). App-scoped tokens can only resolve their own `app_id`. |
| `GET` | `/api/flags/:key` | No | Get a single flag by key |
| `POST` | `/api/flags` | Yes | Create a new flag |
| `PUT` | `/api/flags/:key` | Yes | Update a flag |
| `DELETE` | `/api/flags/:key` | Yes | Delete a flag |
| `GET` | `/api/tokens` | Yes | List API tokens for the current user |
| `POST` | `/api/tokens` | Yes | Create an API token (optional `app_id` for app-scoped tokens) |
| `DELETE` | `/api/tokens/:id` | Yes | Revoke an API token |

### Authentication

Write operations and the resolve endpoint require a Bearer token (API token created in the dashboard):

```bash
curl -X POST https://flags.example.com/api/flags \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "new_feature", "value": "true", "type": "runtime"}'
```

**App-scoped tokens:** When creating an API token, you can optionally set an `app_id` to restrict the token to only resolve flags for that app. Tokens without an `app_id` (unscoped) can resolve flags for any app and are used for dashboard/CI operations.

### Request/Response Examples

#### Resolve flags

```bash
curl "https://flags.example.com/api/flags/resolve?type=runtime&env=production&user_id=user-123" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

```json
{
  "dark_mode": "true",
  "checkout_version": "v2",
  "hero_variant": "big_cta"
}
```

#### Create a flag

```bash
curl -X POST https://flags.example.com/api/flags \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new_feature",
    "value": "false",
    "type": "runtime",
    "environment": "production",
    "description": "Enable the new feature"
  }'
```

```json
{
  "key": "new_feature",
  "value": "false",
  "type": "runtime",
  "environment": "production",
  "description": "Enable the new feature",
  "variants": null,
  "created_at": "2026-01-15T10:30:00.000Z",
  "updated_at": "2026-01-15T10:30:00.000Z"
}
```

#### Update a flag

```bash
curl -X PUT https://flags.example.com/api/flags/new_feature \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "true"}'
```

#### Delete a flag

```bash
curl -X DELETE https://flags.example.com/api/flags/new_feature \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

Returns `204 No Content` on success.

## Managing Flags via Dashboard

The dashboard provides a web UI for managing flags:

1. **Create** — click "Create Flag", fill in the key, value, type (`runtime` or `build-time`), environment, and optional description. Keys must be alphanumeric with dashes or underscores only.
2. **Edit** — click on a flag to open the edit modal. You can update the value, description, and variants.
3. **Toggle** — update the flag value between `"true"` and `"false"` to enable/disable features.
4. **Delete** — click the delete button on a flag. A confirmation modal will appear before deletion.

## A/B Testing

The system supports deterministic A/B testing using variant bucketing.

### 1. Create a flag with variants

```bash
curl -X POST https://flags.example.com/api/flags \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "hero_variant",
    "value": "control",
    "type": "runtime",
    "variants": "[{\"name\":\"control\",\"value\":\"control\",\"weight\":50},{\"name\":\"big_cta\",\"value\":\"big_cta\",\"weight\":30},{\"name\":\"video\",\"value\":\"video\",\"weight\":20}]"
  }'
```

The `variants` field is a JSON string containing an array of objects with `name`, `value`, and `weight`.

### 2. Pass `userId` to `FlagProvider`

```tsx
<FlagProvider
  serviceUrl="https://flags.example.com"
  userId={currentUser.id}
>
  <App />
</FlagProvider>
```

### 3. How bucketing works

The system uses a deterministic hash to assign users to variants:

```
┌────────────────────────────────────────────────────────────┐
│                  Deterministic Bucketing                    │
│                                                            │
│  userId: "user-42"                                         │
│       │                                                    │
│       ▼                                                    │
│  hash = 0                                                  │
│  for each char in userId:                                  │
│      hash = (hash * 31 + charCode) >>> 0                   │
│       │                                                    │
│       ▼                                                    │
│  bucket = hash % totalWeight                               │
│       │                                                    │
│       ▼                                                    │
│  ┌──────────┬──────────┬──────────┐                        │
│  │ control  │ big_cta  │  video   │  (weights: 50/30/20)   │
│  │  0–49    │  50–79   │  80–99   │                        │
│  └──────────┴──────────┴──────────┘                        │
│       │                                                    │
│       ▼                                                    │
│  Same userId always gets the same variant                  │
└────────────────────────────────────────────────────────────┘
```

- The hash is computed from the user ID string using a simple polynomial rolling hash
- The bucket is the hash modulo the total weight across all variants
- The same user ID always maps to the same variant (deterministic)
- Adjust weights to control traffic distribution

## Analytics Integration

The SDK provides an `onVariantAssigned` callback that fires when a flag with variants is resolved for a user. Use this to send experiment exposure events to your analytics provider.

### Setup

```tsx
<FlagProvider
  serviceUrl="https://flags.example.com"
  userId={currentUser.id}
  onVariantAssigned={(flagKey, variantName, userId) => {
    console.log(`User ${userId} assigned to variant "${variantName}" for flag "${flagKey}"`);
  }}
>
  <App />
</FlagProvider>
```

The callback is called once per variant flag after flags are fetched from the API. It receives three arguments:

| Argument | Type | Description |
|---|---|---|
| `flagKey` | `string` | The flag key (e.g., `hero_variant`) |
| `variantName` | `string` | The assigned variant name (e.g., `big_cta`) |
| `userId` | `string` | The user ID passed to `FlagProvider` |

### Google Analytics (GA4)

```tsx
<FlagProvider
  serviceUrl="https://flags.example.com"
  userId={currentUser.id}
  onVariantAssigned={(flagKey, variantName, userId) => {
    gtag('event', 'experiment_exposure', {
      experiment_id: flagKey,
      variant_id: variantName,
      user_id: userId,
    });
  }}
>
  <App />
</FlagProvider>
```

### Mixpanel

```tsx
<FlagProvider
  serviceUrl="https://flags.example.com"
  userId={currentUser.id}
  onVariantAssigned={(flagKey, variantName, userId) => {
    mixpanel.track('Experiment Exposure', {
      experiment: flagKey,
      variant: variantName,
      distinct_id: userId,
    });
  }}
>
  <App />
</FlagProvider>
```

### Amplitude

```tsx
<FlagProvider
  serviceUrl="https://flags.example.com"
  userId={currentUser.id}
  onVariantAssigned={(flagKey, variantName, userId) => {
    amplitude.track('Experiment Exposure', {
      experiment_key: flagKey,
      variant_name: variantName,
      user_id: userId,
    });
  }}
>
  <App />
</FlagProvider>
```

### Notes

- The callback only fires when `userId` is set and the API response includes variant metadata.
- It fires once per resolved variant flag per fetch cycle (on mount and on cache revalidation).
- If the API is unreachable and cached/default values are used, the callback is **not** fired (no variant resolution occurred).

## Troubleshooting

**Service unreachable** — if the SDK cannot reach the API, it falls back to the `defaults` you provided to `FlagProvider`. Your app will still render with fallback values.

**401 Unauthorized errors** — check that your API token is valid and included in the `Authorization: Bearer <token>` header. Tokens are only shown once at creation; create a new one if lost. The resolve endpoint (`/api/flags/resolve`) requires authentication.

**403 Forbidden on resolve** — if you're using an app-scoped token, the `app_id` query parameter must match the token's scope. An app-scoped token cannot resolve flags for a different app. Use an unscoped token or Auth0 JWT to resolve flags for any app.

**CORS issues** — if your app and the API are on different origins, ensure the API is configured to allow your app's origin. The Fastify API uses `@fastify/cors`; check the CORS configuration in the API setup.

**Flags not updating** — runtime flags are fetched on page load. To see changes, reload the page. Build-time flags require a rebuild.

**A/B test variants not working** — ensure you are passing `userId` to `FlagProvider` and that the flag has a `variants` JSON string set. Without `userId`, the flag's plain `value` is returned instead.
