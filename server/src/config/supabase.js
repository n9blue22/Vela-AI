import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

let supabaseClient = null;

export function getSupabaseClient() {
  if (!env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL is required.");
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false
      }
    });
  }

  return supabaseClient;
}

