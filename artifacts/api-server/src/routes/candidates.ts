import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, candidatesTable } from "@workspace/db";
import {
  GetCurrentCandidateResponse,
  UpdateCurrentCandidateBody,
  UpdateCurrentCandidateResponse,
  UploadCurrentCandidateCVBody,
  UploadCurrentCandidateCVResponse,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";
import { requireAuth, attachCandidate } from "../lib/auth";

const router: IRouter = Router();

router.get("/candidates/me", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  res.json(GetCurrentCandidateResponse.parse(serializeDates(req.candidate!)));
});

router.patch("/candidates/me", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const parsed = UpdateCurrentCandidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof candidatesTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.yearsOfExperience !== undefined)
    updateData.yearsOfExperience = parsed.data.yearsOfExperience;
  if (parsed.data.skills !== undefined) updateData.skills = parsed.data.skills;
  if (parsed.data.linkedinUrl !== undefined) updateData.linkedinUrl = parsed.data.linkedinUrl;
  if (parsed.data.profileComplete !== undefined)
    updateData.profileComplete = parsed.data.profileComplete;

  const [candidate] = await db
    .update(candidatesTable)
    .set(updateData)
    .where(eq(candidatesTable.id, req.candidate!.id))
    .returning();

  res.json(UpdateCurrentCandidateResponse.parse(serializeDates(candidate)));
});

router.post("/candidates/me/cv", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const parsed = UploadCurrentCandidateCVBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [candidate] = await db
    .update(candidatesTable)
    .set({
      cvText: parsed.data.cvText,
      cvFileName: parsed.data.cvFileName,
      profileComplete: true,
    })
    .where(eq(candidatesTable.id, req.candidate!.id))
    .returning();

  res.json(UploadCurrentCandidateCVResponse.parse(serializeDates(candidate)));
});

export default router;
