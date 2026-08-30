import { Router, type IRouter } from "express";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";
import { requireAdmin } from "../middlewares/require-admin";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from("students")
    .select("batch,time,date_of_admission");
  if (error) {
    logger.error(
      { supabase: { code: error.code, message: error.message, details: error.details, hint: error.hint } },
      "Unable to load dashboard summary from Supabase",
    );
    res.status(503).json({ error: "Unable to load dashboard summary." });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const batches = new Map<string, number>();
  const times = new Map<string, number>();
  let todayAdmissions = 0;

  for (const student of data ?? []) {
    batches.set(student.batch, (batches.get(student.batch) ?? 0) + 1);
    times.set(student.time, (times.get(student.time) ?? 0) + 1);
    if (student.date_of_admission === today) todayAdmissions += 1;
  }

  const summary = {
    totalStudents: data?.length ?? 0,
    todayAdmissions,
    batchCounts: Array.from(batches, ([label, count]) => ({ label, count })),
    timeCounts: Array.from(times, ([label, count]) => ({ label, count })),
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;