# CLAUDE.md

Project conventions and rules for Claude Code.

## Project Structure

Monorepo with npm workspaces:

- `packages/api` — Fastify REST API with PostgreSQL (pg), TypeScript
- `packages/dashboard` — React + Vite + Tailwind CSS dashboard UI
- `packages/sdk` — React SDK for consuming flags at runtime

## Git Workflow

- **Never push directly to `main`** — repository rules enforce this
- Create a feature branch per task: `feat/`, `fix/`, `docs/` prefixes
- Push the branch and create a PR to merge into `main`
- Commit messages follow conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- **Before committing**, always run lint, tests, and build to verify changes:
  1. `npm run lint -w packages/dashboard` — lint dashboard
  2. `npm test -w packages/dashboard` — run dashboard tests
  3. `npm run build -w packages/dashboard` — build dashboard
  4. `npm run lint -w packages/api` — lint API
  5. `npm test -w packages/api` — run API tests (requires test DB: `npm run test:db:up -w packages/api`)
  6. `npm run build -w packages/api` — build API
  7. Only commit if all checks pass; fix any failures first

## Testing

- Test framework: **Vitest** across all packages
- Dashboard tests use **@testing-library/react**
- Run dashboard tests: `npm test -w packages/dashboard`
- Run API tests: `npm test -w packages/api`
- Every new component or feature must include tests
- Tests live next to source files: `Component.test.tsx` alongside `Component.tsx`

## Dashboard Conventions

- Components live in `packages/dashboard/src/components/`
- Shared types in `packages/dashboard/src/types.ts`
- API client in `packages/dashboard/src/api.ts`
- Styling: Tailwind CSS utility classes, no CSS files
- Build-time badge color: `bg-amber-900/40 text-amber-300`; runtime: `bg-yellow-900/40 text-yellow-300`
- Warning banners use: `bg-amber-900/30 border border-amber-700 text-amber-300 text-sm rounded-md px-3 py-2`

## Frontend Design Rules

- **Dark theme only** — backgrounds: page `gray-950`, surfaces `gray-900`, inputs `gray-800`; borders: `gray-700` (cards), `gray-600` (inputs)
- **Accent colors** — yellow (primary/runtime), amber (warnings/build-time), red (danger/delete), green (success/created); badges and banners use translucent `bg-[color]-900/40 text-[color]-300`
- **Buttons** — primary `bg-yellow-500 text-gray-900 hover:bg-yellow-600`, secondary `border border-gray-600 hover:bg-gray-800`, danger `bg-red-600 hover:bg-red-700`; all `rounded-md px-4 py-2 text-sm font-medium`; disabled `opacity-50 cursor-not-allowed`
- **Inputs** — `bg-gray-800 border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-yellow-500`; validation swaps border/ring color (red/green/amber)
- **Components** — cards `bg-gray-900 rounded-lg border border-gray-700 p-4`; modals `bg-black/50` backdrop + `max-w-md` panel; toasts `fixed bottom-4 right-4`; badges `text-xs px-2 py-0.5 rounded-full`; inline SVG icons (`w-5 h-5`, `currentColor`)

## API Conventions

- Framework: Fastify with TypeScript
- Database: PostgreSQL via pg (node-postgres)
- Auth: Auth0 RS256 JWTs via Bearer header, API tokens via Bearer header
- All mutating routes require authentication
- Input validation on all POST/PUT endpoints
- Error shape: `{ error, statusCode }`

## Roadmap

Track progress in `ROADMAP.md` at the repo root. Mark tasks as done (`[x]`) when completing features.
