import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.SUPABASE_URL?.trim().replace(/^['"]|['"]$/g, "");
const key = process.env.SUPABASE_ANON_KEY?.trim();

if (!rawUrl || !key) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be configured.");
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