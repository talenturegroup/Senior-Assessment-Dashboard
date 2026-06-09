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

AI Assessment Dashboard (Arvencor): candidates sign in with Google, complete a profile + CV, pick a role, and run an AI-driven technical interview that is scored and evaluated.

- The interview opens with a spoken AI welcome/intro stage (browser `speechSynthesis`, `src/lib/speech.ts`), greets the candidate by name, then reads each question aloud. Speech has a mute/replay control and degrades gracefully (no-op) where unsupported.
- Question mix spans 5 `questionType`s: `soft_skill`, `technical`, `coding`, `system_design`, `behavioral`. Scoring buckets: coding→technical, soft_skill→communication.
- **Blank/skipped answers score 0** (see Gotchas). Final score is 0 / `no_hire` when no genuine answers are given.
- Candidate responses are persisted and surfaced for human review on the results page (`GET /sessions/:id/answers`); evaluations carry `humanReviewStatus` (`pending`|`reviewed`) shown as a badge — AI scores are provisional.
- **Retake limit: max 3 attempts per role per candidate.** Enforced server-side in `POST /sessions` (case-insensitive `roleTitle` count → 409 `RETAKE_LIMIT_REACHED`) and mirrored client-side on the dashboard (spotlight + role cards show `x/3`, disable start at the limit, banner on 409).
- **Profile is a full page** (`profile.tsx`, Navbar/Footer) that auto-populates from an uploaded CV. The client extracts text (`src/lib/extract-cv.ts`: PDF via pdf.js, DOCX via mammoth, TXT) and `POST /candidates/me/cv` runs `parseCV` (OpenAI + deterministic fallback) to fill name/phone/location/skills and store all parsed sections in `cvParsed`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Non-answers must score 0.** `evaluateAnswer` (`api-server/src/lib/ai.ts`) hard-zeros blank/placeholder/too-short transcripts via `isBlankAnswer()` before any AI call; the AI prompt also instructs 0 for non-attempts; the deterministic fallback is length-aware (never a flat reward). The client submits `transcript.trim()` (empty, not a placeholder). If you touch scoring, keep all three layers consistent or empty interviews will inflate again.
- After editing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` and restart the API server workflow so regenerated `@workspace/api-zod` is picked up.
- **Retake limit lives in two places that must agree.** Server (`POST /sessions`) and client (dashboard `attemptsByRole`) both count attempts and both normalize `roleTitle` case-insensitively. Changing the cap (3) or the normalization in one layer without the other lets users bypass the limit or see a wrong count. Server is the source of truth (returns 409); client is advisory UX.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
