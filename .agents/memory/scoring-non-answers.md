---
name: Score non-answers as zero across all layers
description: How the AI interview avoids rewarding empty/skipped answers, and the layers that must stay consistent.
---

Empty, placeholder, or non-attempt interview answers must score 0 — never a flat fallback. A flat 65 in the answer-eval fallback once caused a no-answer interview to score 65/100.

**Why:** AI scoring fallbacks and "no answer" placeholders silently rewarded candidates who typed nothing. The fix only holds if every layer agrees.

**How to apply (three layers must stay consistent):**
1. Client submits the real trimmed transcript (empty string when blank) — do NOT send a placeholder like "No answer provided.".
2. `evaluateAnswer` short-circuits to 0 for blank/placeholder/too-short via an `isBlankAnswer()` guard before calling the model; the model prompt also says score 0 for non-attempts; the catch/fallback is length-aware, not a constant.
3. `generateFinalEvaluation` defaults the average to 0 (not 50) and returns overallScore 0 / `no_hire` when all transcripts are blank.

If you add a new answer path or change fallbacks, re-check all three or empty interviews will inflate again.
