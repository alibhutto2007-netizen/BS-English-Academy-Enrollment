import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentsRouter);
router.use(dashboardRouter);

export default router;
