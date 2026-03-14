# Auth0 Setup Guide

This guide walks through configuring Auth0 for the Kanary feature flag system.

## 1. Create an Auth0 Tenant

Sign up at [auth0.com](https://auth0.com) and create a new tenant (e.g., `kanary-dev`).

## 2. Create a Single Page Application (SPA)

1. Go to **Applications > Create Application**
2. Choose **Single Page Web Applications**
3. Name it (e.g., "Kanary Dashboard")
4. Under **Settings**, configure:
   - **Allowed Callback URLs**: `http://localhost:5173` (dev), plus your production URL
   - **Allowed Logout URLs**: `http://localhost:5173`, plus your production URL
   - **Allowed Web Origins**: `http://localhost:5173`, plus your production URL
5. Note the **Domain** and **Client ID** — you'll need these for the dashboard `.env`

## 3. Create an API

1. Go to **Applications > APIs > Create API**
2. Set:
   - **Name**: Kanary API
   - **Identifier (Audience)**: `https://api.kanary.dev` (or your preferred identifier)
   - **Signing Algorithm**: RS256
3. Note the **Identifier** — this is your `AUTH0_AUDIENCE`

## 4. Define Roles

1. Go to **User Management > Roles**
2. Create two roles:
   - `admin` — full access (create/update/delete flags, manage tokens)
   - `viewer` — read-only access
3. Assign roles to users as needed

## 5. Add Roles to Token Claims (Post-Login Action)

1. Go to **Actions > Flows > Login**
2. Create a new custom Action (e.g., "Add roles to token")
3. Add this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://kanary.dev/roles';
  const roles = event.authorization?.roles || [];
  api.accessToken.setCustomClaim(namespace, roles);
  api.idToken.setCustomClaim(namespace, roles);
};
```

4. Deploy the Action and drag it into the Login flow

## 6. Environment Variables

### API (`packages/api/.env`)

```
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.kanary.dev
```

### Dashboard (`packages/dashboard/.env`)

```
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://api.kanary.dev
VITE_AUTH0_CALLBACK_URL=http://localhost:5173
```

## 7. Verify

1. Start the API: `npm run dev -w packages/api`
2. Start the dashboard: `npm run dev -w packages/dashboard`
3. Open the dashboard — you should be redirected to Auth0 login
4. After authenticating, the dashboard should load with your user info
5. Flag CRUD operations should work with the Auth0 Bearer token
6. API tokens (created via the dashboard) continue to work for programmatic access
