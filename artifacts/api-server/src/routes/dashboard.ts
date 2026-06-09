import { Router, type IRouter } from "express";
import { eq, count, avg, sql } from "drizzle-orm";
import { db, candidatesTable, sessionsTable, evaluationsTable } from "@workspace/db";
import { GetDashboardStatsResponse, GetRecentSessionsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [candidateCount] = await db.select({ count: count() }).from(candidatesTable);
  const [completedCount] = await db
    .select({ count: count() })
    .from(sessionsTable)
    .where(eq(sessionsTable.status, "evaluated"));

  const [avgResult] = await db
    .select({ avg: avg(evaluationsTable.overallScore) })
    .from(evaluationsTable);

  const [strongHireCount] = await db
    .select({ count: count() })
    .from(evaluationsTable)
    .where(eq(evaluationsTable.rating, "strong_hire"));

  const [hireCount] = await db
    .select({ count: count() })
    .from(evaluationsTable)
    .where(eq(evaluationsTable.rating, "hire"));

  const [noHireCount] = await db
    .select({ count: count() })
    .from(evaluationsTable)
    .where(eq(evaluationsTable.rating, "no_hire"));

  const totalEvals = (strongHireCount?.count ?? 0) + (hireCount?.count ?? 0) + (noHireCount?.count ?? 0);
  const hiresTotal = (strongHireCount?.count ?? 0) + (hireCount?.count ?? 0);
  const hireRate = totalEvals > 0 ? Math.round((hiresTotal / totalEvals) * 100) : 0;

  const stats = {
    totalCandidates: Number(candidateCount?.count ?? 0),
    completedSessions: Number(completedCount?.count ?? 0),
    averageScore: Math.round(Number(avgResult?.avg ?? 0)),
    hireRate,
    strongHireCount: Number(strongHireCount?.count ?? 0),
    hireCount: Number(hireCount?.count ?? 0),
    noHireCount: Number(noHireCount?.count ?? 0),
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

router.get("/dashboard/recent-sessions", async (_req, res): Promise<void> => {
  const recentSessions = await db
    .select({
      id: sessionsTable.id,
      candidateName: candidatesTable.name,
      roleTitle: sessionsTable.roleTitle,
      status: sessionsTable.status,
      overallScore: evaluationsTable.overallScore,
      rating: evaluationsTable.rating,
      createdAt: sessionsTable.createdAt,
    })
    .from(sessionsTable)
    .leftJoin(candidatesTable, eq(sessionsTable.candidateId, candidatesTable.id))
    .leftJoin(evaluationsTable, eq(sessionsTable.id, evaluationsTable.sessionId))
    .orderBy(sql`${sessionsTable.createdAt} DESC`)
    .limit(10);

  const mapped = recentSessions.map(s => ({
    id: s.id,
    candidateName: s.candidateName ?? "Unknown",
    roleTitle: s.roleTitle,
    status: s.status,
    overallScore: s.overallScore ?? null,
    rating: s.rating ?? null,
    createdAt: s.createdAt.toISOString(),
  }));

  res.json(GetRecentSessionsResponse.parse(mapped));
});

export default router;
