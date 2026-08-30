import { Router, type IRouter } from "express";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";
import { requireAdmin } from "../middlewares/require-admin";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const batchOrder = ["Basic", "Advance", "Medium", "Free Batch"];
const timeOrder = [
  "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM",
  "4:00 PM - 5:00 PM",
  "5:00 PM - 6:00 PM",
];

router.get("/dashboard/summary", requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from("students")
    .select("batch,time,course_subject,date_of_admission");
  if (error) {
    logger.error(
      { supabase: { code: error.code, message: error.message, details: error.details, hint: error.hint } },
      "Unable to load dashboard summary from Supabase",
    );
    res.status(503).json({ error: "Unable to load dashboard summary." });
    return;
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const batches = new Map(batchOrder.map((label) => [label, 0]));
  const times = new Map(timeOrder.map((label) => [label, 0]));
  const courses = new Map<string, number>();
  let todayAdmissions = 0;

  for (const student of data ?? []) {
    batches.set(student.batch, (batches.get(student.batch) ?? 0) + 1);
    times.set(student.time, (times.get(student.time) ?? 0) + 1);
    courses.set(student.course_subject, (courses.get(student.course_subject) ?? 0) + 1);
    if (student.date_of_admission === today) todayAdmissions += 1;
  }

  const summary = {
    totalStudents: data?.length ?? 0,
    todayAdmissions,
    batchCounts: Array.from(batches, ([label, count]) => ({ label, count })),
    timeCounts: Array.from(times, ([label, count]) => ({ label, count })),
    courseCounts: Array.from(courses, ([label, count]) => ({ label, count })),
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;