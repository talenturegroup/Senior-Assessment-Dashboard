import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, candidatesTable } from "@workspace/db";
import {
  CreateCandidateBody,
  GetCandidateParams,
  GetCandidateResponse,
  UpdateCandidateParams,
  UpdateCandidateBody,
  UpdateCandidateResponse,
  UploadCandidateCVParams,
  UploadCandidateCVBody,
  UploadCandidateCVResponse,
  SignInCandidateBody,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

router.post("/candidates", async (req, res): Promise<void> => {
  const parsed = CreateCandidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.email, parsed.data.email));

  if (existing.length > 0) {
    res.status(400).json({ error: "A candidate with this email already exists" });
    return;
  }

  const [candidate] = await db
    .insert(candidatesTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      yearsOfExperience: parsed.data.yearsOfExperience,
      skills: parsed.data.skills ?? [],
      linkedinUrl: parsed.data.linkedinUrl ?? null,
    })
    .returning();

  res.status(201).json(GetCandidateResponse.parse(serializeDates(candidate)));
});

router.post("/candidates/signin", async (req, res): Promise<void> => {
  const parsed = SignInCandidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [candidate] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.email, parsed.data.email));

  if (!candidate) {
    res.status(404).json({ error: "No account found with this email. Please sign up first." });
    return;
  }

  res.json(GetCandidateResponse.parse(serializeDates(candidate)));
});

router.get("/candidates/:id", async (req, res): Promise<void> => {
  const params = GetCandidateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [candidate] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, params.data.id));

  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  res.json(GetCandidateResponse.parse(serializeDates(candidate)));
});

router.patch("/candidates/:id", async (req, res): Promise<void> => {
  const params = UpdateCandidateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCandidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof candidatesTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.yearsOfExperience !== undefined) updateData.yearsOfExperience = parsed.data.yearsOfExperience;
  if (parsed.data.skills !== undefined) updateData.skills = parsed.data.skills;
  if (parsed.data.linkedinUrl !== undefined) updateData.linkedinUrl = parsed.data.linkedinUrl;
  if (parsed.data.profileComplete !== undefined) updateData.profileComplete = parsed.data.profileComplete;

  const [candidate] = await db
    .update(candidatesTable)
    .set(updateData)
    .where(eq(candidatesTable.id, params.data.id))
    .returning();

  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  res.json(UpdateCandidateResponse.parse(serializeDates(candidate)));
});

router.post("/candidates/:id/cv", async (req, res): Promise<void> => {
  const params = UploadCandidateCVParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UploadCandidateCVBody.safeParse(req.body);
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
    .where(eq(candidatesTable.id, params.data.id))
    .returning();

  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  res.json(UploadCandidateCVResponse.parse(serializeDates(candidate)));
});

export default router;
