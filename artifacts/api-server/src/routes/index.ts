import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import dashboardRouter from "./dashboard";
import coursesRouter from "./courses";
import batchesRouter from "./batches";
import timingsRouter from "./timings";
import adminsRouter from "./admins";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentsRouter);
router.use(dashboardRouter);
router.use("/courses", coursesRouter);
router.use("/batches", batchesRouter);
router.use("/timings", timingsRouter);
router.use("/admins", adminsRouter);

export default router;
