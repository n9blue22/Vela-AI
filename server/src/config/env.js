import dotenv from "dotenv";

dotenv.config();

function requireEnv(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (!value) {
    console.warn(`[env] Missing ${name}`);
  }
  return value;
}

function readBoolean(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(raw).trim().toLowerCase());
}

function readNumber(name, fallback) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT ?? 5050),
  SUPABASE_URL: requireEnv("SUPABASE_URL", ""),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
  JWT_SECRET: requireEnv("JWT_SECRET", "change-this-secret"),
  FRONTEND_URL: requireEnv("FRONTEND_URL", "http://127.0.0.1:5173"),
  GEMINI_API_KEY: requireEnv("GEMINI_API_KEY", ""),
  GEMINI_MODEL: requireEnv("GEMINI_MODEL", "gemini-2.0-flash"),
  ADMIN_BOOTSTRAP_EMAILS: (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  ALLOW_RESET_TOKEN_IN_RESPONSE: readBoolean(
    "ALLOW_RESET_TOKEN_IN_RESPONSE",
    (process.env.NODE_ENV || "development") !== "production"
  ),
  RATE_LIMIT_AUTH_CAPACITY: readNumber("RATE_LIMIT_AUTH_CAPACITY", 8),
  RATE_LIMIT_AUTH_REFILL_PER_SEC: readNumber("RATE_LIMIT_AUTH_REFILL_PER_SEC", 0.2),
  RATE_LIMIT_AUTH_BLOCK_MS: readNumber("RATE_LIMIT_AUTH_BLOCK_MS", 5 * 60 * 1000),
  RATE_LIMIT_CONTENT_CAPACITY: readNumber("RATE_LIMIT_CONTENT_CAPACITY", 20),
  RATE_LIMIT_CONTENT_REFILL_PER_SEC: readNumber("RATE_LIMIT_CONTENT_REFILL_PER_SEC", 0.5),
  RATE_LIMIT_CONTENT_BLOCK_MS: readNumber("RATE_LIMIT_CONTENT_BLOCK_MS", 60 * 1000)
};
