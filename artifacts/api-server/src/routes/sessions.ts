import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, sessionsTable, questionsTable, answersTable, evaluationsTable, candidatesTable } from "@workspace/db";
import {
  CreateSessionBody,
  GetSessionParams,
  GetSessionResponse,
  UpdateSessionParams,
  UpdateSessionBody,
  UpdateSessionResponse,
  GetSessionQuestionsParams,
  GetSessionQuestionsResponse,
  GenerateSessionQuestionsParams,
  SubmitAnswerParams,
  SubmitAnswerBody,
  ListSessionAnswersResponse,
  EvaluateSessionParams,
  EvaluateSessionResponse,
  ListSessionsResponse,
} from "@workspace/api-zod";
import { generateInterviewQuestions, evaluateAnswer, generateFinalEvaluation } from "../lib/ai";
import { serializeDates, serializeDatesArray } from "../lib/serialize";
import { requireAuth, attachCandidate } from "../lib/auth";

const router: IRouter = Router();

router.get("/sessions", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.candidateId, req.candidate!.id))
    .orderBy(sessionsTable.createdAt);

  res.json(ListSessionsResponse.parse(serializeDatesArray(sessions)));
});

router.post("/sessions", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // A successfully completed (evaluated) assessment locks that role: no retakes.
  // Candidates may still apply for a different role.
  const [completed] = await db
    .select({ id: sessionsTable.id })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.candidateId, req.candidate!.id),
        sql`lower(trim(${sessionsTable.roleTitle})) = lower(trim(${parsed.data.roleTitle}))`,
        eq(sessionsTable.status, "evaluated")
      )
    )
    .limit(1);

  if (completed) {
    res.status(409).json({
      error: "ROLE_ALREADY_COMPLETED",
      message: `You have already completed the assessment for "${parsed.data.roleTitle}". You can apply for a different role.`,
    });
    return;
  }

  const [session] = await db
    .insert(sessionsTable)
    .values({
      candidateId: req.candidate!.id,
      roleTitle: parsed.data.roleTitle,
      jobDescription: parsed.data.jobDescription ?? null,
      status: "pending",
      questionsGenerated: false,
    })
    .returning();

  res.status(201).json(GetSessionResponse.parse(serializeDates(session)));
});

router.get("/sessions/:id", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const params = GetSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id));

  if (!session || session.candidateId !== req.candidate!.id) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(GetSessionResponse.parse(serializeDates(session)));
});

router.patch("/sessions/:id", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const params = UpdateSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [owned] = await db
    .select({ candidateId: sessionsTable.candidateId })
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id));

  if (!owned || owned.candidateId !== req.candidate!.id) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const updateData: Partial<typeof sessionsTable.$inferInsert> = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.startedAt !== undefined) updateData.startedAt = new Date(parsed.data.startedAt);
  if (parsed.data.completedAt !== undefined) updateData.completedAt = new Date(parsed.data.completedAt);

  const [session] = await db
    .update(sessionsTable)
    .set(updateData)
    .where(eq(sessionsTable.id, params.data.id))
    .returning();

  res.json(UpdateSessionResponse.parse(serializeDates(session)));
});

router.post("/sessions/:id/violations", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  try {
    const params = UpdateSessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [owned] = await db
      .select({ candidateId: sessionsTable.candidateId, violations: sessionsTable.violations })
      .from(sessionsTable)
      .where(eq(sessionsTable.id, params.data.id));

    if (!owned || owned.candidateId !== req.candidate!.id) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const [session] = await db
      .update(sessionsTable)
      .set({ violations: sql`${sessionsTable.violations} + 1` })
      .where(eq(sessionsTable.id, params.data.id))
      .returning();

    res.json({ violations: session.violations });
  } catch (error) {
    console.error("Violation route error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/sessions/:id/questions", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const params = GetSessionQuestionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [owned] = await db
    .select({ candidateId: sessionsTable.candidateId })
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id));

  if (!owned || owned.candidateId !== req.candidate!.id) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.sessionId, params.data.id))
    .orderBy(questionsTable.orderIndex);

  res.json(GetSessionQuestionsResponse.parse(questions));
});

router.post("/sessions/:id/questions", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const params = GenerateSessionQuestionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id));

  if (!session || session.candidateId !== req.candidate!.id) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.questionsGenerated) {
    const existing = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.sessionId, params.data.id))
      .orderBy(questionsTable.orderIndex);
    res.status(201).json(GetSessionQuestionsResponse.parse(existing));
    return;
  }

  const [candidate] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, session.candidateId));

  const generated = await generateInterviewQuestions(
    session.roleTitle,
    candidate?.cvText ?? null,
    session.jobDescription
  );

  const inserted = await db
    .insert(questionsTable)
    .values(
      generated.map(q => ({
        sessionId: params.data.id,
        questionText: q.questionText,
        questionType: q.questionType,
        orderIndex: q.orderIndex,
      }))
    )
    .returning();

  await db
    .update(sessionsTable)
    .set({ questionsGenerated: true, status: "in_progress", startedAt: new Date() })
    .where(eq(sessionsTable.id, params.data.id));

  res.status(201).json(GetSessionQuestionsResponse.parse(inserted));
});

router.get("/sessions/:id/answers", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const params = SubmitAnswerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [owned] = await db
    .select({ candidateId: sessionsTable.candidateId })
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id));

  if (!owned || owned.candidateId !== req.candidate!.id) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const answers = await db
    .select()
    .from(answersTable)
    .where(eq(answersTable.sessionId, params.data.id))
    .orderBy(answersTable.id);

  res.json(ListSessionAnswersResponse.parse(serializeDatesArray(answers)));
});

router.post("/sessions/:id/answers", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const params = SubmitAnswerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SubmitAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id));

  if (!session || session.candidateId !== req.candidate!.id) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [question] = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.id, parsed.data.questionId));

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const evaluation = await evaluateAnswer(
    question.questionText,
    parsed.data.transcript,
    session.roleTitle
  );

  const [answer] = await db
    .insert(answersTable)
    .values({
      sessionId: params.data.id,
      questionId: parsed.data.questionId,
      transcript: parsed.data.transcript,
      score: evaluation.score,
      feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
    })
    .returning();

  res.status(201).json(serializeDates(answer));
});

router.post("/sessions/:id/evaluate", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  console.log("[Backend] /sessions/:id/evaluate request body:", req.body);
  const params = EvaluateSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { disqualified = false } = req.body;
  console.log("[Backend] Extracted disqualified flag:", disqualified);

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id));

  if (!session || session.candidateId !== req.candidate!.id) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(evaluationsTable)
    .where(eq(evaluationsTable.sessionId, params.data.id));

  if (existing) {
    res.json(EvaluateSessionResponse.parse(serializeDates(existing)));
    return;
  }

  // Handle disqualification - skip AI scoring, set default values
  if (disqualified) {
    const [evaluation] = await db
      .insert(evaluationsTable)
      .values({
        sessionId: params.data.id,
        overallScore: 0,
        roleFitScore: 0,
        rating: "NO_HIRE",
        technicalScore: 0,
        communicationScore: 0,
        domainScore: 0,
        strengths: "N/A - Disqualified",
        weaknesses: `Disqualified due to ${session.violations} gaze violations`,
        suggestions: "N/A - Disqualified",
        readyForHiring: false,
        summary: "Assessment terminated due to proctoring violations.",
        humanReviewStatus: "pending",
      })
      .returning();

    await db
      .update(sessionsTable)
      .set({
        status: "disqualified",
        completedAt: new Date(),
        disqualificationReason: `${session.violations} gaze violations`,
      })
      .where(eq(sessionsTable.id, params.data.id));

    res.json(EvaluateSessionResponse.parse(serializeDates(evaluation)));
    return;
  }

  // Normal evaluation flow
  const answers = await db
    .select({
      questionText: questionsTable.questionText,
      questionType: questionsTable.questionType,
      transcript: answersTable.transcript,
      score: answersTable.score,
    })
    .from(answersTable)
    .leftJoin(questionsTable, eq(answersTable.questionId, questionsTable.id))
    .where(eq(answersTable.sessionId, params.data.id));

  const [candidate] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, session.candidateId));

  const evalResult = await generateFinalEvaluation(
    session.roleTitle,
    answers.map(a => ({
      question: a.questionText ?? "",
      transcript: a.transcript,
      score: a.score,
      questionType: a.questionType ?? "technical",
    })),
    candidate?.cvText ?? null
  );

  const [evaluation] = await db
    .insert(evaluationsTable)
    .values({ sessionId: params.data.id, ...evalResult })
    .returning();

  await db
    .update(sessionsTable)
    .set({ status: "evaluated", completedAt: new Date() })
    .where(eq(sessionsTable.id, params.data.id));

  res.json(EvaluateSessionResponse.parse(serializeDates(evaluation)));
});

export default router;
