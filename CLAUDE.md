# CLAUDE.md

Project conventions and rules for Claude Code.

## Project Structure

Monorepo with npm workspaces:

- `packages/api` — Fastify REST API with SQLite (better-sqlite3), TypeScript
- `packages/dashboard` — React + Vite + Tailwind CSS dashboard UI
- `packages/sdk` — React SDK for consuming flags at runtime

## Git Workflow

- **Never push directly to `main`** — repository rules enforce this
- Create a feature branch per task: `feat/`, `fix/`, `docs/` prefixes
- Push the branch and create a PR to merge into `main`
- Commit messages follow conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`

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
- Build-time badge color: `bg-amber-100 text-amber-800`; runtime: `bg-blue-100 text-blue-800`
- Warning banners use: `bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md px-3 py-2`

## API Conventions

- Framework: Fastify with TypeScript
- Database: SQLite via better-sqlite3
- Auth: JWT tokens via cookies, API token via Bearer header
- All mutating routes require authentication
- Input validation on all POST/PUT endpoints
- Error shape: `{ error, statusCode }`

## Roadmap

Track progress in `ROADMAP.md` at the repo root. Mark tasks as done (`[x]`) when completing features.
