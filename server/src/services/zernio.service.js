import crypto from "node:crypto";
import { env } from "../config/env.js";

const SUPPORTED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/avi",
  "video/x-msvideo",
  "video/webm",
  "video/x-m4v"
]);
const accountIdCache = new Map();

function normalizeBaseUrl() {
  const raw = String(env.ZERNIO_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!raw) return "https://zernio.com/api/v1";
  if (/\/api\/v\d+$/i.test(raw) || /\/v\d+$/i.test(raw)) return raw;
  if (/\/api$/i.test(raw)) return `${raw}/v1`;
  if (/zernio\.com$/i.test(raw)) return `${raw}/api/v1`;
  return raw;
}

function buildUrl(pathname) {
  const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${normalizeBaseUrl()}${safePath}`;
}

function getFriendlyZernioErrorMessage(status, payload) {
  const serverMessage = String(payload?.error || payload?.message || "").trim();
  if (serverMessage) return serverMessage;
  if (status === 401) return "Zernio API key khong hop le hoac da het han.";
  if (status === 402) return "Tai khoan Zernio can nang cap billing de tiep tuc.";
  if (status === 404) return "Khong tim thay API path tren Zernio. Hay kiem tra ZERNIO_API_BASE_URL.";
  if (status === 409) return "Noi dung nay da tung dang gan day. Hay doi caption hoac media de dang lai.";
  if (status === 429) return "Zernio dang gioi han toc do. Vui long doi it phut va thu lai.";
  return `Zernio API loi ${status}.`;
}

async function readResponseBody(response) {
  const rawText = await response.text();
  if (!rawText) return {};
  try {
    return JSON.parse(rawText);
  } catch {
    return { message: rawText };
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function shouldRetryZernioError(error) {
  const status = Number(error?.status || 0);
  if (status === 408 || status === 425 || status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  const message = String(error?.message || "").toLowerCase();
  return message.includes("timeout") || message.includes("ket noi") || message.includes("network");
}

function makeZernioError(response, payload) {
  const error = new Error(getFriendlyZernioErrorMessage(response.status, payload));
  error.status = response.status;
  error.code = payload?.code || "";
  error.details = payload;
  return error;
}

function assertApiKey() {
  if (!String(env.ZERNIO_API_KEY || "").trim()) {
    throw new Error("Ban chua cau hinh ZERNIO_API_KEY trong file .env.");
  }
}

export function isSupportedMediaContentType(contentType) {
  const normalized = String(contentType || "").trim().toLowerCase();
  return SUPPORTED_MEDIA_TYPES.has(normalized);
}

export function detectMediaKind(contentType) {
  const normalized = String(contentType || "").trim().toLowerCase();
  if (normalized.startsWith("video/")) return "video";
  if (normalized.startsWith("image/")) return "image";
  return "";
}

export function buildAccountIdMapFromEnv() {
  return {
    facebook: String(env.ZERNIO_ACCOUNT_ID_FACEBOOK || "").trim(),
    instagram: String(env.ZERNIO_ACCOUNT_ID_INSTAGRAM || "").trim(),
    tiktok: String(env.ZERNIO_ACCOUNT_ID_TIKTOK || "").trim()
  };
}

export async function requestZernio(pathname, { method = "GET", body, requestId = "" } = {}) {
  assertApiKey();
  const timeoutMs = Number.isFinite(env.ZERNIO_PUBLISH_TIMEOUT_MS)
    ? Math.max(5000, Number(env.ZERNIO_PUBLISH_TIMEOUT_MS))
    : 20000;
  const maxRetries = Math.max(0, Math.min(4, Math.floor(Number(env.ZERNIO_RETRY_ATTEMPTS || 0))));
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(buildUrl(pathname), {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${env.ZERNIO_API_KEY}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(requestId ? { "x-request-id": requestId } : {})
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      const payload = await readResponseBody(response);
      if (!response.ok) {
        throw makeZernioError(response, payload);
      }

      return payload;
    } catch (error) {
      let normalizedError = error;
      if (error instanceof DOMException && error.name === "AbortError") {
        normalizedError = new Error("Zernio phan hoi qua cham. Vui long thu lai sau.");
        normalizedError.status = 408;
      } else if (error instanceof TypeError && String(error.message).toLowerCase().includes("fetch")) {
        normalizedError = new Error("Khong ket noi duoc toi Zernio API. Hay kiem tra internet va ZERNIO_API_BASE_URL.");
        normalizedError.status = 503;
      }

      lastError = normalizedError;
      if (attempt >= maxRetries || !shouldRetryZernioError(normalizedError)) {
        throw normalizedError;
      }

      await wait(300 * (attempt + 1) + Math.floor(Math.random() * 150));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error("Zernio API loi khong xac dinh.");
}

function pickAccountId(row) {
  return String(row?._id || row?.id || row?.accountId || "").trim();
}

export async function findActiveAccountId(platform) {
  const platformKey = String(platform || "").trim().toLowerCase();
  if (!platformKey) return null;
  const cached = accountIdCache.get(platformKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accountId;
  }

  const query = new URLSearchParams({
    platform: platformKey,
    page: "1",
    limit: "50"
  }).toString();
  const result = await requestZernio(`/accounts?${query}`);
  const rows = Array.isArray(result?.accounts) ? result.accounts : [];
  if (!rows.length) return null;

  const active = rows.find((row) => row?.isActive !== false && String(row?.platform || "").toLowerCase() === platformKey);
  const preferred = active || rows.find((row) => String(row?.platform || "").toLowerCase() === platformKey) || rows[0];
  const accountId = pickAccountId(preferred);
  if (accountId) {
    const ttlMs = Number(env.ZERNIO_ACCOUNT_CACHE_TTL_MS || 5 * 60 * 1000);
    accountIdCache.set(platformKey, {
      accountId,
      expiresAt: Date.now() + Math.max(30 * 1000, ttlMs)
    });
  }
  return accountId || null;
}

export async function createMediaPresign({ fileName, contentType, fileSize }) {
  return requestZernio("/media/presign", {
    method: "POST",
    body: {
      filename: fileName,
      contentType,
      size: fileSize
    }
  });
}

function mapPlatformResult(platform, responsePayload) {
  const post = responsePayload?.post || {};
  const firstPlatform = Array.isArray(post?.platforms) && post.platforms.length ? post.platforms[0] : {};
  return {
    platform,
    postId: String(post?._id || post?.id || "").trim(),
    status: String(firstPlatform?.status || post?.status || "queued").trim(),
    message: String(responsePayload?.message || "").trim(),
    platformPostId: String(firstPlatform?.platformPostId || "").trim(),
    platformPostUrl: String(firstPlatform?.platformPostUrl || "").trim(),
    publishedAt: firstPlatform?.publishedAt || post?.publishedAt || null,
    scheduledFor: firstPlatform?.scheduledFor || post?.scheduledFor || null
  };
}

export async function publishByPlatform({
  platform,
  accountId,
  caption,
  mediaItems,
  mode,
  scheduleAt,
  timezone
}) {
  const requestId = crypto.randomUUID();
  const payload = {
    content: caption,
    mediaItems,
    platforms: [{ platform, accountId }],
    timezone: timezone || env.ZERNIO_DEFAULT_TIMEZONE || "Asia/Bangkok",
    ...(mode === "now" ? { publishNow: true } : {}),
    ...(mode === "schedule" ? { scheduledFor: scheduleAt } : {})
  };

  try {
    const created = await requestZernio("/posts", {
      method: "POST",
      body: payload,
      requestId
    });
    return mapPlatformResult(platform, created);
  } catch (error) {
    if (error?.status === 404) {
      const created = await requestZernio("/post", {
        method: "POST",
        body: payload,
        requestId
      });
      return mapPlatformResult(platform, created);
    }
    throw error;
  }
}
