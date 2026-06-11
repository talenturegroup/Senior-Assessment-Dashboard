import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import {
  db,
  sessionsTable,
  candidatesTable,
  questionsTable,
  answersTable,
  evaluationsTable,
} from "@workspace/db";
import {
  GetAdminAccessResponse,
  ListAdminSessionsResponse,
  GetAdminSessionDetailParams,
  GetAdminSessionDetailResponse,
  SetAdminReviewStatusParams,
  SetAdminReviewStatusBody,
  SetAdminReviewStatusResponse,
} from "@workspace/api-zod";
import { serializeDates, serializeDatesArray } from "../lib/serialize";
import { requireAuth, attachCandidate, requireAdmin, isAdminEmail } from "../lib/auth";

const router: IRouter = Router();

// Lightweight check used by the client to decide whether to surface the admin
// area. Returns 200 for any signed-in user with an `isAdmin` flag (never 403).
router.get("/admin/access", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  res.json(GetAdminAccessResponse.parse({ isAdmin: isAdminEmail(req.candidate!.email) }));
});

router.get(
  "/admin/sessions",
  requireAuth,
  attachCandidate,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        id: sessionsTable.id,
        candidateId: sessionsTable.candidateId,
        candidateName: candidatesTable.name,
        candidateEmail: candidatesTable.email,
        roleTitle: sessionsTable.roleTitle,
        status: sessionsTable.status,
        overallScore: evaluationsTable.overallScore,
        rating: evaluationsTable.rating,
        humanReviewStatus: evaluationsTable.humanReviewStatus,
        answerCount: sql<number>`(select count(*) from ${answersTable} where ${answersTable.sessionId} = ${sessionsTable.id})`,
        createdAt: sessionsTable.createdAt,
        completedAt: sessionsTable.completedAt,
      })
      .from(sessionsTable)
      .leftJoin(candidatesTable, eq(sessionsTable.candidateId, candidatesTable.id))
      .leftJoin(evaluationsTable, eq(sessionsTable.id, evaluationsTable.sessionId))
      .orderBy(desc(sessionsTable.createdAt));

    const mapped = rows.map((r) => ({
      id: r.id,
      candidateId: r.candidateId,
      candidateName: r.candidateName ?? "Unknown",
      candidateEmail: r.candidateEmail ?? "",
      roleTitle: r.roleTitle,
      status: r.status,
      overallScore: r.overallScore ?? null,
      rating: r.rating ?? null,
      humanReviewStatus: r.humanReviewStatus ?? null,
      answerCount: Number(r.answerCount ?? 0),
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    }));

    res.json(ListAdminSessionsResponse.parse(mapped));
  },
);

router.get(
  "/admin/sessions/:id",
  requireAuth,
  attachCandidate,
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = GetAdminSessionDetailParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, params.data.id));

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const [candidate] = await db
      .select()
      .from(candidatesTable)
      .where(eq(candidatesTable.id, session.candidateId));

    if (!candidate) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    const questions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.sessionId, session.id))
      .orderBy(questionsTable.orderIndex);

    const answers = await db
      .select()
      .from(answersTable)
      .where(eq(answersTable.sessionId, session.id))
      .orderBy(answersTable.id);

    const [evaluation] = await db
      .select()
      .from(evaluationsTable)
      .where(eq(evaluationsTable.sessionId, session.id));

    res.json(
      GetAdminSessionDetailResponse.parse({
        session: serializeDates(session),
        candidate: serializeDates(candidate),
        questions,
        answers: serializeDatesArray(answers),
        evaluation: evaluation ? serializeDates(evaluation) : null,
      }),
    );
  },
);

router.patch(
  "/admin/sessions/:id/review",
  requireAuth,
  attachCandidate,
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = SetAdminReviewStatusParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = SetAdminReviewStatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [evaluation] = await db
      .update(evaluationsTable)
      .set({ humanReviewStatus: parsed.data.humanReviewStatus })
      .where(eq(evaluationsTable.sessionId, params.data.id))
      .returning();

    if (!evaluation) {
      res.status(404).json({ error: "Evaluation not found" });
      return;
    }

    res.json(SetAdminReviewStatusResponse.parse(serializeDates(evaluation)));
  },
);

export default router;
