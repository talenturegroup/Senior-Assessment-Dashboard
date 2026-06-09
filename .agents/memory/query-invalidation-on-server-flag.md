---
name: Invalidate owning query when a mutation flips a server-side gating flag
description: Why client loading gates can hang forever after a mutation, and the fix in this codegen/react-query setup.
---

When a UI loading gate keys off a server field that a mutation flips (e.g. an interview page that renders a loader until `session.questionsGenerated === true`), the mutation's success handler MUST invalidate the query that owns that field. The generated react-query hooks do not auto-refetch related queries.

**Why:** the interview page gated on `session.questionsGenerated`; the auto-fire "generate questions" mutation set it `true` server-side, but nothing invalidated the `getSession` query, so the client copy stayed `false` and the page was stuck on the loader forever. An e2e test caught it; typecheck/curl could not.

**How to apply:** after any mutation that changes a field another query reads (especially a field a render gate depends on), call `queryClient.invalidateQueries({ queryKey: getGet<Resource>QueryKey(id) })` for each affected resource. The generated key getters (`getGet...QueryKey`) are exported from `@workspace/api-client-react`.
