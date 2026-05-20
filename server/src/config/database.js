import { env } from "./env.js";

export async function connectDatabase() {
  try {
    if (!env.SUPABASE_URL) {
      throw new Error("SUPABASE_URL is required.");
    }
    if (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_ANON_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required.");
    }
    if (!env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_ANON_KEY) {
      console.warn("[db] Running with SUPABASE_ANON_KEY. Some privileged operations may be limited.");
    }
    if (env.NODE_ENV === "production" && (!env.JWT_SECRET || env.JWT_SECRET === "change-this-secret")) {
      throw new Error("JWT_SECRET must be configured securely in production.");
    }

    console.log("[db] Supabase configuration loaded");
  } catch (error) {
    console.error("[db] Connection configuration failed", error);
    throw error;
  }
}
