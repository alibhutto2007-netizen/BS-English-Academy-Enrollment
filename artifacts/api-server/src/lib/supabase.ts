import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.SUPABASE_URL?.trim().replace(/^['"]|['"]$/g, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const key = serviceRoleKey ?? process.env.SUPABASE_ANON_KEY?.trim();

if (!rawUrl || !key) {
  throw new Error("SUPABASE_URL and a Supabase API key must be configured.");
}

if (process.env.NODE_ENV === "production" && !serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY must be configured in production.");
}

let url: string;
try {
  const parsedUrl = new URL(rawUrl);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Supabase URL must use http:// or https://.");
  }
  url = parsedUrl.toString().replace(/\/$/, "");
} catch {
  throw new Error(
    "SUPABASE_URL must be a valid http:// or https:// Supabase project URL.",
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
