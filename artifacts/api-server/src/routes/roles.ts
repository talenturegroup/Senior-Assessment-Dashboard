import { Router, type IRouter } from "express";
import { db, rolesTable } from "@workspace/db";
import { ListRolesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/roles", async (_req, res): Promise<void> => {
  const roles = await db.select().from(rolesTable).orderBy(rolesTable.category, rolesTable.title);
  res.json(ListRolesResponse.parse(roles));
});

export default router;
