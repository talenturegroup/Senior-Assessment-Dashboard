import { Router, type IRouter } from "express";
import healthRouter from "./health";
import candidatesRouter from "./candidates";
import rolesRouter from "./roles";
import sessionsRouter from "./sessions";
import evaluationsRouter from "./evaluations";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import ttsRouter from "./tts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(candidatesRouter);
router.use(rolesRouter);
router.use(sessionsRouter);
router.use(evaluationsRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(ttsRouter);

export default router;
