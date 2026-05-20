import express from "express";
import { env } from "../config/env.js";
import { getPlanLimit } from "../constants/plan.js";
import { cacheAuthUser, requireAuth } from "../middleware/auth.js";
import { createTokenBucketLimiter } from "../middleware/rate-limit.js";
import { dbService } from "../services/db.service.js";
import { generateFallbackSpaContent } from "../services/fallback-content.service.js";
import { generateSpaContent } from "../services/gemini.service.js";
import { getDateKey } from "../utils/date.js";
import { normalizeOptionalText, normalizeText } from "../utils/validation.js";

const router = express.Router();

const contentLimiter = createTokenBucketLimiter({
  keyPrefix: "content:generate",
  capacity: env.RATE_LIMIT_CONTENT_CAPACITY,
  refillPerSecond: env.RATE_LIMIT_CONTENT_REFILL_PER_SEC,
  blockDurationMs: env.RATE_LIMIT_CONTENT_BLOCK_MS,
  message: "Ban dang tao noi dung qua nhanh. Vui long doi mot chut roi thu lai."
});

function sanitizeGeneratePayload(rawBody) {
  const profile = rawBody?.profile ?? {};
  const input = rawBody?.input ?? {};

  const businessName = normalizeText(profile.businessName, { min: 2, max: 120 });
  const industry = normalizeText(profile.industry, { min: 2, max: 80 });
  const keyMessage = normalizeOptionalText(profile.keyMessage, { max: 200 });

  const channel = normalizeText(input.channel, { min: 2, max: 40 });
  const goal = normalizeText(input.goal, { min: 5, max: 220 });
  const audience = normalizeText(input.audience, { min: 5, max: 220 });
  const productOrService = normalizeText(input.productOrService, { min: 3, max: 220 });
  const tone = normalizeOptionalText(input.tone, { max: 40 });
  const language = normalizeOptionalText(input.language, { max: 20 });
  const specialNote = normalizeOptionalText(input.specialNote, { max: 300 });

  if (
    !businessName ||
    !industry ||
    keyMessage === null ||
    !channel ||
    !goal ||
    !audience ||
    !productOrService ||
    tone === null ||
    language === null ||
    specialNote === null
  ) {
    return null;
  }

  return {
    profile: {
      businessName,
      industry,
      keyMessage
    },
    input: {
      channel,
      goal,
      audience,
      productOrService,
      tone,
      language,
      specialNote
    }
  };
}

async function saveGenerationHistory({
  userId,
  payload,
  content,
  provider,
  model = "",
  isFallback = false,
  fallbackReason = ""
}) {
  try {
    await dbService.createContentGeneration({
      ownerUserId: userId,
      channel: payload?.input?.channel || "",
      goal: payload?.input?.goal || "",
      audience: payload?.input?.audience || "",
      productOrService: payload?.input?.productOrService || "",
      tone: payload?.input?.tone || "",
      language: payload?.input?.language || "",
      specialNote: payload?.input?.specialNote || "",
      headline: content?.headline || "",
      body: content?.body || "",
      cta: content?.cta || "",
      replyTemplate: content?.replyTemplate || "",
      hashtags: Array.isArray(content?.hashtags) ? content.hashtags : [],
      provider: provider || "ai",
      model: model || "",
      isFallback: Boolean(isFallback),
      fallbackReason: fallbackReason || ""
    });
    dbService.pruneContentGenerationsByOwner(userId, 120).catch((pruneError) => {
      console.error("[content] prune history failed", pruneError);
    });
  } catch (historyError) {
    console.error("[content] saveGenerationHistory failed", historyError);
  }
}

router.get("/history", requireAuth, async (req, res) => {
  try {
    const rawLimit = Number(req.query?.limit);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 20;
    const items = await dbService.listContentGenerationsByOwner(req.user.id, limit);
    return res.json({ items });
  } catch (error) {
    console.error("[content] history failed", error);
    return res.status(500).json({ message: "Khong the tai lich su noi dung." });
  }
});

router.get("/quota", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const today = getDateKey();
    const planLimit = getPlanLimit(user.plan);
    const currentCount = user.dailyUsageDateKey === today ? user.dailyContentCount : 0;

    return res.json({
      plan: user.plan,
      limit: planLimit.dailyContentGenerations,
      used: currentCount,
      remaining: Math.max(planLimit.dailyContentGenerations - currentCount, 0)
    });
  } catch (error) {
    console.error("[content] quota failed", error);
    return res.status(500).json({ message: "Khong the lay han muc AI." });
  }
});

router.post("/generate", requireAuth, contentLimiter, async (req, res) => {
  const userFromToken = req.user;
  const today = getDateKey();
  const planLimit = getPlanLimit(userFromToken.plan);
  let currentCount = userFromToken.dailyUsageDateKey === today ? userFromToken.dailyContentCount : 0;

  const sanitizedPayload = sanitizeGeneratePayload(req.body);
  if (!sanitizedPayload) {
    return res.status(400).json({ message: "Thieu hoac sai thong tin tao noi dung." });
  }

  try {
    if (currentCount >= planLimit.dailyContentGenerations) {
      return res.status(403).json({
        message: `Ban da dung het luot tao noi dung hom nay cho goi ${planLimit.label}.`,
        plan: userFromToken.plan
      });
    }

    let content = null;
    let meta = {
      provider: "fallback_template",
      model: "",
      fallback: true,
      reason: "provider_error",
      notice: "He thong AI dang ban. Da tao ban nhap de ban dung ngay.",
      providersTried: []
    };

    try {
      const generated = await generateSpaContent(sanitizedPayload);
      content = generated.content;
      meta = {
        provider: generated.provider || "ai",
        model: generated.model || "",
        fallback: false,
        reason: "",
        notice: "Da tao noi dung bang AI.",
        providersTried: []
      };
    } catch (aiError) {
      console.error("[content] generate failed", aiError);
      const reason = typeof aiError?.reason === "string" ? aiError.reason : "provider_error";
      const notice =
        typeof aiError?.notice === "string"
          ? aiError.notice
          : "He thong AI dang ban. Da tao ban nhap de ban dung ngay.";
      const providersTried = Array.isArray(aiError?.failures)
        ? aiError.failures
            .map((item) => String(item?.provider || "").trim())
            .filter(Boolean)
        : [];

      content = generateFallbackSpaContent(sanitizedPayload);
      meta = {
        provider: "fallback_template",
        model: "",
        fallback: true,
        reason,
        notice,
        providersTried
      };
    }

    currentCount += 1;
    const user = await dbService.updateUserById(userFromToken.id, {
      dailyUsageDateKey: today,
      dailyContentCount: currentCount
    });
    if (!user) {
      return res.status(404).json({ message: "Khong tim thay tai khoan." });
    }
    cacheAuthUser(user);

    await saveGenerationHistory({
      userId: user.id,
      payload: sanitizedPayload,
      content,
      provider: meta.provider || "ai",
      model: meta.model || "",
      isFallback: Boolean(meta.fallback),
      fallbackReason: meta.reason || ""
    });

    return res.status(200).json({
      content,
      quota: {
        used: user.dailyContentCount,
        limit: planLimit.dailyContentGenerations,
        remaining: Math.max(planLimit.dailyContentGenerations - user.dailyContentCount, 0)
      },
      meta
    });
  } catch (error) {
    console.error("[content] finalize generate failed", error);
    const message = error instanceof Error ? error.message : "Khong the tao noi dung.";
    return res.status(500).json({ message });
  }
});

export { router as contentRouter };
