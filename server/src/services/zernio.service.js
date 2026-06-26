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

export class IntegrationConfigurationError extends Error {
  constructor(message = "Tính năng đăng tự động chưa sẵn sàng. Vui lòng liên hệ quản trị viên để kích hoạt kết nối.") {
    super(message);
    this.name = "IntegrationConfigurationError";
    this.status = 503;
    this.code = "integration_not_configured";
  }
}

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
  if (status === 401) return "Kết nối đăng tự động không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại cấu hình.";
  if (status === 402) return "Tài khoản đăng tự động cần nâng cấp billing để tiếp tục.";
  if (status === 404) return "Dịch vụ đăng tự động chưa nhận đúng đường dẫn API. Vui lòng kiểm tra cấu hình backend.";
  if (status === 409) return "Nội dung này đã từng đăng gần đây. Hãy đổi caption hoặc media để đăng lại.";
  if (status === 429) return "Dịch vụ đăng tự động đang giới hạn tốc độ. Vui lòng đợi ít phút rồi thử lại.";
  return `Dịch vụ đăng tự động lỗi ${status}.`;
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
    throw new IntegrationConfigurationError();
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
        normalizedError = new Error("Dịch vụ đăng tự động phản hồi quá chậm. Vui lòng thử lại sau.");
        normalizedError.status = 408;
      } else if (error instanceof TypeError && String(error.message).toLowerCase().includes("fetch")) {
        normalizedError = new Error("Không kết nối được tới dịch vụ đăng tự động. Vui lòng kiểm tra backend.");
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

  throw lastError || new Error("Dịch vụ đăng tự động lỗi không xác định.");
}

function pickAccountId(row) {
  return String(row?._id || row?.id || row?.accountId || "").trim();
}

function pickProfileId(row) {
  const profile = row?.profileId || row?.profile || row?.profile_id;
  if (profile && typeof profile === "object") {
    return String(profile._id || profile.id || profile.profileId || "").trim();
  }
  return String(profile || "").trim();
}

function pickProfileName(row) {
  const profile = row?.profileId || row?.profile || {};
  if (profile && typeof profile === "object") {
    return String(profile.name || profile.displayName || "").trim();
  }
  return "";
}

function pickProfileFromPayload(payload) {
  return payload?.profile || payload?.data?.profile || payload?.data || payload;
}

function normalizeAccountRow(row) {
  return {
    accountId: pickAccountId(row),
    platform: String(row?.platform || "").trim().toLowerCase(),
    profileId: pickProfileId(row),
    profileName: pickProfileName(row),
    username: String(row?.username || row?.handle || "").trim(),
    displayName: String(row?.displayName || row?.name || row?.username || "").trim(),
    profileUrl: String(row?.profileUrl || row?.url || "").trim(),
    isActive: row?.isActive !== false,
    raw: row || {}
  };
}

export async function createProfileForUser({ name, email, userId }) {
  const cleanName = String(name || email || "Khách hàng").trim().slice(0, 80);
  const profileName = cleanName || `Khách hàng ${String(userId || "").slice(0, 8)}`;
  const created = await requestZernio("/profiles", {
    method: "POST",
    body: {
      name: profileName,
      description: `Social profile for ${String(email || userId || "VELA customer").slice(0, 120)}`,
      color: "#d6678d"
    }
  });
  const profile = pickProfileFromPayload(created);
  const profileId = String(profile?._id || profile?.id || profile?.profileId || "").trim();
  if (!profileId) {
    throw new Error("Dịch vụ đăng tự động chưa trả về mã hồ sơ kết nối. Vui lòng thử lại.");
  }
  return {
    providerProfileId: profileId,
    displayName: String(profile?.name || profileName).trim()
  };
}

export async function getConnectUrl({ platform, profileId, redirectUrl }) {
  const platformKey = String(platform || "").trim().toLowerCase();
  const safeProfileId = String(profileId || "").trim();
  if (!platformKey || !safeProfileId) {
    throw new Error("Thiếu thông tin kết nối mạng xã hội.");
  }

  const query = new URLSearchParams({
    profileId: safeProfileId
  });
  if (redirectUrl) {
    query.set("redirect_url", String(redirectUrl));
  }

  const result = await requestZernio(`/connect/${encodeURIComponent(platformKey)}?${query.toString()}`);
  const authUrl = String(result?.authUrl || result?.connectUrl || result?.redirectUrl || result?.url || "").trim();
  if (!authUrl) {
    throw new Error("Dịch vụ đăng tự động chưa trả về link kết nối. Vui lòng thử lại.");
  }
  return {
    authUrl,
    state: String(result?.state || "").trim()
  };
}

export async function listConnectedAccounts({ profileId, platform } = {}) {
  const query = new URLSearchParams();
  if (profileId) query.set("profileId", String(profileId));
  if (platform) query.set("platform", String(platform).toLowerCase());
  query.set("includeOverLimit", "true");

  const result = await requestZernio(`/accounts${query.toString() ? `?${query.toString()}` : ""}`);
  const rows = Array.isArray(result?.accounts)
    ? result.accounts
    : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];
  return rows.map(normalizeAccountRow).filter((account) => account.accountId);
}

export async function findConnectedAccount({ profileId, platform, accountId }) {
  const platformKey = String(platform || "").trim().toLowerCase();
  const expectedAccountId = String(accountId || "").trim();
  const accounts = await listConnectedAccounts({ profileId, platform: platformKey });
  const account = accounts.find((item) => {
    const sameAccount = !expectedAccountId || item.accountId === expectedAccountId;
    const samePlatform = !platformKey || item.platform === platformKey;
    const sameProfile = !profileId || !item.profileId || item.profileId === profileId;
    return sameAccount && samePlatform && sameProfile;
  });
  return account || null;
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
