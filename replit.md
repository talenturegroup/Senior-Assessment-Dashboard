# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `ADMIN_EMAILS` — comma-separated list of sign-in emails granted recruiter/admin access (case-insensitive). Unset = no one can reach the recruiter area.

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
- **Candidates never see their own scores/evaluation.** After completing an assessment, `results.tsx` shows only a thank-you confirmation ("the Arvencor team will reach out"). All evaluation content (overall/sub-scores, rating, summary, strengths, weaknesses, suggestions) and the verbatim responses live solely on the recruiter/admin detail dialog. Responses are still persisted (`GET /sessions/:id/answers`); evaluations carry `humanReviewStatus` (`pending`|`reviewed`) — AI scores are provisional.
- **One successful completion locks a role: no retakes.** Once a candidate has an `evaluated` session for a role, they can never start that role again, but they CAN apply for any other role. Enforced server-side in `POST /sessions` (checks for an existing `evaluated` session by normalized `roleTitle` → 409 `ROLE_ALREADY_COMPLETED`) and mirrored client-side on the dashboard (`completedRoles` set from `status === "evaluated"` sessions; role cards show "Assessment completed" and disable, spotlight drops the Start/Retake button and offers only a confirmation view, banner on 409). In-progress/`pending` sessions are unaffected and remain resumable.
- **Profile is a full page** (`profile.tsx`, Navbar/Footer) that auto-populates from an uploaded CV. The client extracts text (`src/lib/extract-cv.ts`: PDF via pdf.js, DOCX via mammoth, TXT) and `POST /candidates/me/cv` runs `parseCV` (OpenAI + deterministic fallback) to fill name/phone/location/skills and store all parsed sections in `cvParsed`.
- **Recruiter/admin area** (`admin.tsx`, route `/admin`): authorized users review ALL candidates' sessions, answers, and scores in one place, and toggle each evaluation's `humanReviewStatus`. Authorization = signed-in user whose `candidate.email` ∈ `ADMIN_EMAILS` (comma-separated, case-insensitive). Server middleware `requireAdmin` (`auth.ts`) runs AFTER `requireAuth` + `attachCandidate` → 403 for non-admins. Admin routes (`routes/admin.ts`) are intentionally cross-candidate (not ownership-scoped); they are gated solely by `requireAdmin`. `GET /admin/access` returns `{isAdmin}` without 403 so the client can conditionally show the navbar "Recruiter" link (`use-admin.ts`). Server is the source of truth; client gating is advisory.
  - The session-detail dialog also shows the candidate's **CV on file** (`cvText`/`cvParsed`, already carried by the `Candidate` schema) and offers client-side `.txt` downloads of a full **assessment copy** (Q&A + scores + evaluation) and a **CV copy**.
  - **Delete candidate** (`DELETE /admin/candidates/:id`) removes the candidate plus every session/question/answer/evaluation. The schema has no FK cascade, so deletion runs in a single transaction that deletes children via subqueries evaluated at delete time (answers → questions → evaluations → sessions → candidate) to avoid orphaning a concurrently-created session. Confirm-gated in the UI.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Non-answers must score 0.** `evaluateAnswer` (`api-server/src/lib/ai.ts`) hard-zeros blank/placeholder/too-short transcripts via `isBlankAnswer()` before any AI call; the AI prompt also instructs 0 for non-attempts; the deterministic fallback is length-aware (never a flat reward). The client submits `transcript.trim()` (empty, not a placeholder). If you touch scoring, keep all three layers consistent or empty interviews will inflate again.
- After editing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` and restart the API server workflow so regenerated `@workspace/api-zod` is picked up.
- **The role-completion lock lives in two places that must agree.** Server (`POST /sessions`) and client (dashboard `completedRoles`) both key the lock on `status === "evaluated"` and both normalize `roleTitle` with `trim().toLowerCase()` (server: `lower(trim(...))`). Changing the keyed status or the normalization in one layer without the other lets users bypass the lock or see a stale state. Server is the source of truth (returns 409 `ROLE_ALREADY_COMPLETED`); client is advisory UX.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
