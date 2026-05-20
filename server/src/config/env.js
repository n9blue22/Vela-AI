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

function readNonNegativeNumber(name, fallback) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

function readOptional(name, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

function readCsv(name, fallback = "") {
  return String(process.env[name] ?? fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT ?? 5050),
  SUPABASE_URL: requireEnv("SUPABASE_URL", ""),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
  SUPABASE_ANON_KEY: requireEnv("SUPABASE_ANON_KEY", ""),
  JWT_SECRET: requireEnv("JWT_SECRET", "change-this-secret"),
  FRONTEND_URL: requireEnv("FRONTEND_URL", "http://127.0.0.1:5173"),
  AI_PROVIDER_ORDER: requireEnv("AI_PROVIDER_ORDER", "groq,cloudflare,openrouter,gemini"),
  AI_REQUEST_TIMEOUT_MS: readNumber("AI_REQUEST_TIMEOUT_MS", 12000),
  GROQ_API_KEY: requireEnv("GROQ_API_KEY", ""),
  GROQ_MODEL: requireEnv("GROQ_MODEL", "llama-3.1-8b-instant"),
  OPENROUTER_API_KEY: requireEnv("OPENROUTER_API_KEY", ""),
  OPENROUTER_MODEL: requireEnv("OPENROUTER_MODEL", "openrouter/free"),
  CLOUDFLARE_API_TOKEN: requireEnv("CLOUDFLARE_API_TOKEN", ""),
  CLOUDFLARE_ACCOUNT_ID: requireEnv("CLOUDFLARE_ACCOUNT_ID", ""),
  CLOUDFLARE_MODEL: requireEnv("CLOUDFLARE_MODEL", "@cf/meta/llama-3.1-8b-instruct"),
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
  RATE_LIMIT_CONTENT_BLOCK_MS: readNumber("RATE_LIMIT_CONTENT_BLOCK_MS", 60 * 1000),
  RATE_LIMIT_AUTOPOST_CAPACITY: readNumber("RATE_LIMIT_AUTOPOST_CAPACITY", 8),
  RATE_LIMIT_AUTOPOST_REFILL_PER_SEC: readNumber("RATE_LIMIT_AUTOPOST_REFILL_PER_SEC", 0.08),
  RATE_LIMIT_AUTOPOST_BLOCK_MS: readNumber("RATE_LIMIT_AUTOPOST_BLOCK_MS", 2 * 60 * 1000),

  // Zernio (social auto-post integration)
  ZERNIO_API_BASE_URL: readOptional("ZERNIO_API_BASE_URL", "https://zernio.com/api/v1"),
  ZERNIO_API_KEY: readOptional("ZERNIO_API_KEY", ""),
  ZERNIO_ACCOUNT_ID_FACEBOOK: readOptional("ZERNIO_ACCOUNT_ID_FACEBOOK", ""),
  ZERNIO_ACCOUNT_ID_INSTAGRAM: readOptional("ZERNIO_ACCOUNT_ID_INSTAGRAM", ""),
  ZERNIO_ACCOUNT_ID_TIKTOK: readOptional("ZERNIO_ACCOUNT_ID_TIKTOK", ""),
  ZERNIO_ENABLED_PLATFORMS: readCsv("ZERNIO_ENABLED_PLATFORMS", "facebook,instagram"),
  ZERNIO_ALLOW_PARTIAL_SUCCESS: readBoolean("ZERNIO_ALLOW_PARTIAL_SUCCESS", true),
  ZERNIO_PUBLISH_TIMEOUT_MS: readNumber("ZERNIO_PUBLISH_TIMEOUT_MS", 20000),
  ZERNIO_RETRY_ATTEMPTS: readNonNegativeNumber("ZERNIO_RETRY_ATTEMPTS", 2),
  ZERNIO_ACCOUNT_CACHE_TTL_MS: readNumber("ZERNIO_ACCOUNT_CACHE_TTL_MS", 5 * 60 * 1000),
  ZERNIO_SCHEDULE_JITTER_SECONDS: readNonNegativeNumber("ZERNIO_SCHEDULE_JITTER_SECONDS", 180),
  ZERNIO_DEFAULT_TIMEZONE: readOptional("ZERNIO_DEFAULT_TIMEZONE", "Asia/Bangkok"),
  ZERNIO_MAX_IMAGE_MB: readNumber("ZERNIO_MAX_IMAGE_MB", 10),
  ZERNIO_MAX_VIDEO_MB: readNumber("ZERNIO_MAX_VIDEO_MB", 300),
  ZERNIO_WEBHOOK_PATH: readOptional("ZERNIO_WEBHOOK_PATH", "/api/integrations/zernio/webhook"),
  ZERNIO_WEBHOOK_SECRET: readOptional("ZERNIO_WEBHOOK_SECRET", "")
};
