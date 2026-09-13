import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

const configuredAdminIds = (process.env.ADMIN_USER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (typeof userId !== "string" || !userId) {
    res.status(401).json({ error: "Admin sign-in required." });
    return;
  }
  if (process.env.NODE_ENV === "production" && configuredAdminIds.length === 0) {
    logger.error("ADMIN_USER_IDS is missing in production");
    res.status(503).json({ error: "Admin access is not configured." });
    return;
  }
  if (configuredAdminIds.length > 0 && !configuredAdminIds.includes(userId)) {
    res.status(403).json({ error: "You are not authorized to access the admissions desk." });
    return;
  }
  next();
}
