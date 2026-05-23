import crypto from "node:crypto";
import express from "express";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { createTokenBucketLimiter } from "../middleware/rate-limit.js";
import { dbService } from "../services/db.service.js";
import {
  createProfileForUser,
  createMediaPresign,
  detectMediaKind,
  findConnectedAccount,
  getConnectUrl,
  isSupportedMediaContentType,
  publishByPlatform
} from "../services/zernio.service.js";

const router = express.Router();
const jsonParser = express.json({ limit: "1mb" });
const MAX_FILES_PER_POST = 10;
const POST_MEDIA_TYPES = new Set(["image", "video", "gif", "document"]);
const SUPPORTED_PLATFORMS = new Set(["facebook", "instagram"]);
const autoPostLimiter = createTokenBucketLimiter({
  keyPrefix: "autopost",
  capacity: env.RATE_LIMIT_AUTOPOST_CAPACITY,
  refillPerSecond: env.RATE_LIMIT_AUTOPOST_REFILL_PER_SEC,
  blockDurationMs: env.RATE_LIMIT_AUTOPOST_BLOCK_MS,
  message: "Dang co qua nhieu yeu cau dang bai. Vui long doi mot chut roi thu lai.",
  getKey: (req) => req.user?.id || req.ip || "unknown"
});

function safeCompare(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function extractSignatureCandidates(signatureHeader) {
  const raw = String(signatureHeader || "").trim();
  if (!raw) return [];

  const plain = [raw];
  const parts = raw.split(",").map((item) => item.trim()).filter(Boolean);
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx > 0 && idx < part.length - 1) {
      plain.push(part.slice(idx + 1).trim());
    }
  }
  return Array.from(new Set(plain.filter(Boolean)));
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = String(env.ZERNIO_WEBHOOK_SECRET || "").trim();
  if (!secret) return { ok: true, reason: "no_secret_configured" };

  const signatureValues = extractSignatureCandidates(signatureHeader);
  if (!signatureValues.length) return { ok: false, reason: "missing_signature" };

  // Compatibility mode:
  // 1) exact header == secret
  // 2) header contains HMAC SHA256 digest (hex) of raw body
  for (const candidate of signatureValues) {
    if (safeCompare(candidate, secret)) {
      return { ok: true, reason: "matched_plain_secret" };
    }
  }

  const hmacHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  for (const candidate of signatureValues) {
    if (safeCompare(candidate.toLowerCase(), hmacHex.toLowerCase())) {
      return { ok: true, reason: "matched_hmac_sha256" };
    }
  }

  return { ok: false, reason: "invalid_signature" };
}

function normalizePlatformList(rawPlatforms) {
  const list = Array.isArray(rawPlatforms) ? rawPlatforms : [];
  const normalized = list
    .map((platform) => String(platform || "").trim().toLowerCase())
    .filter((platform) => SUPPORTED_PLATFORMS.has(platform));
  return Array.from(new Set(normalized));
}

function normalizePlatform(rawPlatform) {
  const platform = String(rawPlatform || "").trim().toLowerCase();
  return SUPPORTED_PLATFORMS.has(platform) ? platform : "";
}

function buildZernioRedirectUrl() {
  return String(env.ZERNIO_CONNECT_REDIRECT_URL || `${env.FRONTEND_URL.replace(/\/+$/, "")}/app`).trim();
}

function normalizeFileName(fileName) {
  const cleaned = String(fileName || "upload-file")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ");
  if (!cleaned) return "upload-file";
  return cleaned.slice(0, 140);
}

function buildSizeLimitBytes(contentType) {
  return contentType.startsWith("video/")
    ? Math.max(1, Number(env.ZERNIO_MAX_VIDEO_MB || 300)) * 1024 * 1024
    : Math.max(1, Number(env.ZERNIO_MAX_IMAGE_MB || 10)) * 1024 * 1024;
}

function normalizeMediaItems(rawMediaItems) {
  const mediaItems = Array.isArray(rawMediaItems) ? rawMediaItems : [];
  return mediaItems
    .map((item) => {
      const url = String(item?.url || "").trim();
      const type = String(item?.type || "").trim().toLowerCase();
      return { url, type };
    })
    .filter((item) => {
      if (!item.url || !POST_MEDIA_TYPES.has(item.type)) return false;
      try {
        const parsed = new URL(item.url);
        return ["http:", "https:"].includes(parsed.protocol);
      } catch {
        return false;
      }
    });
}

function resolveScheduleTime(mode, scheduleAt) {
  const normalizedMode = mode === "schedule" ? "schedule" : "now";
  if (normalizedMode === "now") {
    return { mode: "now", scheduleAtIso: "" };
  }

  const raw = String(scheduleAt || "").trim();
  if (!raw) {
    throw new Error("Ban chua chon thoi gian hen dang.");
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Thoi gian hen dang khong hop le.");
  }
  if (date.getTime() < Date.now() + 30 * 1000) {
    throw new Error("Thoi gian hen dang can lon hon hien tai it nhat 30 giay.");
  }

  return {
    mode: "schedule",
    scheduleAtIso: date.toISOString()
  };
}

function buildPlatformFailure(platform, message, code = "") {
  return {
    platform,
    ok: false,
    message: String(message || "Dang bai that bai."),
    code: String(code || "")
  };
}

function applyScheduleJitter(scheduleAtIso, targetIndex, enabled) {
  if (!scheduleAtIso || !enabled) return scheduleAtIso;
  const jitterWindow = Math.max(0, Math.floor(Number(env.ZERNIO_SCHEDULE_JITTER_SECONDS || 0)));
  if (jitterWindow <= 0) return scheduleAtIso;
  const base = new Date(scheduleAtIso);
  if (Number.isNaN(base.getTime())) return scheduleAtIso;
  const offsetSeconds = targetIndex * 45 + Math.floor(Math.random() * jitterWindow);
  return new Date(base.getTime() + offsetSeconds * 1000).toISOString();
}

router.post("/zernio/webhook", express.raw({ type: "*/*", limit: "2mb" }), async (req, res) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "");
    if (!rawBody) {
      return res.status(400).json({ message: "Webhook payload is empty." });
    }

    const signatureHeader =
      req.headers["x-zernio-signature"] ||
      req.headers["x-zernio-signature-256"] ||
      req.headers["x-webhook-signature"] ||
      "";
    const signatureValue = Array.isArray(signatureHeader) ? signatureHeader[0] : String(signatureHeader || "");
    const verification = verifyWebhookSignature(rawBody, signatureValue);
    if (!verification.ok) {
      return res.status(401).json({ message: "Invalid webhook signature." });
    }

    let payload = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ message: "Webhook JSON is invalid." });
    }

    const eventType = String(payload?.type || payload?.event || payload?.name || "unknown").slice(0, 120);
    try {
      await dbService.createIntegrationWebhookEvent({
        provider: "zernio",
        eventType,
        signature: signatureValue.slice(0, 300),
        payload
      });
    } catch (storageError) {
      console.error("[integrations] webhook stored failed", storageError);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[integrations] zernio webhook failed", error);
    return res.status(500).json({ message: "Webhook handler failed." });
  }
});

router.post("/zernio/media/presign", requireAuth, autoPostLimiter, jsonParser, async (req, res) => {
  try {
    const files = Array.isArray(req.body?.files) ? req.body.files : [];
    if (!files.length) {
      return res.status(400).json({ message: "Chua co tep nao de tai len." });
    }
    if (files.length > MAX_FILES_PER_POST) {
      return res.status(400).json({ message: `Chi duoc tai toi da ${MAX_FILES_PER_POST} tep moi lan.` });
    }

    const normalizedFiles = files.map((file, index) => {
      const fileName = normalizeFileName(file?.fileName || file?.name || `upload-${index + 1}`);
      const contentType = String(file?.contentType || file?.type || "").trim().toLowerCase();
      const fileSize = Number(file?.fileSize || file?.size || 0);

      if (!isSupportedMediaContentType(contentType)) {
        throw new Error(`Dinh dang tep khong ho tro: ${contentType || fileName}`);
      }
      if (!Number.isFinite(fileSize) || fileSize <= 0) {
        throw new Error(`Khong doc duoc dung luong tep: ${fileName}`);
      }
      const maxBytes = buildSizeLimitBytes(contentType);
      if (fileSize > maxBytes) {
        const maxMb = contentType.startsWith("video/") ? env.ZERNIO_MAX_VIDEO_MB : env.ZERNIO_MAX_IMAGE_MB;
        throw new Error(`Tep ${fileName} vuot gioi han ${maxMb}MB.`);
      }

      return { fileName, contentType, fileSize };
    });

    const items = await Promise.all(
      normalizedFiles.map(async (file) => {
        const presign = await createMediaPresign(file);
        const mediaType = String(presign?.type || detectMediaKind(file.contentType) || "image").toLowerCase();
        return {
          fileName: file.fileName,
          contentType: file.contentType,
          fileSize: file.fileSize,
          uploadUrl: String(presign?.uploadUrl || "").trim(),
          publicUrl: String(presign?.publicUrl || "").trim(),
          mediaType: POST_MEDIA_TYPES.has(mediaType) ? mediaType : "image",
          key: String(presign?.key || "").trim()
        };
      })
    );

    const hasInvalidUrl = items.some((item) => !item.uploadUrl || !item.publicUrl);
    if (hasInvalidUrl) {
      return res.status(502).json({ message: "Zernio tra ve du lieu upload khong day du. Vui long thu lai." });
    }

    return res.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong tao duoc link tai tep len Zernio.";
    return res.status(500).json({ message });
  }
});

router.get("/zernio/accounts", requireAuth, async (req, res) => {
  try {
    const accounts = await dbService.listSocialAccountsByOwner(req.user.id, "zernio");
    return res.json({ accounts });
  } catch (error) {
    console.error("[integrations] list social accounts failed", error);
    const message = error instanceof Error ? error.message : "Khong the lay tai khoan dang bai.";
    return res.status(500).json({ message });
  }
});

router.post("/zernio/connect-url", requireAuth, autoPostLimiter, jsonParser, async (req, res) => {
  try {
    const platform = normalizePlatform(req.body?.platform);
    if (!platform) {
      return res.status(400).json({ message: "Nen tang ket noi khong hop le." });
    }

    let profile = await dbService.getSocialProfileByOwner(req.user.id, "zernio");
    if (!profile) {
      const createdProfile = await createProfileForUser({
        name: req.user.name,
        email: req.user.email,
        userId: req.user.id
      });
      profile = await dbService.upsertSocialProfile({
        ownerUserId: req.user.id,
        provider: "zernio",
        providerProfileId: createdProfile.providerProfileId,
        displayName: createdProfile.displayName
      });
    }

    const connect = await getConnectUrl({
      platform,
      profileId: profile.providerProfileId,
      redirectUrl: buildZernioRedirectUrl()
    });

    return res.json({
      authUrl: connect.authUrl,
      platform,
      profileId: profile.providerProfileId
    });
  } catch (error) {
    console.error("[integrations] create zernio connect url failed", error);
    const message = error instanceof Error ? error.message : "Khong tao duoc link ket noi mang xa hoi.";
    return res.status(500).json({ message });
  }
});

router.post("/zernio/connect/complete", requireAuth, autoPostLimiter, jsonParser, async (req, res) => {
  try {
    const platform = normalizePlatform(req.body?.platform || req.body?.connected);
    const profileId = String(req.body?.profileId || "").trim();
    const accountId = String(req.body?.accountId || req.body?.id || "").trim();

    if (!platform || !profileId || !accountId) {
      return res.status(400).json({ message: "Thieu thong tin xac nhan ket noi mang xa hoi." });
    }

    const profile = await dbService.getSocialProfileByOwner(req.user.id, "zernio");
    if (!profile || profile.providerProfileId !== profileId) {
      return res.status(403).json({ message: "Ho so ket noi khong thuoc tai khoan nay." });
    }

    const verifiedAccount = await findConnectedAccount({
      profileId,
      platform,
      accountId
    });
    if (!verifiedAccount) {
      return res.status(400).json({
        message: "Chua xac nhan duoc tai khoan vua ket noi. Vui long thu lai sau khi hoan tat OAuth."
      });
    }

    const account = await dbService.upsertSocialAccount({
      ownerUserId: req.user.id,
      provider: "zernio",
      platform,
      providerProfileId: profile.providerProfileId,
      providerAccountId: verifiedAccount.accountId,
      displayName: verifiedAccount.displayName || req.body?.displayName || req.body?.username || platform,
      username: verifiedAccount.username || req.body?.username || "",
      profileUrl: verifiedAccount.profileUrl || "",
      status: verifiedAccount.isActive ? "connected" : "expired",
      connectedAt: new Date().toISOString()
    });

    return res.json({
      message: "Da ket noi tai khoan dang bai.",
      account
    });
  } catch (error) {
    console.error("[integrations] complete zernio connect failed", error);
    const message = error instanceof Error ? error.message : "Khong the luu tai khoan mang xa hoi.";
    return res.status(500).json({ message });
  }
});

router.delete("/zernio/accounts/:platform", requireAuth, async (req, res) => {
  try {
    const platform = normalizePlatform(req.params.platform);
    if (!platform) {
      return res.status(400).json({ message: "Nen tang ket noi khong hop le." });
    }
    await dbService.deleteSocialAccountByOwnerPlatform(req.user.id, platform, "zernio");
    return res.json({ message: "Da go ket noi tren ung dung." });
  } catch (error) {
    console.error("[integrations] disconnect social account failed", error);
    const message = error instanceof Error ? error.message : "Khong the go ket noi.";
    return res.status(500).json({ message });
  }
});

router.post("/zernio/publish", requireAuth, autoPostLimiter, jsonParser, async (req, res) => {
  try {
    const caption = String(req.body?.caption || "").trim();
    if (!caption || caption.length > 5000) {
      return res.status(400).json({ message: "Noi dung bai dang can tu 1 den 5000 ky tu." });
    }

    const mediaItems = normalizeMediaItems(req.body?.mediaItems);
    if (!mediaItems.length) {
      return res.status(400).json({ message: "Ban can it nhat mot anh hoac video hop le de dang bai." });
    }
    if (mediaItems.length > MAX_FILES_PER_POST) {
      return res.status(400).json({ message: `Chi duoc dang toi da ${MAX_FILES_PER_POST} tep moi bai.` });
    }

    const requestedPlatforms = normalizePlatformList(req.body?.platforms);
    if (!requestedPlatforms.length) {
      return res.status(400).json({ message: "Vui long chon it nhat mot nen tang." });
    }

    const { mode, scheduleAtIso } = resolveScheduleTime(req.body?.mode, req.body?.scheduleAt);
    const timezone = String(req.body?.timezone || env.ZERNIO_DEFAULT_TIMEZONE || "Asia/Bangkok").trim();
    const useAntiSpamJitter = req.body?.antiSpamJitter !== false;
    const enabledPlatforms = new Set((env.ZERNIO_ENABLED_PLATFORMS || []).map((item) => String(item).toLowerCase()));

    const targets = [];
    const skipped = [];
    for (const platform of requestedPlatforms) {
      if (!enabledPlatforms.has(platform)) {
        skipped.push(buildPlatformFailure(platform, "Nen tang nay dang bi tat trong he thong.", "platform_disabled"));
        continue;
      }

      const socialAccount = await dbService.getSocialAccountByOwnerPlatform(req.user.id, platform, "zernio");
      if (!socialAccount || socialAccount.status !== "connected" || !socialAccount.providerAccountId) {
        skipped.push(
          buildPlatformFailure(platform, "Ban can ket noi tai khoan nay truoc khi dang bai.", "account_missing")
        );
        continue;
      }
      targets.push({
        platform,
        accountId: socialAccount.providerAccountId,
        displayName: socialAccount.displayName || socialAccount.username || platform
      });
    }

    if (!targets.length) {
      return res.status(400).json({
        message: "Hay ket noi Facebook/Instagram cua khach hang truoc khi dang bai.",
        results: skipped
      });
    }

    const settled = await Promise.allSettled(
      targets.map((target, targetIndex) =>
        publishByPlatform({
          platform: target.platform,
          accountId: target.accountId,
          caption,
          mediaItems,
          mode,
          scheduleAt: applyScheduleJitter(scheduleAtIso, targetIndex, useAntiSpamJitter),
          timezone
        })
      )
    );

    const successResults = [];
    const failedResults = [...skipped];
    settled.forEach((result, index) => {
      const target = targets[index];
      if (result.status === "fulfilled") {
        successResults.push({ ...result.value, ok: true, accountId: target.accountId, accountName: target.displayName });
      } else {
        const reason = result.reason instanceof Error ? result.reason : new Error("Dang bai that bai.");
        failedResults.push(buildPlatformFailure(target.platform, reason.message, reason.code || ""));
      }
    });

    if (!successResults.length) {
      return res.status(502).json({
        message: "Khong dang duoc tren nen tang nao. Ban hay kiem tra ket noi va thu lai.",
        mode,
        results: failedResults,
        publishedCount: 0,
        failedCount: failedResults.length
      });
    }

    const status = failedResults.length ? "partial" : mode === "schedule" ? "scheduled" : "published";
    const message =
      status === "published"
        ? `Da dang thanh cong ${successResults.length} nen tang.`
        : status === "scheduled"
          ? `Da hen gio thanh cong ${successResults.length} nen tang.`
          : `Da xu ly ${successResults.length} nen tang, ${failedResults.length} nen tang gap loi.`;

    return res.json({
      status,
      mode,
      message,
      publishedCount: successResults.length,
      failedCount: failedResults.length,
      results: [...successResults, ...failedResults]
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong the dang bai tu dong luc nay.";
    return res.status(500).json({ message });
  }
});

export { router as integrationRouter };
