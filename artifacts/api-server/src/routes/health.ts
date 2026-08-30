import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const { error } = await supabase.from("students").select("id").limit(1);
  if (error) {
    logger.error(
      { supabase: { code: error.code, message: error.message, details: error.details, hint: error.hint } },
      "Supabase readiness check failed",
    );
    res.status(503).json({ error: "Supabase storage is not ready." });
    return;
  }
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
