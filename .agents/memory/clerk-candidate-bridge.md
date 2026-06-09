---
name: Clerk → numeric candidate bridge
description: How Clerk auth maps to existing numeric candidate rows, and the ownership rule for session-scoped routes.
---

# Clerk → numeric candidate bridge

Auth is **Replit-managed Clerk** (Google sign-in). The app already had numeric `candidates.id` PKs and FKs (sessions, evaluations), so we did NOT switch PKs to Clerk user ids. Instead:

- `candidates.clerkUserId` (text, unique, nullable) bridges the Clerk user to the numeric row.
- `getOrCreateCandidate` resolves identity **clerkUserId → email → insert** (backfills clerkUserId on the email match so pre-existing email rows adopt the Clerk user on first login).
- There is **no client-supplied `candidateId`** anywhere. All candidate ops are `/candidates/me`; sessions are created/listed against `req.candidate.id`.

**Why:** keeps existing numeric FKs intact while migrating off the old email-only auth, and removes a whole class of IDOR (client can't claim another candidate's id).

**How to apply:** any new route that touches a candidate's data must use `requireAuth` + `attachCandidate` and scope by `req.candidate!.id`. For anything addressed by a session/evaluation numeric id, also verify `session.candidateId === req.candidate!.id` and return **404** (not 403) on mismatch — don't leak existence.

## Web auth transport
Web is **cookie auth only** (same-origin via the shared proxy). Do NOT add `getToken`/Bearer/`setAuthTokenGetter`. The generated `customFetch` relies on fetch defaults, which send same-origin cookies automatically.
