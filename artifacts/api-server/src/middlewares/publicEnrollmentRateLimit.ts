import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

/** Limits unauthenticated enrollment submissions to reduce automated spam. */
export function publicEnrollmentRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.method !== "POST") return next();

  const now = Date.now();
  const key = req.ip || "unknown";
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  current.count += 1;
  if (current.count > MAX_REQUESTS) {
    res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
    res.status(429).json({
      error: "Too many enrollment attempts. Please wait a few minutes and try again.",
    });
    return;
  }
  next();
}
