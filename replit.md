# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema (source of truth): `lib/db/src/schema/`
- API contract (source of truth): `lib/api-spec/openapi.yaml` → generates `@workspace/api-zod` and `@workspace/api-client-react`
- Backend routes: `artifacts/api-server/src/routes/`; auth helpers: `artifacts/api-server/src/lib/auth.ts`
- Frontend pages: `artifacts/assessment-dashboard/src/pages/`; theme: `artifacts/assessment-dashboard/src/index.css`

## Architecture decisions

- **Auth = Replit-managed Clerk**, Google sign-in. Frontend wraps app in `ClerkProvider` with a branded `shadcn` appearance; web uses **cookie auth only** (same-origin), no Bearer tokens / `getToken`.
- **Candidate identity is server-derived.** Clerk users bridge to numeric candidate rows via `clerkUserId` (unique, nullable) on `candidates`. `getOrCreateCandidate` resolves by clerkUserId → email → insert. There is no client-supplied `candidateId`; all candidate ops are `/candidates/me` and sessions are scoped to `req.candidate.id`.
- **Every session-scoped route enforces ownership** (`requireAuth` + `attachCandidate` + `session.candidateId === req.candidate.id`, 404 on mismatch) to prevent IDOR by numeric id.
- AI calls (OpenAI) have deterministic fallbacks so the app works without `OPENAI_API_KEY`.

## Product

AI Assessment Dashboard (EVAL_CORE): candidates sign in with Google, complete a profile + CV, pick a role, and run an AI-driven technical interview that is scored and evaluated.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
