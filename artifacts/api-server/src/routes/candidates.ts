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
import { parseCV } from "../lib/ai";

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
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.location !== undefined) updateData.location = parsed.data.location;
  if (parsed.data.profileComplete !== undefined)
    updateData.profileComplete = parsed.data.profileComplete;

  const [candidate] = await db
    .update(candidatesTable)
    .set(updateData)
    .where(eq(candidatesTable.id, req.candidate!.id))
    .returning();

  res.json(UpdateCurrentCandidateResponse.parse(serializeDates(candidate)));
});

router.get("/candidates/me/cv", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const candidate = req.candidate!;
  res.json({
    cvText: candidate.cvText || null,
    cvFileName: candidate.cvFileName || null,
    cvParsed: candidate.cvParsed || null,
  });
});

router.post("/candidates/me/cv", requireAuth, attachCandidate, async (req, res): Promise<void> => {
  const parsed = UploadCurrentCandidateCVBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const cv = await parseCV(parsed.data.cvText);

  // Merge CV-derived skills with any already on file (case-insensitive union).
  const existingSkills = req.candidate!.skills ?? [];
  const mergedSkills = [...existingSkills];
  for (const skill of cv.skills) {
    if (!mergedSkills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      mergedSkills.push(skill);
    }
  }

  const update: Partial<typeof candidatesTable.$inferInsert> = {
    cvText: parsed.data.cvText,
    cvFileName: parsed.data.cvFileName,
    cvParsed: {
      summary: cv.summary,
      sections: cv.sections,
      name: cv.name || null,
      phone: cv.phone || null,
      location: cv.location || null,
      years: cv.years || null,
    },
    profileComplete: true,
  };
  // Only fill contact fields from the CV when not already set, so we never
  // overwrite values the candidate entered manually.
  if (cv.name && !req.candidate!.name) update.name = cv.name;
  if (cv.phone && !req.candidate!.phone) update.phone = cv.phone;
  if (cv.location && !req.candidate!.location) update.location = cv.location;
  if (cv.years !== null && !req.candidate!.yearsOfExperience) update.yearsOfExperience = cv.years;
  if (mergedSkills.length > 0) update.skills = mergedSkills;

  const [candidate] = await db
    .update(candidatesTable)
    .set(update)
    .where(eq(candidatesTable.id, req.candidate!.id))
    .returning();

  res.json(UploadCurrentCandidateCVResponse.parse(serializeDates(candidate)));
});

export default router;
