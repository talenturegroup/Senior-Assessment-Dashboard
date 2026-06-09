import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, evaluationsTable } from "@workspace/db";
import { GetEvaluationParams, GetEvaluationResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/evaluations/:sessionId", async (req, res): Promise<void> => {
  const params = GetEvaluationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

  res.json(GetEvaluationResponse.parse(evaluation));
});

export default router;
