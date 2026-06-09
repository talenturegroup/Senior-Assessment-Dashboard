---
name: orval + react-query v5 queryKey requirement
description: Why generated query hooks fail typecheck when passing { query: { enabled } }, and the correct fixes
---

# Orval-generated query hooks + react-query v5

The orval react-query client generates the options param as the full `UseQueryOptions`,
and react-query v5 makes `queryKey` **required** on that type. So calling a generated
hook like `useGetCandidate(id, { query: { enabled: !!id } })` fails typecheck with
TS2741 "Property 'queryKey' is missing". Vite does NOT typecheck, so this passes at
runtime and is easy to miss — only `pnpm --filter <pkg> run typecheck` (or `pnpm run
typecheck`) catches it.

**Why:** v4 had queryKey optional on `UseQueryOptions`; v5 tightened it. Orval emits the
raw v5 type.

**How to apply (two correct fixes, pick per call site):**
1. Path-param hooks (e.g. getCandidate/getSession/getEvaluation/getSessionQuestions)
   already inject `enabled: !!(id)` and a default `queryKey` internally. If your only
   option was `enabled: !!id`, just **drop the options entirely** — the hook auto-disables
   when the id is falsy. Cleanest, preserves behavior.
2. Conditional `enabled` (extra gate beyond id) or query-param hooks (e.g. listSessions):
   keep the options and pass the **generated key getter** as queryKey, e.g.
   `{ query: { enabled: cond, queryKey: getListSessionsQueryKey(params) } }`.
   Do NOT cast to `Parameters<typeof hook>[1]` — that collapses the generic TData to `{}`
   and breaks `data` typing downstream. Do NOT invent a custom queryKey string — use the
   generated getter so cache invalidation stays consistent.
