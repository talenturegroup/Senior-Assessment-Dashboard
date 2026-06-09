import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, evaluationsTable, sessionsTable } from "@workspace/db";
import { GetEvaluationParams, GetEvaluationResponse } from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";
import { requireAuth, attachCandidate } from "../lib/auth";

const router: IRouter = Router();

router.get("/evaluations/:sessionId", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const params = GetEvaluationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [owned] = await db
    .select({ candidateId: sessionsTable.candidateId })
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.sessionId));

  if (!owned || owned.candidateId !== req.candidate!.id) {
    res.status(404).json({ error: "Evaluation not found" });
    return;
  }

  const [evaluation] = await db
    .select()
    .from(evaluationsTable)
    .where(eq(evaluationsTable.sessionId, params.data.sessionId));

  if (!evaluation) {
    res.status(404).json({ error: "Evaluation not found" });
    return;
  }

  res.json(GetEvaluationResponse.parse(serializeDates(evaluation)));
});

export default router;
