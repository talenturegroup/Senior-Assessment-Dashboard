import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, candidatesTable } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      clerkUserId?: string;
      candidate?: typeof candidatesTable.$inferSelect;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = userId;
  next();
}

export async function getOrCreateCandidate(
  clerkUserId: string,
): Promise<typeof candidatesTable.$inferSelect> {
  const [byClerkId] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.clerkUserId, clerkUserId));
  if (byClerkId) return byClerkId;

  const user = await clerkClient.users.getUser(clerkUserId);
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    `${clerkUserId}@unknown.local`;
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || email.split("@")[0];

  const [byEmail] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.email, email));
  if (byEmail) {
    const [linked] = await db
      .update(candidatesTable)
      .set({ clerkUserId })
      .where(eq(candidatesTable.id, byEmail.id))
      .returning();
    return linked;
  }

  const [created] = await db
    .insert(candidatesTable)
    .values({
      clerkUserId,
      name,
      email,
      role: "",
      yearsOfExperience: 0,
      skills: [],
      profileComplete: false,
    })
    .returning();
  return created;
}

export async function attachCandidate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const candidate = await getOrCreateCandidate(req.clerkUserId!);
    req.candidate = candidate;
    next();
  } catch (err) {
    req.log.error({ err }, "failed to load candidate");
    res.status(500).json({ error: "Failed to load candidate" });
  }
}
